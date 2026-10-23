USE smart_hospital;

INSERT INTO roles (name, description) VALUES
  ('super_admin', 'System-wide administrator'),
  ('hospital_admin', 'Hospital operations manager'),
  ('receptionist', 'Front desk and appointments'),
  ('doctor', 'Clinical physician'),
  ('nurse', 'Patient care and observations'),
  ('lab_technician', 'Laboratory staff'),
  ('pharmacist', 'Pharmacy and inventory'),
  ('accountant', 'Billing and payments'),
  ('ward_manager', 'Ward and bed operations'),
  ('patient', 'Patient portal user')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO permissions (name, description) VALUES
  ('view_dashboard', 'View dashboard'),
  ('manage_users', 'Create and manage users'),
  ('manage_patients', 'Patient registration and updates'),
  ('manage_appointments', 'Schedule and edit appointments'),
  ('manage_clinical_records', 'Create and edit medical records'),
  ('manage_lab_orders', 'Manage laboratory orders'),
  ('manage_pharmacy', 'Pharmacy inventory and dispensing'),
  ('manage_billing', 'View and manage invoices and payments'),
  ('manage_wards', 'Ward and bed management'),
  ('view_reports', 'Operational and financial reports')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO departments (name, code, description) VALUES
  ('Administration', 'ADM', 'Administrative operations'),
  ('Reception', 'REC', 'Reception and front desk'),
  ('General Medicine', 'MED', 'General clinical care'),
  ('Nursing', 'NUR', 'Nursing operations'),
  ('Laboratory', 'LAB', 'Clinical laboratory'),
  ('Pharmacy', 'PHM', 'Pharmacy and medication'),
  ('Billing', 'BIL', 'Billing and finance')
ON DUPLICATE KEY UPDATE description = VALUES(description);
