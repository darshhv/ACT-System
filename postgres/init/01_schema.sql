-- =============================================================================
-- ACT SYSTEM — DATABASE SCHEMA
-- MSME Asset Custody & Tracking System
-- IISc Bangalore
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE asset_state AS ENUM (
    'AVAILABLE',
    'IN_CUSTODY',
    'OVERDUE',
    'SUSPENDED',
    'OVERRIDE_CUSTODY',
    'WITHDRAWN'
);

CREATE TYPE calibration_status AS ENUM (
    'VALID',
    'DUE_SOON',
    'OVERDUE',
    'NOT_REQUIRED',
    'UNKNOWN'
);

CREATE TYPE custody_event_type AS ENUM (
    'CHECKOUT',
    'RETURN',
    'OVERRIDE_CHECKOUT',
    'TRANSFER',
    'SUSPEND',
    'REINSTATE',
    'WITHDRAW',
    'CALIBRATION_DUE',
    'CALIBRATION_UPDATED',
    'OVERDUE_FLAGGED',
    'ALERT_SENT'
);

CREATE TYPE alert_type AS ENUM (
    'OVERDUE_RETURN',
    'CALIBRATION_EXPIRED',
    'CALIBRATION_DUE_SOON',
    'UNAUTHORIZED_MOVEMENT',
    'CHECKOUT_ANOMALY',
    'SYSTEM_SYNC_FAILURE'
);

CREATE TYPE alert_severity AS ENUM (
    'INFO',
    'WARNING',
    'CRITICAL'
);

CREATE TYPE alert_status AS ENUM (
    'OPEN',
    'ACKNOWLEDGED',
    'RESOLVED',
    'SUPPRESSED'
);

CREATE TYPE worker_role AS ENUM (
    'OPERATOR',
    'TECHNICIAN',
    'SUPERVISOR',
    'ADMIN',
    'TOOLROOM_INCHARGE'
);

CREATE TYPE tracking_level AS ENUM (
    'INDIVIDUAL',   -- each tool tracked separately
    'KIT'           -- small tools tracked as a kit/drawer
);

-- =============================================================================
-- TABLE: edge_nodes
-- Registered edge scanning stations
-- =============================================================================
CREATE TABLE edge_nodes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id         VARCHAR(50) UNIQUE NOT NULL,   -- e.g. EDGE-001
    location        VARCHAR(200),
    description     TEXT,
    last_sync_at    TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: workers
-- Factory personnel who check out tools
-- =============================================================================
CREATE TABLE workers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     VARCHAR(50) UNIQUE NOT NULL,   -- maps to QR card
    qr_code         VARCHAR(100) UNIQUE NOT NULL,  -- printed on card
    full_name       VARCHAR(200) NOT NULL,
    role            worker_role NOT NULL DEFAULT 'OPERATOR',
    department      VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(200),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: asset_categories
-- Hierarchical tool classification
-- =============================================================================
CREATE TABLE asset_categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(20) UNIQUE NOT NULL,   -- e.g. MEAS, CUT, HAND
    name            VARCHAR(100) NOT NULL,
    parent_id       UUID REFERENCES asset_categories(id),
    requires_calibration    BOOLEAN NOT NULL DEFAULT FALSE,
    default_checkout_hours  INTEGER NOT NULL DEFAULT 8,   -- default max borrow time
    calibration_interval_days INTEGER,             -- NULL = not applicable
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: assets
-- Individual tracked tools/instruments
-- =============================================================================
CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_code      VARCHAR(50) UNIQUE NOT NULL,   -- e.g. ACT-MEAS-001
    qr_code         VARCHAR(100) UNIQUE NOT NULL,  -- on metal tag / engraving
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    category_id     UUID NOT NULL REFERENCES asset_categories(id),
    tracking_level  tracking_level NOT NULL DEFAULT 'INDIVIDUAL',
    kit_id          UUID,                          -- FK added after kit table created
    manufacturer    VARCHAR(100),
    model_number    VARCHAR(100),
    serial_number   VARCHAR(100),
    purchase_date   DATE,
    purchase_cost   NUMERIC(10,2),
    location_default VARCHAR(200),                 -- where it lives when available
    state           asset_state NOT NULL DEFAULT 'AVAILABLE',
    calibration_status  calibration_status NOT NULL DEFAULT 'NOT_REQUIRED',
    last_calibrated_at  TIMESTAMPTZ,
    calibration_due_at  TIMESTAMPTZ,
    calibration_certificate VARCHAR(200),
    max_checkout_hours  INTEGER NOT NULL DEFAULT 8,
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: asset_kits
-- Grouped small tools tracked together (e.g. drill bit set, tap set)
-- =============================================================================
CREATE TABLE asset_kits (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kit_code        VARCHAR(50) UNIQUE NOT NULL,   -- e.g. ACT-KIT-001
    qr_code         VARCHAR(100) UNIQUE NOT NULL,  -- single QR for whole kit
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    category_id     UUID NOT NULL REFERENCES asset_categories(id),
    expected_count  INTEGER NOT NULL DEFAULT 1,    -- how many pieces in full kit
    state           asset_state NOT NULL DEFAULT 'AVAILABLE',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from assets to kits
ALTER TABLE assets ADD CONSTRAINT fk_assets_kit
    FOREIGN KEY (kit_id) REFERENCES asset_kits(id);

-- =============================================================================
-- TABLE: kit_members
-- Which individual items belong to a kit
-- =============================================================================
CREATE TABLE kit_members (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kit_id      UUID NOT NULL REFERENCES asset_kits(id) ON DELETE CASCADE,
    asset_id    UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(kit_id, asset_id)
);

-- =============================================================================
-- TABLE: custody_records
-- Every checkout and return event — the core audit trail
-- =============================================================================
CREATE TABLE custody_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- What was checked out
    asset_id        UUID REFERENCES assets(id),
    kit_id          UUID REFERENCES asset_kits(id),
    -- Who checked it out
    worker_id       UUID NOT NULL REFERENCES workers(id),
    -- Scan metadata
    edge_node_id    UUID REFERENCES edge_nodes(id),
    event_type      custody_event_type NOT NULL,
    -- Timing
    checked_out_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_return_at  TIMESTAMPTZ,
    returned_at     TIMESTAMPTZ,
    -- Overdue tracking
    is_overdue      BOOLEAN NOT NULL DEFAULT FALSE,
    overdue_flagged_at  TIMESTAMPTZ,
    overdue_hours   NUMERIC(6,2),
    -- Override
    is_override     BOOLEAN NOT NULL DEFAULT FALSE,
    override_by     UUID REFERENCES workers(id),
    override_reason TEXT,
    -- Misc
    notes           TEXT,
    raw_scan_data   JSONB,                         -- raw QR scan payload from edge
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Constraint: must reference either asset or kit, not neither
    CONSTRAINT chk_asset_or_kit CHECK (
        (asset_id IS NOT NULL AND kit_id IS NULL) OR
        (asset_id IS NULL AND kit_id IS NOT NULL)
    )
);

