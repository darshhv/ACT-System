import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, Numeric, Text, DateTime,
    ForeignKey, BigInteger, ARRAY, JSON, CheckConstraint, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


# ── Enums ─────────────────────────────────────────────────────────────────────

class AssetState(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    IN_CUSTODY = "IN_CUSTODY"
    OVERDUE = "OVERDUE"
    SUSPENDED = "SUSPENDED"
    OVERRIDE_CUSTODY = "OVERRIDE_CUSTODY"
    WITHDRAWN = "WITHDRAWN"

class CalibrationStatus(str, enum.Enum):
    VALID = "VALID"
    DUE_SOON = "DUE_SOON"
    OVERDUE = "OVERDUE"
    NOT_REQUIRED = "NOT_REQUIRED"
    UNKNOWN = "UNKNOWN"

class CustodyEventType(str, enum.Enum):
    CHECKOUT = "CHECKOUT"
    RETURN = "RETURN"
    OVERRIDE_CHECKOUT = "OVERRIDE_CHECKOUT"
    TRANSFER = "TRANSFER"
    SUSPEND = "SUSPEND"
    REINSTATE = "REINSTATE"
    WITHDRAW = "WITHDRAW"
    CALIBRATION_DUE = "CALIBRATION_DUE"
    CALIBRATION_UPDATED = "CALIBRATION_UPDATED"
    OVERDUE_FLAGGED = "OVERDUE_FLAGGED"
    ALERT_SENT = "ALERT_SENT"

class AlertType(str, enum.Enum):
    OVERDUE_RETURN = "OVERDUE_RETURN"
    CALIBRATION_EXPIRED = "CALIBRATION_EXPIRED"
    CALIBRATION_DUE_SOON = "CALIBRATION_DUE_SOON"
    UNAUTHORIZED_MOVEMENT = "UNAUTHORIZED_MOVEMENT"
    CHECKOUT_ANOMALY = "CHECKOUT_ANOMALY"
    SYSTEM_SYNC_FAILURE = "SYSTEM_SYNC_FAILURE"

class AlertSeverity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class AlertStatus(str, enum.Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    SUPPRESSED = "SUPPRESSED"

class WorkerRole(str, enum.Enum):
    OPERATOR = "OPERATOR"
    TECHNICIAN = "TECHNICIAN"
    SUPERVISOR = "SUPERVISOR"
    ADMIN = "ADMIN"
    TOOLROOM_INCHARGE = "TOOLROOM_INCHARGE"

class TrackingLevel(str, enum.Enum):
    INDIVIDUAL = "INDIVIDUAL"
    KIT = "KIT"


# ── Models ────────────────────────────────────────────────────────────────────

class EdgeNode(Base):
    __tablename__ = "edge_nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    node_id = Column(String(50), unique=True, nullable=False)
    location = Column(String(200))
    description = Column(Text)
    last_sync_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())


class Worker(Base):
    __tablename__ = "workers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id = Column(String(50), unique=True, nullable=False)
    qr_code = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(SAEnum(WorkerRole, name="worker_role"), nullable=False, default=WorkerRole.OPERATOR)
    department = Column(String(100))
    phone = Column(String(20))
    email = Column(String(200))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    custody_records = relationship("CustodyRecord", foreign_keys="CustodyRecord.worker_id", back_populates="worker")


class AssetCategory(Base):
    __tablename__ = "asset_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("asset_categories.id"))
    requires_calibration = Column(Boolean, nullable=False, default=False)
    default_checkout_hours = Column(Integer, nullable=False, default=8)
    calibration_interval_days = Column(Integer)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    parent = relationship("AssetCategory", remote_side="AssetCategory.id")
    assets = relationship("Asset", back_populates="category")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_code = Column(String(50), unique=True, nullable=False)
    qr_code = Column(String(100), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    category_id = Column(UUID(as_uuid=True), ForeignKey("asset_categories.id"), nullable=False)
    tracking_level = Column(SAEnum(TrackingLevel, name="tracking_level"), nullable=False, default=TrackingLevel.INDIVIDUAL)
    kit_id = Column(UUID(as_uuid=True), ForeignKey("asset_kits.id"))
    manufacturer = Column(String(100))
    model_number = Column(String(100))
    serial_number = Column(String(100))
    purchase_date = Column(DateTime(timezone=True))
    purchase_cost = Column(Numeric(10, 2))
    location_default = Column(String(200))
    state = Column(SAEnum(AssetState, name="asset_state"), nullable=False, default=AssetState.AVAILABLE)
    calibration_status = Column(SAEnum(CalibrationStatus, name="calibration_status"), nullable=False, default=CalibrationStatus.NOT_REQUIRED)
    last_calibrated_at = Column(DateTime(timezone=True))
    calibration_due_at = Column(DateTime(timezone=True))
    calibration_certificate = Column(String(200))
    max_checkout_hours = Column(Integer, nullable=False, default=8)
    notes = Column(Text)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("AssetCategory", back_populates="assets")
    custody_records = relationship("CustodyRecord", foreign_keys="CustodyRecord.asset_id", back_populates="asset")
    calibration_records = relationship("CalibrationRecord", back_populates="asset")
    alerts = relationship("Alert", foreign_keys="Alert.asset_id", back_populates="asset")


class AssetKit(Base):
    __tablename__ = "asset_kits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kit_code = Column(String(50), unique=True, nullable=False)
    qr_code = Column(String(100), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    category_id = Column(UUID(as_uuid=True), ForeignKey("asset_categories.id"), nullable=False)
    expected_count = Column(Integer, nullable=False, default=1)
    state = Column(SAEnum(AssetState, name="asset_state"), nullable=False, default=AssetState.AVAILABLE)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("AssetCategory")
    custody_records = relationship("CustodyRecord", foreign_keys="CustodyRecord.kit_id", back_populates="kit")


class KitMember(Base):
    __tablename__ = "kit_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kit_id = Column(UUID(as_uuid=True), ForeignKey("asset_kits.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())


class CustodyRecord(Base):
    __tablename__ = "custody_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"))
    kit_id = Column(UUID(as_uuid=True), ForeignKey("asset_kits.id"))
    worker_id = Column(UUID(as_uuid=True), ForeignKey("workers.id"), nullable=False)
    edge_node_id = Column(UUID(as_uuid=True), ForeignKey("edge_nodes.id"))
    event_type = Column(SAEnum(CustodyEventType, name="custody_event_type"), nullable=False)
    checked_out_at = Column(DateTime(timezone=True), server_default=func.now())
    expected_return_at = Column(DateTime(timezone=True))
    returned_at = Column(DateTime(timezone=True))
    is_overdue = Column(Boolean, nullable=False, default=False)
    overdue_flagged_at = Column(DateTime(timezone=True))
    overdue_hours = Column(Numeric(6, 2))
    is_override = Column(Boolean, nullable=False, default=False)
    override_by = Column(UUID(as_uuid=True), ForeignKey("workers.id"))
    override_reason = Column(Text)
    notes = Column(Text)
    raw_scan_data = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    worker = relationship("Worker", foreign_keys=[worker_id], back_populates="custody_records")
    asset = relationship("Asset", foreign_keys=[asset_id], back_populates="custody_records")
    kit = relationship("AssetKit", foreign_keys=[kit_id], back_populates="custody_records")
    edge_node = relationship("EdgeNode")


