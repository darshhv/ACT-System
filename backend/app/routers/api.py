from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from uuid import UUID

from app.core.database import get_db
from app.models.models import (
    Asset, AssetKit, Worker, AssetCategory, CustodyRecord,
    CalibrationRecord, Alert, AlertRule, AuditLog,
    AssetState, AlertStatus, AlertSeverity, CalibrationStatus
)
from app.schemas.schemas import (
    AssetOut, AssetCreate, AssetUpdate, AssetSummary,
    KitOut, WorkerOut, WorkerCreate, WorkerUpdate,
    CustodyRecordOut, CheckoutRequest, ReturnRequest, OverrideCheckoutRequest,
    ActiveCustodyOut, AlertOut, AlertAcknowledge, AlertResolve,
    CalibrationUpdate, CalibrationRecordOut, CategoryOut, DashboardSummary, ScanEvent
)
from app.services import custody_service
from app.services.rules_engine import run_overdue_check, run_calibration_check

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard/summary", response_model=DashboardSummary, tags=["Dashboard"])
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Live summary counts for the dashboard header."""

    def count_state(state):
        return db.query(func.count(Asset.id)).filter(Asset.state == state, Asset.is_active == True).scalar()

    total_assets = db.query(func.count(Asset.id)).filter(Asset.is_active == True).scalar()
    total_kits = db.query(func.count(AssetKit.id)).scalar()
    kits_in_custody = db.query(func.count(AssetKit.id)).filter(
        AssetKit.state.in_([AssetState.IN_CUSTODY, AssetState.OVERRIDE_CUSTODY, AssetState.OVERDUE])
    ).scalar()
    open_alerts = db.query(func.count(Alert.id)).filter(Alert.status == AlertStatus.OPEN).scalar()
    critical_alerts = db.query(func.count(Alert.id)).filter(
        Alert.status == AlertStatus.OPEN,
        Alert.severity == AlertSeverity.CRITICAL
    ).scalar()
    cal_overdue = db.query(func.count(Asset.id)).filter(
        Asset.calibration_status == CalibrationStatus.OVERDUE,
        Asset.is_active == True
    ).scalar()
    cal_due_soon = db.query(func.count(Asset.id)).filter(
        Asset.calibration_status == CalibrationStatus.DUE_SOON,
        Asset.is_active == True
    ).scalar()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    active_today = db.query(func.count(func.distinct(CustodyRecord.worker_id))).filter(
        CustodyRecord.checked_out_at >= today_start
    ).scalar()

    return DashboardSummary(
        total_assets=total_assets,
        available=count_state(AssetState.AVAILABLE),
        in_custody=count_state(AssetState.IN_CUSTODY) + count_state(AssetState.OVERRIDE_CUSTODY),
        overdue=count_state(AssetState.OVERDUE),
        suspended=count_state(AssetState.SUSPENDED),
        withdrawn=count_state(AssetState.WITHDRAWN),
        total_kits=total_kits,
        kits_in_custody=kits_in_custody,
        open_alerts=open_alerts,
        critical_alerts=critical_alerts,
        calibration_overdue=cal_overdue,
        calibration_due_soon=cal_due_soon,
        active_workers_today=active_today,
    )


@router.get("/dashboard/active-custody", tags=["Dashboard"])
def get_active_custody(db: Session = Depends(get_db)):
    """All currently checked-out items."""
    records = db.query(CustodyRecord).options(
        joinedload(CustodyRecord.worker),
        joinedload(CustodyRecord.asset),
        joinedload(CustodyRecord.kit),
    ).filter(CustodyRecord.returned_at == None).order_by(CustodyRecord.checked_out_at.desc()).all()

    now = datetime.now(timezone.utc)
    result = []
    for r in records:
        checked_out = r.checked_out_at
        if checked_out.tzinfo is None:
            checked_out = checked_out.replace(tzinfo=timezone.utc)
        hours_elapsed = round((now - checked_out).total_seconds() / 3600, 2)

        item = r.asset or r.kit
        item_name = item.name if item else "Unknown"
        item_code = getattr(item, 'asset_code', getattr(item, 'kit_code', '?')) if item else '?'

        result.append({
            "id": str(r.id),
            "worker_name": r.worker.full_name if r.worker else "Unknown",
            "worker_employee_id": r.worker.employee_id if r.worker else "?",
            "asset_name": item_name,
            "asset_code": item_code,
            "is_kit": r.kit_id is not None,
            "checked_out_at": r.checked_out_at,
            "expected_return_at": r.expected_return_at,
            "is_overdue": r.is_overdue,
            "overdue_hours": float(r.overdue_hours) if r.overdue_hours else None,
            "hours_elapsed": hours_elapsed,
        })
    return result


# ══════════════════════════════════════════════════════════════════════════════
# CUSTODY — SCAN ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/custody/checkout", tags=["Custody"])
def checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    """Check out a tool or kit. Scan worker QR + asset QR."""
    record = custody_service.checkout(
        db, req.worker_qr, req.asset_qr, req.edge_node_id or "EDGE-001", req.notes
    )
    item = record.asset or record.kit
    return {
        "success": True,
        "message": f"Checked out successfully",
        "record_id": str(record.id),
        "asset": getattr(item, 'asset_code', getattr(item, 'kit_code', '?')) if item else '?',
        "expected_return_at": record.expected_return_at,
    }


@router.post("/custody/return", tags=["Custody"])
def return_item(req: ReturnRequest, db: Session = Depends(get_db)):
    """Return a tool or kit."""
    record = custody_service.return_item(
        db, req.worker_qr, req.asset_qr, req.edge_node_id or "EDGE-001", req.notes
    )
    return {
        "success": True,
        "message": "Returned successfully",
        "record_id": str(record.id),
        "overdue_hours": float(record.overdue_hours) if record.overdue_hours else None,
    }


@router.post("/custody/override", tags=["Custody"])
def override_checkout(req: OverrideCheckoutRequest, db: Session = Depends(get_db)):
    """Override checkout for suspended asset (requires supervisor scan)."""
    record = custody_service.override_checkout(
        db, req.worker_qr, req.asset_qr, req.supervisor_qr, req.reason, req.edge_node_id or "EDGE-001"
    )
    return {"success": True, "message": "Override checkout recorded", "record_id": str(record.id)}


@router.post("/custody/scan", tags=["Custody"])
def scan_event(event: ScanEvent, db: Session = Depends(get_db)):
    """Universal scan endpoint — auto-detects checkout vs return based on asset state."""
    item, is_kit = custody_service.resolve_asset_or_kit(db, event.asset_qr)

    if event.event_type.upper() == "RETURN" or item.state in (
        AssetState.IN_CUSTODY, AssetState.OVERRIDE_CUSTODY, AssetState.OVERDUE
    ):
        record = custody_service.return_item(db, event.worker_qr, event.asset_qr, event.edge_node_id, event.notes)
        return {"action": "RETURN", "record_id": str(record.id)}
    else:
        record = custody_service.checkout(db, event.worker_qr, event.asset_qr, event.edge_node_id, event.notes)
        return {"action": "CHECKOUT", "record_id": str(record.id)}


@router.get("/custody/history", tags=["Custody"])
def get_custody_history(
    asset_id: Optional[UUID] = None,
    worker_id: Optional[UUID] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """Full custody history with optional filters."""
    q = db.query(CustodyRecord).options(
        joinedload(CustodyRecord.worker),
        joinedload(CustodyRecord.asset),
        joinedload(CustodyRecord.kit),
    )
    if asset_id:
        q = q.filter(CustodyRecord.asset_id == asset_id)
    if worker_id:
        q = q.filter(CustodyRecord.worker_id == worker_id)
    records = q.order_by(CustodyRecord.checked_out_at.desc()).limit(limit).all()

    result = []
    for r in records:
        item = r.asset or r.kit
        result.append({
            "id": str(r.id),
            "event_type": r.event_type,
            "worker": r.worker.full_name if r.worker else None,
            "asset": getattr(item, 'asset_code', getattr(item, 'kit_code', None)) if item else None,
            "asset_name": item.name if item else None,
            "checked_out_at": r.checked_out_at,
            "returned_at": r.returned_at,
            "is_overdue": r.is_overdue,
            "overdue_hours": float(r.overdue_hours) if r.overdue_hours else None,
        })
    return result


# ══════════════════════════════════════════════════════════════════════════════
# ASSETS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/assets", tags=["Assets"])
def list_assets(
    state: Optional[str] = None,
    category_code: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    q = db.query(Asset).options(joinedload(Asset.category)).filter(Asset.is_active == True)
    if state:
        q = q.filter(Asset.state == state)
    if category_code:
        cat = db.query(AssetCategory).filter(AssetCategory.code == category_code).first()
        if cat:
            q = q.filter(Asset.category_id == cat.id)
    if search:
        q = q.filter(or_(
            Asset.name.ilike(f"%{search}%"),
            Asset.asset_code.ilike(f"%{search}%"),
            Asset.serial_number.ilike(f"%{search}%"),
        ))
    total = q.count()
    assets = q.order_by(Asset.asset_code).offset(offset).limit(limit).all()
    return {"total": total, "items": [AssetOut.model_validate(a) for a in assets]}


@router.get("/assets/{asset_id}", response_model=AssetOut, tags=["Assets"])
def get_asset(asset_id: UUID, db: Session = Depends(get_db)):
    asset = db.query(Asset).options(joinedload(Asset.category)).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.get("/assets/qr/{qr_code}", tags=["Assets"])
def get_asset_by_qr(qr_code: str, db: Session = Depends(get_db)):
    """Look up asset or kit by QR code — used by scanner."""
    asset = db.query(Asset).options(joinedload(Asset.category)).filter(Asset.qr_code == qr_code).first()
    if asset:
        return {"type": "asset", "data": AssetOut.model_validate(asset)}
    kit = db.query(AssetKit).filter(AssetKit.qr_code == qr_code).first()
    if kit:
        return {"type": "kit", "data": KitOut.model_validate(kit)}
    raise HTTPException(status_code=404, detail="QR code not found")


@router.post("/assets", response_model=AssetOut, tags=["Assets"])
def create_asset(asset: AssetCreate, db: Session = Depends(get_db)):
    db_asset = Asset(**asset.model_dump())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset


@router.patch("/assets/{asset_id}", response_model=AssetOut, tags=["Assets"])
def update_asset(asset_id: UUID, update: AssetUpdate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    for k, v in update.model_dump(exclude_none=True).items():
        setattr(asset, k, v)
    asset.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(asset)
    return asset


# ══════════════════════════════════════════════════════════════════════════════
# KITS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/kits", tags=["Kits"])
def list_kits(db: Session = Depends(get_db)):
    kits = db.query(AssetKit).options(joinedload(AssetKit.category)).all()
    return [KitOut.model_validate(k) for k in kits]


@router.get("/kits/{kit_id}", response_model=KitOut, tags=["Kits"])
def get_kit(kit_id: UUID, db: Session = Depends(get_db)):
    kit = db.query(AssetKit).options(joinedload(AssetKit.category)).filter(AssetKit.id == kit_id).first()
    if not kit:
        raise HTTPException(status_code=404, detail="Kit not found")
    return kit


# ══════════════════════════════════════════════════════════════════════════════
# WORKERS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/workers", response_model=List[WorkerOut], tags=["Workers"])
def list_workers(active_only: bool = True, db: Session = Depends(get_db)):
    q = db.query(Worker)
    if active_only:
        q = q.filter(Worker.is_active == True)
    return q.order_by(Worker.full_name).all()


@router.get("/workers/{worker_id}", response_model=WorkerOut, tags=["Workers"])
def get_worker(worker_id: UUID, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return worker


@router.get("/workers/qr/{qr_code}", response_model=WorkerOut, tags=["Workers"])
def get_worker_by_qr(qr_code: str, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.qr_code == qr_code, Worker.is_active == True).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker QR not found")
    return worker


@router.post("/workers", response_model=WorkerOut, tags=["Workers"])
def create_worker(worker: WorkerCreate, db: Session = Depends(get_db)):
    db_worker = Worker(**worker.model_dump())
    db.add(db_worker)
    db.commit()
    db.refresh(db_worker)
    return db_worker


@router.patch("/workers/{worker_id}", response_model=WorkerOut, tags=["Workers"])
def update_worker(worker_id: UUID, update: WorkerUpdate, db: Session = Depends(get_db)):
    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    for k, v in update.model_dump(exclude_none=True).items():
        setattr(worker, k, v)
    worker.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(worker)
    return worker


# ══════════════════════════════════════════════════════════════════════════════
# ALERTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/alerts", tags=["Alerts"])
def list_alerts(
    status: Optional[str] = "OPEN",
    severity: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    q = db.query(Alert)
    if status:
        q = q.filter(Alert.status == status)
    if severity:
        q = q.filter(Alert.severity == severity)
    alerts = q.order_by(Alert.created_at.desc()).limit(limit).all()
    return [AlertOut.model_validate(a) for a in alerts]


@router.post("/alerts/{alert_id}/acknowledge", tags=["Alerts"])
def acknowledge_alert(alert_id: UUID, body: AlertAcknowledge, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_by = body.worker_id
    alert.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True}


@router.post("/alerts/{alert_id}/resolve", tags=["Alerts"])
def resolve_alert(alert_id: UUID, body: AlertResolve, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = AlertStatus.RESOLVED
    alert.resolved_by = body.worker_id
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolution_note = body.resolution_note
    db.commit()
    return {"success": True}


# ══════════════════════════════════════════════════════════════════════════════
# CALIBRATION
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/assets/{asset_id}/calibration", tags=["Calibration"])
def get_calibration_history(asset_id: UUID, db: Session = Depends(get_db)):
    records = db.query(CalibrationRecord).filter(
        CalibrationRecord.asset_id == asset_id
    ).order_by(CalibrationRecord.calibrated_at.desc()).all()
    return [CalibrationRecordOut.model_validate(r) for r in records]


@router.post("/assets/{asset_id}/calibration", tags=["Calibration"])
def update_calibration(asset_id: UUID, data: CalibrationUpdate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    record = CalibrationRecord(
        asset_id=asset_id,
        calibrated_at=data.calibrated_at,
        calibrated_by=data.calibrated_by,
        certificate_number=data.certificate_number,
        valid_until=data.valid_until,
        result=data.result,
        notes=data.notes,
        recorded_by=data.recorded_by,
    )
    db.add(record)

    # Update asset
    now = datetime.now(timezone.utc)
    asset.last_calibrated_at = data.calibrated_at
    asset.calibration_due_at = data.valid_until
    asset.calibration_certificate = data.certificate_number

    if data.valid_until.replace(tzinfo=timezone.utc) > now:
        asset.calibration_status = CalibrationStatus.VALID
        if asset.state == AssetState.SUSPENDED:
            asset.state = AssetState.AVAILABLE
    else:
        asset.calibration_status = CalibrationStatus.OVERDUE

    asset.updated_at = now

    # Resolve any open calibration alerts for this asset
    db.query(Alert).filter(
        Alert.asset_id == asset_id,
        Alert.alert_type.in_(["CALIBRATION_EXPIRED", "CALIBRATION_DUE_SOON"]),
        Alert.status == AlertStatus.OPEN,
    ).update({"status": AlertStatus.RESOLVED, "resolved_at": now})

    db.commit()
    db.refresh(record)
    return CalibrationRecordOut.model_validate(record)


@router.get("/calibration/due", tags=["Calibration"])
def get_calibration_due(days: int = 30, db: Session = Depends(get_db)):
    """Assets with calibration due within N days."""
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=days)
    assets = db.query(Asset).filter(
        Asset.is_active == True,
        Asset.calibration_due_at != None,
        Asset.calibration_due_at <= cutoff,
    ).order_by(Asset.calibration_due_at).all()
    return [AssetOut.model_validate(a) for a in assets]


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORIES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/categories", response_model=List[CategoryOut], tags=["Categories"])
def list_categories(db: Session = Depends(get_db)):
    return db.query(AssetCategory).order_by(AssetCategory.code).all()


# ══════════════════════════════════════════════════════════════════════════════
# RULES ENGINE — manual trigger endpoints
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/rules/run-overdue-check", tags=["Rules Engine"])
def trigger_overdue_check(db: Session = Depends(get_db)):
    """Manually trigger overdue detection. Runs automatically every 5 minutes."""
    return run_overdue_check(db)


@router.post("/rules/run-calibration-check", tags=["Rules Engine"])
def trigger_calibration_check(db: Session = Depends(get_db)):
    """Manually trigger calibration status check."""
    return run_calibration_check(db)


# ══════════════════════════════════════════════════════════════════════════════
# AUDIT LOG
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/audit", tags=["Audit"])
def get_audit_log(
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(AuditLog.entity_id == entity_id)
    logs = q.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [{
        "id": l.id,
        "entity_type": l.entity_type,
        "entity_id": str(l.entity_id),
        "event_type": l.event_type,
        "old_state": l.old_state,
        "new_state": l.new_state,
        "created_at": l.created_at,
    } for l in logs]
