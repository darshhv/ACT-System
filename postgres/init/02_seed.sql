-- =============================================================================
-- ACT SYSTEM — SEED DATA
-- Realistic MSME factory tool room data for development & demo
-- =============================================================================

-- =============================================================================
-- EDGE NODE
-- =============================================================================
INSERT INTO edge_nodes (node_id, location, description, is_active) VALUES
('EDGE-001', 'Tool Room Door — Main Entry', 'Primary scan station at tool room entry/exit', TRUE);

-- =============================================================================
-- ASSET CATEGORIES (hierarchical)
-- Top level → sub-categories
-- =============================================================================

-- Top-level categories
INSERT INTO asset_categories (code, name, requires_calibration, default_checkout_hours, calibration_interval_days, description) VALUES
('MEAS',  'Measuring Instruments',     TRUE,  4,  180, 'Precision measurement tools requiring periodic calibration'),
('CUT',   'Cutting Tools',             FALSE, 8,  NULL,'Drills, taps, mills, reamers'),
('HAND',  'Hand Tools',                FALSE, 8,  NULL,'Manual tools — spanners, screwdrivers, hammers, pliers'),
('POWER', 'Power Tools',               FALSE, 8,  NULL,'Electrically or pneumatically powered tools'),
('FIX',   'Fixtures & Jigs',           FALSE, 24, NULL,'Work-holding and positioning fixtures'),
('GAUGE', 'Gauges & Templates',        TRUE,  4,  365, 'Go/No-Go gauges, profile templates, thread gauges'),
('INSP',  'Inspection Equipment',      TRUE,  8,  180, 'Surface plates, V-blocks, dial indicators, CMM tools'),
('WELD',  'Welding & Joining Tools',   FALSE, 8,  NULL,'Welding equipment, soldering irons, riveting tools'),
('SAFE',  'Safety & PPE Equipment',    FALSE, 8,  NULL,'Safety tools tracked at kit level'),
('MISC',  'Miscellaneous',             FALSE, 8,  NULL,'Other tracked assets');

-- Sub-categories under MEAS
INSERT INTO asset_categories (code, name, parent_id, requires_calibration, default_checkout_hours, calibration_interval_days) VALUES
('MEAS-LEN', 'Length Measuring',   (SELECT id FROM asset_categories WHERE code='MEAS'), TRUE, 4, 180),
('MEAS-ANG', 'Angle Measuring',    (SELECT id FROM asset_categories WHERE code='MEAS'), TRUE, 4, 365),
('MEAS-SURF','Surface Finish',     (SELECT id FROM asset_categories WHERE code='MEAS'), TRUE, 4, 365),
('MEAS-FORM','Form Measurement',   (SELECT id FROM asset_categories WHERE code='MEAS'), TRUE, 4, 365),
('MEAS-TORQ','Torque Instruments', (SELECT id FROM asset_categories WHERE code='MEAS'), TRUE, 4, 180);

-- Sub-categories under CUT
INSERT INTO asset_categories (code, name, parent_id, requires_calibration, default_checkout_hours, calibration_interval_days) VALUES
('CUT-DRILL','Drills & Drill Sets', (SELECT id FROM asset_categories WHERE code='CUT'), FALSE, 8, NULL),
('CUT-TAP',  'Taps & Dies',         (SELECT id FROM asset_categories WHERE code='CUT'), FALSE, 8, NULL),
('CUT-MILL', 'Milling Cutters',     (SELECT id FROM asset_categories WHERE code='CUT'), FALSE, 8, NULL),
('CUT-REAM', 'Reamers & Broaches',  (SELECT id FROM asset_categories WHERE code='CUT'), FALSE, 8, NULL),
('CUT-TURN', 'Turning Tools & Inserts', (SELECT id FROM asset_categories WHERE code='CUT'), FALSE, 8, NULL),
('CUT-GRIND','Grinding Wheels',     (SELECT id FROM asset_categories WHERE code='CUT'), FALSE, 8, NULL);