class CalibrationRecord(Base):
    __tablename__ = "calibration_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    calibrated_at = Column(DateTime(timezone=True), nullable=False)
    calibrated_by = Column(String(200))
    certificate_number = Column(String(100))
    certificate_file = Column(String(500))
    valid_until = Column(DateTime(timezone=True), nullable=False)
    result = Column(String(50))
    notes = Column(Text)
    recorded_by = Column(UUID(as_uuid=True), ForeignKey("workers.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    asset = relationship("Asset", back_populates="calibration_records")


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    alert_type = Column(SAEnum(AlertType, name="alert_type"), nullable=False)
    severity = Column(SAEnum(AlertSeverity, name="alert_severity"), nullable=False, default=AlertSeverity.WARNING)
    is_active = Column(Boolean, nullable=False, default=True)
    conditions = Column(JSONB, nullable=False, default={})
    notify_email = Column(ARRAY(String))
    notify_roles = Column(ARRAY(SAEnum(WorkerRole, name="worker_role")))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("alert_rules.id"))
    alert_type = Column(SAEnum(AlertType, name="alert_type"), nullable=False)
    severity = Column(SAEnum(AlertSeverity, name="alert_severity"), nullable=False)
    status = Column(SAEnum(AlertStatus, name="alert_status"), nullable=False, default=AlertStatus.OPEN)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"))
    kit_id = Column(UUID(as_uuid=True), ForeignKey("asset_kits.id"))
    custody_record_id = Column(UUID(as_uuid=True), ForeignKey("custody_records.id"))
    worker_id = Column(UUID(as_uuid=True), ForeignKey("workers.id"))
    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)
    acknowledged_by = Column(UUID(as_uuid=True), ForeignKey("workers.id"))
    acknowledged_at = Column(DateTime(timezone=True))
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("workers.id"))
    resolved_at = Column(DateTime(timezone=True))
    resolution_note = Column(Text)
    notified_at = Column(DateTime(timezone=True))
    notification_channels = Column(ARRAY(String))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    asset = relationship("Asset", foreign_keys=[asset_id], back_populates="alerts")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    event_type = Column(String(100), nullable=False)
    old_state = Column(JSONB)
    new_state = Column(JSONB)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("workers.id"))
    edge_node_id = Column(UUID(as_uuid=True), ForeignKey("edge_nodes.id"))
    ip_address = Column(String(45))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
