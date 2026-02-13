from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.models import (
    Asset, AssetKit, Worker, CustodyRecord, EdgeNode, AuditLog,
    AssetState, CustodyEventType
)


def get_utc_now():
    return datetime.now(timezone.utc)


def resolve_worker(db: Session, qr_code: str) -> Worker:
    worker = db.query(Worker).filter(
        Worker.qr_code == qr_code,
        Worker.is_active == True
    ).first()
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker QR '{qr_code}' not found or inactive")
    return worker


def resolve_asset_or_kit(db: Session, qr_code: str):
    """Returns (asset_or_kit, is_kit)"""
    asset = db.query(Asset).filter(Asset.qr_code == qr_code, Asset.is_active == True).first()
    if asset:
        return asset, False
    kit = db.query(AssetKit).filter(AssetKit.qr_code == qr_code).first()
    if kit:
        return kit, True
    raise HTTPException(status_code=404, detail=f"Asset/Kit QR '{qr_code}' not found")


def resolve_edge_node(db: Session, node_id: str) -> Optional[EdgeNode]:
    return db.query(EdgeNode).filter(EdgeNode.node_id == node_id).first()


def checkout(db: Session, worker_qr: str, asset_qr: str, edge_node_id: str = "EDGE-001", notes: str = None):
    worker = resolve_worker(db, worker_qr)
    item, is_kit = resolve_asset_or_kit(db, asset_qr)
    edge = resolve_edge_node(db, edge_node_id)
    now = get_utc_now()

    # State check
    if item.state == AssetState.SUSPENDED:
        raise HTTPException(
            status_code=409,
            detail=f"{'Kit' if is_kit else 'Asset'} is SUSPENDED — calibration expired or withheld. Cannot issue."
        )
    if item.state == AssetState.WITHDRAWN:
        raise HTTPException(status_code=409, detail="Asset has been WITHDRAWN from service.")
    if item.state in (AssetState.IN_CUSTODY, AssetState.OVERRIDE_CUSTODY, AssetState.OVERDUE):
        raise HTTPException(
            status_code=409,
            detail=f"{'Kit' if is_kit else 'Asset'} is already IN CUSTODY. Return it first."
        )

    # Calculate expected return
    max_hours = item.max_checkout_hours if not is_kit else 8
    expected_return = datetime(
        now.year, now.month, now.day,
        now.hour, now.minute, now.second,
        tzinfo=now.tzinfo
    )
    from datetime import timedelta
    expected_return = now + timedelta(hours=max_hours)

    # Create custody record
    record = CustodyRecord(
        worker_id=worker.id,
        event_type=CustodyEventType.CHECKOUT,
        checked_out_at=now,
        expected_return_at=expected_return,
        edge_node_id=edge.id if edge else None,
        notes=notes,
    )
    if is_kit:
        record.kit_id = item.id
    else:
        record.asset_id = item.id

    # Update asset state
    item.state = AssetState.IN_CUSTODY
    item.updated_at = now

    db.add(record)

    # Audit log
    db.add(AuditLog(
        entity_type="kit" if is_kit else "asset",
        entity_id=item.id,
        event_type="CHECKOUT",
        old_state={"state": "AVAILABLE"},
        new_state={"state": "IN_CUSTODY", "worker_id": str(worker.id)},
        changed_by=worker.id,
        edge_node_id=edge.id if edge else None,
    ))

    db.commit()
    db.refresh(record)
    return record