-- =============================================================================
-- WORKERS
-- =============================================================================
INSERT INTO workers (employee_id, qr_code, full_name, role, department, phone, email) VALUES
('EMP-001', 'QR-W-001', 'Ramesh Kumar',       'TOOLROOM_INCHARGE', 'Tool Room',     '9876500001', 'ramesh@factory.local'),
('EMP-002', 'QR-W-002', 'Suresh Naidu',       'SUPERVISOR',        'Machining',     '9876500002', 'suresh@factory.local'),
('EMP-003', 'QR-W-003', 'Venkatesh Rao',      'TECHNICIAN',        'Machining',     '9876500003', 'venkatesh@factory.local'),
('EMP-004', 'QR-W-004', 'Mohan Lal',          'OPERATOR',          'Machining',     '9876500004', NULL),
('EMP-005', 'QR-W-005', 'Priya Sharma',       'OPERATOR',          'Inspection',    '9876500005', 'priya@factory.local'),
('EMP-006', 'QR-W-006', 'Arun Krishnamurthy', 'TECHNICIAN',        'Welding',       '9876500006', NULL),
('EMP-007', 'QR-W-007', 'Deepak Singh',       'OPERATOR',          'Machining',     '9876500007', NULL),
('EMP-008', 'QR-W-008', 'Kavitha Rajan',      'SUPERVISOR',        'Quality',       '9876500008', 'kavitha@factory.local'),
('EMP-009', 'QR-W-009', 'Balu Subramanian',   'OPERATOR',          'Assembly',      '9876500009', NULL),
('EMP-010', 'QR-W-010', 'Harish Patel',       'ADMIN',             'Management',    '9876500010', 'harish@factory.local');

-- =============================================================================
-- INDIVIDUAL ASSETS — Measuring Instruments
-- =============================================================================
INSERT INTO assets (asset_code, qr_code, name, category_id, tracking_level, manufacturer, model_number, serial_number, purchase_date, state, calibration_status, last_calibrated_at, calibration_due_at, max_checkout_hours) VALUES

-- Vernier Calipers
('ACT-MEAS-001', 'QR-A-001', 'Vernier Caliper 150mm',
 (SELECT id FROM asset_categories WHERE code='MEAS-LEN'), 'INDIVIDUAL',
 'Mitutoyo', '530-312', 'VC-001', '2023-01-15', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '60 days', NOW() + INTERVAL '120 days', 4),

('ACT-MEAS-002', 'QR-A-002', 'Vernier Caliper 300mm',
 (SELECT id FROM asset_categories WHERE code='MEAS-LEN'), 'INDIVIDUAL',
 'Mitutoyo', '530-316', 'VC-002', '2023-01-15', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '30 days', NOW() + INTERVAL '150 days', 4),

('ACT-MEAS-003', 'QR-A-003', 'Digital Vernier Caliper 150mm',
 (SELECT id FROM asset_categories WHERE code='MEAS-LEN'), 'INDIVIDUAL',
 'Mitutoyo', '500-197-30', 'DVC-001', '2023-06-01', 'IN_CUSTODY', 'VALID',
 NOW() - INTERVAL '45 days', NOW() + INTERVAL '135 days', 4),

-- Micrometers
('ACT-MEAS-004', 'QR-A-004', 'Outside Micrometer 0-25mm',
 (SELECT id FROM asset_categories WHERE code='MEAS-LEN'), 'INDIVIDUAL',
 'Mitutoyo', '103-137', 'OM-001', '2022-08-10', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '10 days', NOW() + INTERVAL '170 days', 4),

('ACT-MEAS-005', 'QR-A-005', 'Outside Micrometer 25-50mm',
 (SELECT id FROM asset_categories WHERE code='MEAS-LEN'), 'INDIVIDUAL',
 'Mitutoyo', '103-138', 'OM-002', '2022-08-10', 'AVAILABLE', 'DUE_SOON',
 NOW() - INTERVAL '160 days', NOW() + INTERVAL '20 days', 4),