-- =============================================================================
-- TABLE: calibration_records
-- Full calibration history per asset
-- =============================================================================
CREATE TABLE calibration_records (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id            UUID NOT NULL REFERENCES assets(id),
    calibrated_at       TIMESTAMPTZ NOT NULL,
    calibrated_by       VARCHAR(200),              -- external lab or person name
    certificate_number  VARCHAR(100),
    certificate_file    VARCHAR(500),              -- path or URL
    valid_until         TIMESTAMPTZ NOT NULL,
    result              VARCHAR(50),               -- PASS / FAIL / CONDITIONAL
    notes               TEXT,
    recorded_by         UUID REFERENCES workers(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: alert_rules
-- Configurable rules that trigger alerts
-- =============================================================================
CREATE TABLE alert_rules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    alert_type      alert_type NOT NULL,
    severity        alert_severity NOT NULL DEFAULT 'WARNING',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    -- Conditions stored as JSONB for flexibility
    -- e.g. {"overdue_threshold_hours": 2, "category_ids": ["..."]}
    conditions      JSONB NOT NULL DEFAULT '{}',
    -- Who to notify
    notify_email    TEXT[],
    notify_roles    worker_role[],
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: alerts
-- Generated alert instances
-- =============================================================================
CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id         UUID REFERENCES alert_rules(id),
    alert_type      alert_type NOT NULL,
    severity        alert_severity NOT NULL,
    status          alert_status NOT NULL DEFAULT 'OPEN',
    -- What triggered it
    asset_id        UUID REFERENCES assets(id),
    kit_id          UUID REFERENCES asset_kits(id),
    custody_record_id UUID REFERENCES custody_records(id),
    worker_id       UUID REFERENCES workers(id),   -- worker involved
    -- Content
    title           VARCHAR(300) NOT NULL,
    message         TEXT NOT NULL,
    -- Resolution
    acknowledged_by UUID REFERENCES workers(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by     UUID REFERENCES workers(id),
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT,
    -- Notification tracking
    notified_at     TIMESTAMPTZ,
    notification_channels   TEXT[],
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TABLE: audit_log
-- Immutable record of every state change in the system
-- =============================================================================
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,          -- 'asset', 'worker', 'custody', etc.
    entity_id       UUID NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    old_state       JSONB,
    new_state       JSONB,
    changed_by      UUID REFERENCES workers(id),
    edge_node_id    UUID REFERENCES edge_nodes(id),
    ip_address      VARCHAR(45),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Workers
CREATE INDEX idx_workers_employee_id ON workers(employee_id);
CREATE INDEX idx_workers_qr_code ON workers(qr_code);
CREATE INDEX idx_workers_active ON workers(is_active);

-- Assets
CREATE INDEX idx_assets_qr_code ON assets(qr_code);
CREATE INDEX idx_assets_asset_code ON assets(asset_code);
CREATE INDEX idx_assets_state ON assets(state);
CREATE INDEX idx_assets_category ON assets(category_id);
CREATE INDEX idx_assets_calibration_due ON assets(calibration_due_at) WHERE calibration_due_at IS NOT NULL;

-- Kits
CREATE INDEX idx_kits_qr_code ON asset_kits(qr_code);
CREATE INDEX idx_kits_state ON asset_kits(state);

-- Custody records
CREATE INDEX idx_custody_asset ON custody_records(asset_id);
CREATE INDEX idx_custody_kit ON custody_records(kit_id);
CREATE INDEX idx_custody_worker ON custody_records(worker_id);
CREATE INDEX idx_custody_checked_out_at ON custody_records(checked_out_at);
CREATE INDEX idx_custody_returned_at ON custody_records(returned_at);
CREATE INDEX idx_custody_overdue ON custody_records(is_overdue) WHERE is_overdue = TRUE;
CREATE INDEX idx_custody_open ON custody_records(returned_at) WHERE returned_at IS NULL;

-- Calibration
CREATE INDEX idx_calibration_asset ON calibration_records(asset_id);
CREATE INDEX idx_calibration_valid_until ON calibration_records(valid_until);

-- Alerts
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_asset ON alerts(asset_id);
CREATE INDEX idx_alerts_created ON alerts(created_at);

-- Audit log
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- =============================================================================
-- TRIGGER: auto-update updated_at timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workers_updated_at
    BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_kits_updated_at
    BEFORE UPDATE ON asset_kits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_alert_rules_updated_at
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