def return_item(db: Session, worker_qr: str, asset_qr: str, edge_node_id: str = "EDGE-001", notes: str = None):
    worker = resolve_worker(db, worker_qr)
    item, is_kit = resolve_asset_or_kit(db, asset_qr)
    edge = resolve_edge_node(db, edge_node_id)
    now = get_utc_now()

    if item.state == AssetState.AVAILABLE:
        raise HTTPException(status_code=409, detail="Asset is already AVAILABLE — not checked out.")
    if item.state == AssetState.WITHDRAWN:
        raise HTTPException(status_code=409, detail="Asset is WITHDRAWN from service.")

    # Find open custody record
    query = db.query(CustodyRecord).filter(CustodyRecord.returned_at == None)
    if is_kit:
        query = query.filter(CustodyRecord.kit_id == item.id)
    else:
        query = query.filter(CustodyRecord.asset_id == item.id)

    record = query.order_by(CustodyRecord.checked_out_at.desc()).first()

    if not record:
        raise HTTPException(status_code=404, detail="No open custody record found for this asset.")

    # Calculate overdue hours
    overdue_hours = None
    if record.expected_return_at and now > record.expected_return_at.replace(tzinfo=timezone.utc):
        delta = now - record.expected_return_at.replace(tzinfo=timezone.utc)
        overdue_hours = round(delta.total_seconds() / 3600, 2)

    record.returned_at = now
    record.notes = notes or record.notes
    if overdue_hours:
        record.overdue_hours = overdue_hours

    # Restore state — check calibration
    from app.models.models import CalibrationStatus
    if item.state != AssetState.SUSPENDED:
        if not is_kit and hasattr(item, 'calibration_status'):
            if item.calibration_status == CalibrationStatus.OVERDUE:
                item.state = AssetState.SUSPENDED
            else:
                item.state = AssetState.AVAILABLE
        else:
            item.state = AssetState.AVAILABLE
    item.updated_at = now

    db.add(AuditLog(
        entity_type="kit" if is_kit else "asset",
        entity_id=item.id,
        event_type="RETURN",
        old_state={"state": "IN_CUSTODY"},
        new_state={"state": item.state.value, "overdue_hours": overdue_hours},
        changed_by=worker.id,
        edge_node_id=edge.id if edge else None,
    ))

    db.commit()
    db.refresh(record)
    return record


def override_checkout(db: Session, worker_qr: str, asset_qr: str, supervisor_qr: str, reason: str, edge_node_id: str = "EDGE-001"):
    worker = resolve_worker(db, worker_qr)
    supervisor = resolve_worker(db, supervisor_qr)
    item, is_kit = resolve_asset_or_kit(db, asset_qr)
    edge = resolve_edge_node(db, edge_node_id)
    now = get_utc_now()

    # Only supervisors/admins/toolroom incharge can override
    from app.models.models import WorkerRole
    allowed = {WorkerRole.SUPERVISOR, WorkerRole.ADMIN, WorkerRole.TOOLROOM_INCHARGE}
    if supervisor.role not in allowed:
        raise HTTPException(status_code=403, detail="Supervisor QR does not have override authority.")

    if item.state == AssetState.WITHDRAWN:
        raise HTTPException(status_code=409, detail="Asset is WITHDRAWN — cannot override.")

    from datetime import timedelta
    max_hours = getattr(item, 'max_checkout_hours', 8)
    expected_return = now + timedelta(hours=max_hours)

    record = CustodyRecord(
        worker_id=worker.id,
        event_type=CustodyEventType.OVERRIDE_CHECKOUT,
        checked_out_at=now,
        expected_return_at=expected_return,
        edge_node_id=edge.id if edge else None,
        is_override=True,
        override_by=supervisor.id,
        override_reason=reason,
    )
    if is_kit:
        record.kit_id = item.id
    else:
        record.asset_id = item.id

    item.state = AssetState.OVERRIDE_CUSTODY
    item.updated_at = now

    db.add(record)
    db.add(AuditLog(
        entity_type="kit" if is_kit else "asset",
        entity_id=item.id,
        event_type="OVERRIDE_CHECKOUT",
        old_state={"state": item.state.value},
        new_state={"state": "OVERRIDE_CUSTODY", "supervisor": str(supervisor.id), "reason": reason},
        changed_by=supervisor.id,
        edge_node_id=edge.id if edge else None,
    ))

    db.commit()
    db.refresh(record)
    return record