('ACT-MEAS-006', 'QR-A-006', 'Inside Micrometer 25-50mm',
 (SELECT id FROM asset_categories WHERE code='MEAS-LEN'), 'INDIVIDUAL',
 'Mitutoyo', '145-186', 'IM-001', '2022-08-10', 'SUSPENDED', 'OVERDUE',
 NOW() - INTERVAL '200 days', NOW() - INTERVAL '20 days', 4),

('ACT-MEAS-007', 'QR-A-007', 'Depth Micrometer 0-25mm',
 (SELECT id FROM asset_categories WHERE code='MEAS-LEN'), 'INDIVIDUAL',
 'Mitutoyo', '129-150', 'DM-001', '2023-03-20', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '90 days', NOW() + INTERVAL '90 days', 4),

-- Dial Indicators
('ACT-INSP-001', 'QR-A-008', 'Dial Test Indicator 0.01mm',
 (SELECT id FROM asset_categories WHERE code='INSP'), 'INDIVIDUAL',
 'Mitutoyo', '513-404-10E', 'DTI-001', '2022-11-05', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '80 days', NOW() + INTERVAL '100 days', 4),

('ACT-INSP-002', 'QR-A-009', 'Digital Dial Indicator 0.001mm',
 (SELECT id FROM asset_categories WHERE code='INSP'), 'INDIVIDUAL',
 'Mitutoyo', '543-390', 'DDI-001', '2023-04-12', 'IN_CUSTODY', 'VALID',
 NOW() - INTERVAL '50 days', NOW() + INTERVAL '130 days', 4),

-- Height Gauge
('ACT-MEAS-008', 'QR-A-010', 'Digital Height Gauge 300mm',
 (SELECT id FROM asset_categories WHERE code='MEAS-LEN'), 'INDIVIDUAL',
 'Mitutoyo', '192-613-10', 'HG-001', '2023-02-18', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '70 days', NOW() + INTERVAL '110 days', 8),

-- Angle measuring
('ACT-MEAS-009', 'QR-A-011', 'Universal Bevel Protractor',
 (SELECT id FROM asset_categories WHERE code='MEAS-ANG'), 'INDIVIDUAL',
 'Mitutoyo', '187-906', 'BP-001', '2022-06-15', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '100 days', NOW() + INTERVAL '265 days', 4),

('ACT-MEAS-010', 'QR-A-012', 'Digital Angle Gauge',
 (SELECT id FROM asset_categories WHERE code='MEAS-ANG'), 'INDIVIDUAL',
 'Starrett', 'WL-420', 'AG-001', '2023-07-01', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '40 days', NOW() + INTERVAL '325 days', 4),

-- Surface roughness tester
('ACT-MEAS-011', 'QR-A-013', 'Surface Roughness Tester',
 (SELECT id FROM asset_categories WHERE code='MEAS-SURF'), 'INDIVIDUAL',
 'Mitutoyo', 'SJ-210', 'SRT-001', '2023-05-10', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '55 days', NOW() + INTERVAL '125 days', 8),

-- Torque wrench
('ACT-MEAS-012', 'QR-A-014', 'Torque Wrench 5-50 Nm',
 (SELECT id FROM asset_categories WHERE code='MEAS-TORQ'), 'INDIVIDUAL',
 'Gedore', 'TW-2850', 'TW-001', '2022-09-20', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '120 days', NOW() + INTERVAL '60 days', 8),

('ACT-MEAS-013', 'QR-A-015', 'Torque Wrench 20-200 Nm',
 (SELECT id FROM asset_categories WHERE code='MEAS-TORQ'), 'INDIVIDUAL',
 'Gedore', 'TW-3114', 'TW-002', '2022-09-20', 'OVERDUE', 'VALID',
 NOW() - INTERVAL '115 days', NOW() + INTERVAL '65 days', 8);

-- =============================================================================
-- INDIVIDUAL ASSETS — Gauges
-- =============================================================================
INSERT INTO assets (asset_code, qr_code, name, category_id, tracking_level, manufacturer, state, calibration_status, last_calibrated_at, calibration_due_at, max_checkout_hours) VALUES

