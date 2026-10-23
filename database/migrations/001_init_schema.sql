-- Legacy prototype migration for the original smart_hospital runtime.
-- New Phase 2 schema: run `npm run db:apply:phase2` from server/.
-- Do not apply both schemas to the same database; current server routes still
-- target this legacy schema until their tenant-aware migration is completed.
CREATE DATABASE IF NOT EXISTS smart_hospital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_hospital;

CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(160) NULL,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(30) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP NULL,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL UNIQUE,
  code VARCHAR(40) NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  employee_number VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  department_id INT NULL,
  job_title VARCHAR(100) NULL,
  phone VARCHAR(30) NULL,
  specialty VARCHAR(120) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_staff_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS patients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_number VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  gender VARCHAR(20) NULL,
  date_of_birth DATE NULL,
  address_line1 VARCHAR(160) NULL,
  address_line2 VARCHAR(160) NULL,
  city VARCHAR(80) NULL,
  state_province VARCHAR(80) NULL,
  postal_code VARCHAR(30) NULL,
  country VARCHAR(80) NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(120) NULL,
  emergency_contact_name VARCHAR(120) NULL,
  emergency_contact_phone VARCHAR(30) NULL,
  registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  staff_id INT NULL,
  department_id INT NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
  reason VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  CONSTRAINT fk_appointments_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS visits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  appointment_id INT NULL,
  doctor_id INT NULL,
  visit_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  chief_complaint TEXT NULL,
  history_notes TEXT NULL,
  allergies TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_visits_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_visits_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_visits_doctor FOREIGN KEY (doctor_id) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vital_signs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  visit_id INT NOT NULL,
  recorded_by INT NULL,
  blood_pressure VARCHAR(20) NULL,
  heart_rate VARCHAR(20) NULL,
  respiratory_rate VARCHAR(20) NULL,
  temperature VARCHAR(20) NULL,
  oxygen_saturation VARCHAR(20) NULL,
  weight_kg DECIMAL(6,2) NULL,
  height_cm DECIMAL(6,2) NULL,
  bmi DECIMAL(5,2) NULL,
  observed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vital_signs_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
  CONSTRAINT fk_vital_signs_staff FOREIGN KEY (recorded_by) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS diagnoses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  visit_id INT NOT NULL,
  recorded_by INT NULL,
  diagnosis_code VARCHAR(80) NULL,
  diagnosis_name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_diagnoses_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
  CONSTRAINT fk_diagnoses_staff FOREIGN KEY (recorded_by) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS clinical_notes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  visit_id INT NOT NULL,
  recorded_by INT NULL,
  note_type VARCHAR(40) NOT NULL DEFAULT 'general',
  note_text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_clinical_notes_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
  CONSTRAINT fk_clinical_notes_staff FOREIGN KEY (recorded_by) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS treatment_plans (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  visit_id INT NOT NULL,
  recorded_by INT NULL,
  plan_summary TEXT NOT NULL,
  follow_up_date DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_treatment_plans_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE,
  CONSTRAINT fk_treatment_plans_staff FOREIGN KEY (recorded_by) REFERENCES staff(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id BIGINT NULL,
  outcome VARCHAR(30) NULL,
  details JSON NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS medicines (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  generic_name VARCHAR(160) NULL,
  brand_name VARCHAR(160) NULL,
  strength VARCHAR(80) NULL,
  dosage_form VARCHAR(80) NULL,
  unit_of_measure VARCHAR(50) NULL,
  storage_requirements VARCHAR(255) NULL,
  minimum_stock_level INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  contact_person VARCHAR(120) NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medicine_batches (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  medicine_id BIGINT NOT NULL,
  batch_number VARCHAR(80) NOT NULL,
  supplier_id BIGINT NULL,
  received_date DATE NULL,
  expiry_date DATE NULL,
  quantity_received INT NOT NULL DEFAULT 0,
  available_quantity INT NOT NULL DEFAULT 0,
  stock_location VARCHAR(120) NULL,
  unit_cost DECIMAL(12,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_medicine_batches_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT,
  CONSTRAINT fk_medicine_batches_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  medicine_id BIGINT NULL,
  batch_id BIGINT NULL,
  movement_type VARCHAR(40) NOT NULL,
  quantity INT NOT NULL,
  reason VARCHAR(255) NULL,
  reference_type VARCHAR(80) NULL,
  reference_id BIGINT NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_movements_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL,
  CONSTRAINT fk_stock_movements_batch FOREIGN KEY (batch_id) REFERENCES medicine_batches(id) ON DELETE SET NULL,
  CONSTRAINT fk_stock_movements_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  visit_id INT NOT NULL,
  prescriber_id INT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_prescriptions_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE RESTRICT,
  CONSTRAINT fk_prescriptions_prescriber FOREIGN KEY (prescriber_id) REFERENCES staff(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS prescription_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  prescription_id BIGINT NOT NULL,
  medicine_id BIGINT NOT NULL,
  dosage VARCHAR(80) NULL,
  route VARCHAR(80) NULL,
  frequency VARCHAR(80) NULL,
  duration VARCHAR(80) NULL,
  quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_prescription_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_prescription_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS dispenses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  prescription_id BIGINT NOT NULL,
  patient_id INT NOT NULL,
  dispensed_by INT NOT NULL,
  dispensed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(30) NOT NULL DEFAULT 'dispensed',
  CONSTRAINT fk_dispenses_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dispenses_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dispenses_user FOREIGN KEY (dispensed_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS dispense_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dispense_id BIGINT NOT NULL,
  medicine_id BIGINT NOT NULL,
  batch_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dispense_items_dispense FOREIGN KEY (dispense_id) REFERENCES dispenses(id) ON DELETE CASCADE,
  CONSTRAINT fk_dispense_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT,
  CONSTRAINT fk_dispense_items_batch FOREIGN KEY (batch_id) REFERENCES medicine_batches(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lab_tests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  specimen_requirements TEXT NULL,
  reference_range VARCHAR(160) NULL,
  unit VARCHAR(60) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lab_orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  visit_id INT NULL,
  order_number VARCHAR(80) NOT NULL UNIQUE,
  test_type VARCHAR(80) NOT NULL,
  priority VARCHAR(30) NOT NULL DEFAULT 'routine',
  clinical_notes TEXT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_orders_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_lab_orders_visit FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lab_order_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  lab_order_id BIGINT NOT NULL,
  test_id BIGINT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_order_items_order FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_order_items_test FOREIGN KEY (test_id) REFERENCES lab_tests(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS specimens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  lab_order_id BIGINT NOT NULL,
  specimen_type VARCHAR(80) NULL,
  collection_time TIMESTAMP NULL,
  received_time TIMESTAMP NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'collected',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_specimens_lab_order FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lab_results (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  lab_order_id BIGINT NOT NULL,
  specimen_id BIGINT NULL,
  result_value VARCHAR(160) NULL,
  unit VARCHAR(60) NULL,
  reference_range VARCHAR(160) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'preliminary',
  critical_flag TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lab_results_order FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_results_specimen FOREIGN KEY (specimen_id) REFERENCES specimens(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS result_amendments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  lab_result_id BIGINT NOT NULL,
  amended_by INT NULL,
  previous_value VARCHAR(160) NULL,
  new_value VARCHAR(160) NULL,
  reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_result_amendments_result FOREIGN KEY (lab_result_id) REFERENCES lab_results(id) ON DELETE CASCADE,
  CONSTRAINT fk_result_amendments_user FOREIGN KEY (amended_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hospitals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  address VARCHAR(255) NOT NULL,
  manager VARCHAR(160) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'Operational',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_patients_patient_number ON patients(patient_number);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_date_status ON appointments(appointment_date, status);
CREATE INDEX idx_visits_patient_id ON visits(patient_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
