from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.models import (
    Asset, AssetKit, CustodyRecord, Alert, AlertRule,
    AssetState, CalibrationStatus, AlertType, AlertSeverity, AlertStatus
)


def get_utc_now():
    return datetime.now(timezone.utc)


def run_overdue_check(db: Session):
    """Flag assets/kits overdue for return and create alerts."""
    now = get_utc_now()
    created_count = 0

    open_records = db.query(CustodyRecord).filter(
        CustodyRecord.returned_at == None,
        CustodyRecord.expected_return_at != None,
    ).all()

    for record in open_records:
        expected = record.expected_return_at
        if expected.tzinfo is None:
            expected = expected.replace(tzinfo=timezone.utc)

        if now <= expected:
            continue  # Not yet overdue

        overdue_delta = now - expected
        overdue_hours = round(overdue_delta.total_seconds() / 3600, 2)

        # Update record
        if not record.is_overdue:
            record.is_overdue = True
            record.overdue_flagged_at = now
        record.overdue_hours = overdue_hours

        # Update asset state
        item = None
        if record.asset_id:
            item = db.query(Asset).filter(Asset.id == record.asset_id).first()
        elif record.kit_id:
            item = db.query(AssetKit).filter(AssetKit.id == record.kit_id).first()

        if item and item.state == AssetState.IN_CUSTODY:
            item.state = AssetState.OVERDUE
            item.updated_at = now

        # Create alert if not already open
        existing_alert = db.query(Alert).filter(
            Alert.alert_type == AlertType.OVERDUE_RETURN,
            Alert.status == AlertStatus.OPEN,
            Alert.custody_record_id == record.id,
        ).first()

        if not existing_alert and item:
            severity = AlertSeverity.CRITICAL if overdue_hours >= 8 else AlertSeverity.WARNING
            alert = Alert(
                alert_type=AlertType.OVERDUE_RETURN,
                severity=severity,
                status=AlertStatus.OPEN,
                custody_record_id=record.id,
                worker_id=record.worker_id,
                title=f"{'CRITICAL' if severity == AlertSeverity.CRITICAL else 'WARNING'}: {item.name if hasattr(item, 'name') else 'Asset'} overdue by {overdue_hours:.1f}h",
                message=(
                    f"Asset '{getattr(item, 'asset_code', getattr(item, 'kit_code', ''))}' "
                    f"was expected back {overdue_hours:.1f} hours ago. "
                    f"Worker ID: {record.worker_id}. Please follow up immediately."
                ),
            )
            if record.asset_id:
                alert.asset_id = record.asset_id
            else:
                alert.kit_id = record.kit_id
            db.add(alert)
            created_count += 1

    db.commit()
    return {"overdue_records_processed": len(open_records), "alerts_created": created_count}


def run_calibration_check(db: Session):
    """Check calibration status of all assets and update flags."""
    now = get_utc_now()
    updated_count = 0
    suspended_count = 0
    alert_count = 0

    assets = db.query(Asset).filter(
        Asset.is_active == True,
        Asset.calibration_due_at != None,
    ).all()

    for asset in assets:
        due = asset.calibration_due_at
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)

        old_status = asset.calibration_status

        if now > due:
            # Expired
            asset.calibration_status = CalibrationStatus.OVERDUE
            if asset.state == AssetState.AVAILABLE:
                asset.state = AssetState.SUSPENDED
                suspended_count += 1

            # Create alert if not exists
            existing = db.query(Alert).filter(
                Alert.alert_type == AlertType.CALIBRATION_EXPIRED,
                Alert.status == AlertStatus.OPEN,
                Alert.asset_id == asset.id,
            ).first()
            if not existing:
                db.add(Alert(
                    alert_type=AlertType.CALIBRATION_EXPIRED,
                    severity=AlertSeverity.CRITICAL,
                    status=AlertStatus.OPEN,
                    asset_id=asset.id,
                    title=f"CRITICAL: {asset.name} calibration expired",
                    message=(
                        f"{asset.asset_code} ({asset.name}) calibration expired on "
                        f"{due.date()}. Asset SUSPENDED. Schedule recalibration immediately."
                    ),
                ))
                alert_count += 1

        elif now > due - timedelta(days=7):
            # Due within 7 days
            asset.calibration_status = CalibrationStatus.DUE_SOON
            existing = db.query(Alert).filter(
                Alert.alert_type == AlertType.CALIBRATION_DUE_SOON,
                Alert.status == AlertStatus.OPEN,
                Alert.asset_id == asset.id,
            ).first()
            if not existing:
                days_left = (due - now).days
                db.add(Alert(
                    alert_type=AlertType.CALIBRATION_DUE_SOON,
                    severity=AlertSeverity.WARNING,
                    status=AlertStatus.OPEN,
                    asset_id=asset.id,
                    title=f"WARNING: {asset.name} calibration due in {days_left} days",
                    message=(
                        f"{asset.asset_code} ({asset.name}) is due for calibration in {days_left} days "
                        f"(due {due.date()}). Schedule with NABL lab."
                    ),
                ))
                alert_count += 1

        elif now > due - timedelta(days=30):
            asset.calibration_status = CalibrationStatus.DUE_SOON
        else:
            asset.calibration_status = CalibrationStatus.VALID

        if asset.calibration_status != old_status:
            asset.updated_at = now
            updated_count += 1

    db.commit()
    return {
        "assets_checked": len(assets),
        "statuses_updated": updated_count,
        "assets_suspended": suspended_count,
        "alerts_created": alert_count,
    }