('ACT-GAUGE-001', 'QR-A-016', 'Go/No-Go Thread Gauge M8',
 (SELECT id FROM asset_categories WHERE code='GAUGE'), 'INDIVIDUAL',
 'Insize', 'AVAILABLE', 'VALID', NOW() - INTERVAL '50 days', NOW() + INTERVAL '315 days', 4),

('ACT-GAUGE-002', 'QR-A-017', 'Go/No-Go Thread Gauge M10',
 (SELECT id FROM asset_categories WHERE code='GAUGE'), 'INDIVIDUAL',
 'Insize', 'AVAILABLE', 'VALID', NOW() - INTERVAL '50 days', NOW() + INTERVAL '315 days', 4),

('ACT-GAUGE-003', 'QR-A-018', 'Go/No-Go Thread Gauge M12',
 (SELECT id FROM asset_categories WHERE code='GAUGE'), 'INDIVIDUAL',
 'Insize', 'AVAILABLE', 'VALID', NOW() - INTERVAL '50 days', NOW() + INTERVAL '315 days', 4),

('ACT-GAUGE-004', 'QR-A-019', 'Bore Gauge 18-35mm',
 (SELECT id FROM asset_categories WHERE code='GAUGE'), 'INDIVIDUAL',
 'Mitutoyo', 'AVAILABLE', 'VALID', NOW() - INTERVAL '85 days', NOW() + INTERVAL '280 days', 4),

('ACT-GAUGE-005', 'QR-A-020', 'Radius Gauge Set R1-R7',
 (SELECT id FROM asset_categories WHERE code='GAUGE'), 'INDIVIDUAL',
 'Insize', 'AVAILABLE', 'NOT_REQUIRED', NULL, NULL, 4),

('ACT-GAUGE-006', 'QR-A-021', 'Feeler Gauge Set 0.05-1mm',
 (SELECT id FROM asset_categories WHERE code='GAUGE'), 'INDIVIDUAL',
 'Insize', 'AVAILABLE', 'NOT_REQUIRED', NULL, NULL, 4);

-- =============================================================================
-- INDIVIDUAL ASSETS — Power Tools
-- =============================================================================
INSERT INTO assets (asset_code, qr_code, name, category_id, tracking_level, manufacturer, model_number, state, calibration_status, max_checkout_hours) VALUES

('ACT-POWER-001', 'QR-A-022', 'Bench Drill Press 16mm',
 (SELECT id FROM asset_categories WHERE code='POWER'), 'INDIVIDUAL',
 'Bosch', 'PBD40', 'AVAILABLE', 'NOT_REQUIRED', 8),

('ACT-POWER-002', 'QR-A-023', 'Angle Grinder 4.5 inch',
 (SELECT id FROM asset_categories WHERE code='POWER'), 'INDIVIDUAL',
 'Bosch', 'GWS 600', 'AVAILABLE', 'NOT_REQUIRED', 8),

('ACT-POWER-003', 'QR-A-024', 'Angle Grinder 4.5 inch (2)',
 (SELECT id FROM asset_categories WHERE code='POWER'), 'INDIVIDUAL',
 'Bosch', 'GWS 600', 'IN_CUSTODY', 'NOT_REQUIRED', 8),

('ACT-POWER-004', 'QR-A-025', 'Cordless Drill 18V',
 (SELECT id FROM asset_categories WHERE code='POWER'), 'INDIVIDUAL',
 'Bosch', 'GSB 18V-21', 'AVAILABLE', 'NOT_REQUIRED', 8),

('ACT-POWER-005', 'QR-A-026', 'Cordless Drill 18V (2)',
 (SELECT id FROM asset_categories WHERE code='POWER'), 'INDIVIDUAL',
 'Bosch', 'GSB 18V-21', 'AVAILABLE', 'NOT_REQUIRED', 8),

('ACT-POWER-006', 'QR-A-027', 'Jigsaw',
 (SELECT id FROM asset_categories WHERE code='POWER'), 'INDIVIDUAL',
 'Bosch', 'GST 85 PBE', 'AVAILABLE', 'NOT_REQUIRED', 8),

