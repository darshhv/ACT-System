from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.models.models import (
    AssetState, CalibrationStatus, WorkerRole,
    AlertType, AlertSeverity, AlertStatus, CustodyEventType, TrackingLevel
)


# ── Workers ───────────────────────────────────────────────────────────────────

class WorkerBase(BaseModel):
    employee_id: str
    qr_code: str
    full_name: str
    role: WorkerRole = WorkerRole.OPERATOR
    department: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class WorkerCreate(WorkerBase):
    pass

class WorkerUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[WorkerRole] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None

class WorkerOut(WorkerBase):
    id: UUID
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True


# ── Asset Categories ──────────────────────────────────────────────────────────

class CategoryOut(BaseModel):
    id: UUID
    code: str
    name: str
    parent_id: Optional[UUID] = None
    requires_calibration: bool
    default_checkout_hours: int
    calibration_interval_days: Optional[int] = None
    description: Optional[str] = None
    class Config:
        from_attributes = True


# ── Assets ────────────────────────────────────────────────────────────────────

class AssetBase(BaseModel):
    asset_code: str
    qr_code: str
    name: str
    description: Optional[str] = None
    category_id: UUID
    tracking_level: TrackingLevel = TrackingLevel.INDIVIDUAL
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    max_checkout_hours: int = 8
    notes: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    max_checkout_hours: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class AssetOut(AssetBase):
    id: UUID
    state: AssetState
    calibration_status: CalibrationStatus
    last_calibrated_at: Optional[datetime] = None
    calibration_due_at: Optional[datetime] = None
    calibration_certificate: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryOut] = None
    class Config:
        from_attributes = True

class AssetSummary(BaseModel):
    id: UUID
    asset_code: str
    name: str
    state: AssetState
    calibration_status: CalibrationStatus
    calibration_due_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Kits ──────────────────────────────────────────────────────────────────────

class KitOut(BaseModel):
    id: UUID
    kit_code: str
    qr_code: str
    name: str
    description: Optional[str] = None
    expected_count: int
    state: AssetState
    category: Optional[CategoryOut] = None
    created_at: datetime
    class Config:
        from_attributes = True


# ── Custody ───────────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    worker_qr: str            # QR code scanned from worker card
    asset_qr: str             # QR code scanned from tool/kit
    edge_node_id: Optional[str] = "EDGE-001"
    notes: Optional[str] = None

class ReturnRequest(BaseModel):
    worker_qr: str
    asset_qr: str
    edge_node_id: Optional[str] = "EDGE-001"
    notes: Optional[str] = None

class OverrideCheckoutRequest(BaseModel):
    worker_qr: str
    asset_qr: str
    supervisor_qr: str        # supervisor must also scan
    reason: str
    edge_node_id: Optional[str] = "EDGE-001"

class CustodyRecordOut(BaseModel):
    id: UUID
    event_type: CustodyEventType
    checked_out_at: datetime
    expected_return_at: Optional[datetime] = None
    returned_at: Optional[datetime] = None
    is_overdue: bool
    overdue_hours: Optional[float] = None
    is_override: bool
    notes: Optional[str] = None
    worker: Optional[WorkerOut] = None
    asset: Optional[AssetSummary] = None
    class Config:
        from_attributes = True

class ActiveCustodyOut(BaseModel):
    id: UUID
    worker_name: str
    worker_employee_id: str
    asset_name: str
    asset_code: str
    checked_out_at: datetime
    expected_return_at: Optional[datetime]
    is_overdue: bool
    overdue_hours: Optional[float]
    hours_elapsed: float


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: UUID
    alert_type: AlertType
    severity: AlertSeverity
    status: AlertStatus
    title: str
    message: str
    asset_id: Optional[UUID] = None
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class AlertAcknowledge(BaseModel):
    worker_id: UUID

class AlertResolve(BaseModel):
    worker_id: UUID
    resolution_note: Optional[str] = None


# ── Calibration ───────────────────────────────────────────────────────────────

class CalibrationUpdate(BaseModel):
    calibrated_at: datetime
    calibrated_by: str
    certificate_number: Optional[str] = None
    valid_until: datetime
    result: str = "PASS"
    notes: Optional[str] = None
    recorded_by: Optional[UUID] = None

class CalibrationRecordOut(BaseModel):
    id: UUID
    asset_id: UUID
    calibrated_at: datetime
    calibrated_by: Optional[str]
    certificate_number: Optional[str]
    valid_until: datetime
    result: Optional[str]
    notes: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_assets: int
    available: int
    in_custody: int
    overdue: int
    suspended: int
    withdrawn: int
    total_kits: int
    kits_in_custody: int
    open_alerts: int
    critical_alerts: int
    calibration_overdue: int
    calibration_due_soon: int
    active_workers_today: int


# ── Scan (edge endpoint) ──────────────────────────────────────────────────────

class ScanEvent(BaseModel):
    worker_qr: str
    asset_qr: str
    event_type: str = "CHECKOUT"   # CHECKOUT or RETURN
    edge_node_id: str = "EDGE-001"
    timestamp: Optional[datetime] = None
    notes: Optional[str] = None