('ACT-POWER-007', 'QR-A-028', 'Random Orbital Sander',
 (SELECT id FROM asset_categories WHERE code='POWER'), 'INDIVIDUAL',
 'Bosch', 'GEX 125-1 AE', 'AVAILABLE', 'NOT_REQUIRED', 8),

('ACT-POWER-008', 'QR-A-029', 'Impact Driver 18V',
 (SELECT id FROM asset_categories WHERE code='POWER'), 'INDIVIDUAL',
 'Bosch', 'GDX 18V-200', 'AVAILABLE', 'NOT_REQUIRED', 8);

-- =============================================================================
-- INDIVIDUAL ASSETS — Inspection Equipment
-- =============================================================================
INSERT INTO assets (asset_code, qr_code, name, category_id, tracking_level, manufacturer, state, calibration_status, last_calibrated_at, calibration_due_at, max_checkout_hours) VALUES

('ACT-INSP-003', 'QR-A-030', 'Granite Surface Plate 300x200mm',
 (SELECT id FROM asset_categories WHERE code='INSP'), 'INDIVIDUAL',
 'Insize', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '90 days', NOW() + INTERVAL '90 days', 8),

('ACT-INSP-004', 'QR-A-031', 'V-Block Pair (matched)',
 (SELECT id FROM asset_categories WHERE code='INSP'), 'INDIVIDUAL',
 'Insize', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '90 days', NOW() + INTERVAL '90 days', 8),

('ACT-INSP-005', 'QR-A-032', 'Magnetic Base for Dial Indicator',
 (SELECT id FROM asset_categories WHERE code='INSP'), 'INDIVIDUAL',
 'Mitutoyo', 'AVAILABLE', 'NOT_REQUIRED', NULL, NULL, 8),

('ACT-INSP-006', 'QR-A-033', 'Hardness Tester (Portable Rockwell)',
 (SELECT id FROM asset_categories WHERE code='INSP'), 'INDIVIDUAL',
 'Proceq', 'AVAILABLE', 'VALID',
 NOW() - INTERVAL '60 days', NOW() + INTERVAL '120 days', 4);

-- =============================================================================
-- ASSET KITS — Small tools tracked at kit level
-- =============================================================================
INSERT INTO asset_kits (kit_code, qr_code, name, category_id, expected_count, state) VALUES

('ACT-KIT-001', 'QR-K-001', 'HSS Drill Bit Set (1-13mm, 25pc)',
 (SELECT id FROM asset_categories WHERE code='CUT-DRILL'), 25, 'AVAILABLE'),

('ACT-KIT-002', 'QR-K-002', 'Metric Tap Set M3-M12 (10pc)',
 (SELECT id FROM asset_categories WHERE code='CUT-TAP'), 10, 'IN_CUSTODY'),

('ACT-KIT-003', 'QR-K-003', 'Screwdriver Set — Flathead & Phillips (12pc)',
 (SELECT id FROM asset_categories WHERE code='HAND'), 12, 'AVAILABLE'),

('ACT-KIT-004', 'QR-K-004', 'Allen Key Set Metric 1.5-19mm (9pc)',
 (SELECT id FROM asset_categories WHERE code='HAND'), 9, 'AVAILABLE'),

('ACT-KIT-005', 'QR-K-005', 'Combination Spanner Set 8-32mm (14pc)',
 (SELECT id FROM asset_categories WHERE code='HAND'), 14, 'AVAILABLE'),

('ACT-KIT-006', 'QR-K-006', 'End Mill Set 4-20mm (8pc)',
 (SELECT id FROM asset_categories WHERE code='CUT-MILL'), 8, 'AVAILABLE'),

('ACT-KIT-007', 'QR-K-007', 'File Set — Flat, Round, Half-Round (6pc)',
 (SELECT id FROM asset_categories WHERE code='HAND'), 6, 'AVAILABLE'),

('ACT-KIT-008', 'QR-K-008', 'Punch & Chisel Set (8pc)',
 (SELECT id FROM asset_categories WHERE code='HAND'), 8, 'AVAILABLE'),

('ACT-KIT-009', 'QR-K-009', 'Metric Die Set M3-M12 (10pc)',
 (SELECT id FROM asset_categories WHERE code='CUT-TAP'), 10, 'AVAILABLE'),

('ACT-KIT-010', 'QR-K-010', 'Reamer Set 6-20mm (8pc)',
 (SELECT id FROM asset_categories WHERE code='CUT-REAM'), 8, 'AVAILABLE');

-- =============================================================================
-- CUSTODY RECORDS — Sample transactions
-- =============================================================================
INSERT INTO custody_records (asset_id, worker_id, edge_node_id, event_type, checked_out_at, expected_return_at, returned_at, is_overdue) VALUES

-- Returned checkouts (history)
((SELECT id FROM assets WHERE asset_code='ACT-MEAS-001'),
 (SELECT id FROM workers WHERE employee_id='EMP-004'),
 (SELECT id FROM edge_nodes WHERE node_id='EDGE-001'),
 'CHECKOUT',
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '4 hours',
 NOW() - INTERVAL '3 days' + INTERVAL '3.5 hours', FALSE),

((SELECT id FROM assets WHERE asset_code='ACT-MEAS-004'),
 (SELECT id FROM workers WHERE employee_id='EMP-003'),
 (SELECT id FROM edge_nodes WHERE node_id='EDGE-001'),
 'CHECKOUT',
 NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '4 hours',
 NOW() - INTERVAL '5 days' + INTERVAL '5 hours', FALSE),

-- Currently checked out (no returned_at)
((SELECT id FROM assets WHERE asset_code='ACT-MEAS-003'),
 (SELECT id FROM workers WHERE employee_id='EMP-007'),
 (SELECT id FROM edge_nodes WHERE node_id='EDGE-001'),
 'CHECKOUT',
 NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '4 hours',
 NULL, FALSE),

((SELECT id FROM assets WHERE asset_code='ACT-INSP-002'),
 (SELECT id FROM workers WHERE employee_id='EMP-005'),
 (SELECT id FROM edge_nodes WHERE node_id='EDGE-001'),
 'CHECKOUT',
 NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour' + INTERVAL '4 hours',
 NULL, FALSE),

((SELECT id FROM assets WHERE asset_code='ACT-POWER-003'),
 (SELECT id FROM workers WHERE employee_id='EMP-004'),
 (SELECT id FROM edge_nodes WHERE node_id='EDGE-001'),
 'CHECKOUT',
 NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours' + INTERVAL '8 hours',
 NULL, FALSE);

-- Kit checkouts
INSERT INTO custody_records (kit_id, worker_id, edge_node_id, event_type, checked_out_at, expected_return_at, returned_at, is_overdue) VALUES

((SELECT id FROM asset_kits WHERE kit_code='ACT-KIT-002'),
 (SELECT id FROM workers WHERE employee_id='EMP-003'),
 (SELECT id FROM edge_nodes WHERE node_id='EDGE-001'),
 'CHECKOUT',
 NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour' + INTERVAL '8 hours',
 NULL, FALSE);

-- Overdue record
INSERT INTO custody_records (asset_id, worker_id, edge_node_id, event_type, checked_out_at, expected_return_at, returned_at, is_overdue, overdue_flagged_at, overdue_hours) VALUES

((SELECT id FROM assets WHERE asset_code='ACT-MEAS-013'),
 (SELECT id FROM workers WHERE employee_id='EMP-009'),
 (SELECT id FROM edge_nodes WHERE node_id='EDGE-001'),
 'CHECKOUT',
 NOW() - INTERVAL '14 hours', NOW() - INTERVAL '14 hours' + INTERVAL '8 hours',
 NULL, TRUE, NOW() - INTERVAL '6 hours', 6.0);

-- =============================================================================
-- CALIBRATION RECORDS — History for key instruments
-- =============================================================================
INSERT INTO calibration_records (asset_id, calibrated_at, calibrated_by, certificate_number, valid_until, result) VALUES

((SELECT id FROM assets WHERE asset_code='ACT-MEAS-001'),
 NOW() - INTERVAL '60 days', 'NABL Lab — Bangalore', 'NABL-2025-VC001',
 NOW() + INTERVAL '120 days', 'PASS'),

((SELECT id FROM assets WHERE asset_code='ACT-MEAS-004'),
 NOW() - INTERVAL '10 days', 'NABL Lab — Bangalore', 'NABL-2025-OM001',
 NOW() + INTERVAL '170 days', 'PASS'),

((SELECT id FROM assets WHERE asset_code='ACT-MEAS-005'),
 NOW() - INTERVAL '160 days', 'NABL Lab — Bangalore', 'NABL-2024-OM002',
 NOW() + INTERVAL '20 days', 'PASS'),

((SELECT id FROM assets WHERE asset_code='ACT-MEAS-006'),
 NOW() - INTERVAL '200 days', 'NABL Lab — Bangalore', 'NABL-2024-IM001',
 NOW() - INTERVAL '20 days', 'PASS');

-- =============================================================================
-- ALERT RULES
-- =============================================================================
INSERT INTO alert_rules (name, alert_type, severity, is_active, conditions, notify_roles) VALUES

('Overdue Return — 2 Hour Warning',
 'OVERDUE_RETURN', 'WARNING', TRUE,
 '{"overdue_threshold_hours": 2}',
 ARRAY['TOOLROOM_INCHARGE', 'SUPERVISOR']::worker_role[]),

('Overdue Return — Critical (8+ hours)',
 'OVERDUE_RETURN', 'CRITICAL', TRUE,
 '{"overdue_threshold_hours": 8}',
 ARRAY['TOOLROOM_INCHARGE', 'SUPERVISOR', 'ADMIN']::worker_role[]),

('Calibration Expired',
 'CALIBRATION_EXPIRED', 'CRITICAL', TRUE,
 '{}',
 ARRAY['TOOLROOM_INCHARGE', 'SUPERVISOR']::worker_role[]),

('Calibration Due in 30 Days',
 'CALIBRATION_DUE_SOON', 'INFO', TRUE,
 '{"days_ahead": 30}',
 ARRAY['TOOLROOM_INCHARGE']::worker_role[]),

('Calibration Due in 7 Days',
 'CALIBRATION_DUE_SOON', 'WARNING', TRUE,
 '{"days_ahead": 7}',
 ARRAY['TOOLROOM_INCHARGE', 'SUPERVISOR']::worker_role[]);

-- =============================================================================
-- SAMPLE ALERTS
-- =============================================================================
INSERT INTO alerts (alert_type, severity, status, asset_id, title, message, created_at) VALUES

('OVERDUE_RETURN', 'CRITICAL', 'OPEN',
 (SELECT id FROM assets WHERE asset_code='ACT-MEAS-013'),
 'CRITICAL: Torque Wrench 20-200 Nm overdue by 6 hours',
 'ACT-MEAS-013 (Torque Wrench 20-200 Nm) was checked out by Balu Subramanian 14 hours ago. Expected return was 6 hours ago. Please locate immediately.',
 NOW() - INTERVAL '6 hours'),

('CALIBRATION_EXPIRED', 'CRITICAL', 'OPEN',
 (SELECT id FROM assets WHERE asset_code='ACT-MEAS-006'),
 'CRITICAL: Inside Micrometer calibration expired 20 days ago',
 'ACT-MEAS-006 (Inside Micrometer 25-50mm) calibration expired on ' || (NOW() - INTERVAL '20 days')::DATE || '. Asset has been SUSPENDED. Do not issue until recalibrated.',
 NOW() - INTERVAL '20 days'),

('CALIBRATION_DUE_SOON', 'WARNING', 'OPEN',
 (SELECT id FROM assets WHERE asset_code='ACT-MEAS-005'),
 'WARNING: Outside Micrometer 25-50mm calibration due in 20 days',
 'ACT-MEAS-005 (Outside Micrometer 25-50mm) is due for calibration in 20 days. Schedule with NABL lab.',
 NOW() - INTERVAL '1 day');
