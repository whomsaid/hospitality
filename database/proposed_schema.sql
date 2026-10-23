-- Phase 2 proposed schema for review only.
-- Applied to the isolated smart_hospital_proposed database by
-- `npm run db:apply:phase2` from server/. This does not alter smart_hospital.
-- Target: MySQL 8.0.16+ / InnoDB. Review docs/architecture.md and
-- docs/database-design.md before switching the application to this schema.
CREATE DATABASE IF NOT EXISTS smart_hospital_proposed
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_hospital_proposed;

SET NAMES utf8mb4;

CREATE TABLE hospitals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(180) NOT NULL,
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  phone VARCHAR(32) NULL,
  email VARCHAR(254) NULL,
  address_line1 VARCHAR(180) NULL,
  address_line2 VARCHAR(180) NULL,
  province VARCHAR(100) NULL,
  district VARCHAR(100) NULL,
  sector VARCHAR(100) NULL,
  cell VARCHAR(100) NULL,
  village VARCHAR(100) NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'RW',
  time_zone VARCHAR(64) NOT NULL DEFAULT 'Africa/Kigali',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_hospitals_code (code),
  KEY idx_hospitals_status_name (status, name)
) ENGINE=InnoDB;

CREATE TABLE roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  scope ENUM('platform', 'hospital', 'patient') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  resource_name VARCHAR(80) NOT NULL,
  action_name VARCHAR(40) NOT NULL,
  sensitivity ENUM('standard', 'sensitive', 'restricted') NOT NULL DEFAULT 'standard',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_permissions_name (name),
  KEY idx_permissions_resource_action (resource_name, action_name)
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  granted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(32) NULL,
  full_name VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive', 'locked', 'pending') NOT NULL DEFAULT 'pending',
  password_changed_at DATETIME(3) NULL,
  last_login_at DATETIME(3) NULL,
  failed_login_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_status_name (status, full_name)
) ENGINE=InnoDB;

-- A NULL hospital_id is a platform/patient scope. Hospital staff role rows must name a hospital.
CREATE TABLE user_roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NULL,
  assigned_by_user_id BIGINT UNSIGNED NULL,
  status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
  starts_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ends_at DATETIME(3) NULL,
  scope_hospital_id BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(hospital_id, 0)) STORED,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_role_scope (user_id, role_id, scope_hospital_id),
  KEY idx_user_roles_hospital_status (hospital_id, status),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_user_roles_dates CHECK (ends_at IS NULL OR ends_at > starts_at)
) ENGINE=InnoDB;

CREATE TABLE user_permission_overrides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NULL,
  effect ENUM('allow', 'deny') NOT NULL,
  reason VARCHAR(500) NOT NULL,
  granted_by_user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_permission_override_user_scope (user_id, hospital_id, revoked_at, expires_at),
  CONSTRAINT fk_permission_override_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_permission_override_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_permission_override_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_permission_override_grantor FOREIGN KEY (granted_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE hospital_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id BIGINT UNSIGNED NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSON NOT NULL,
  updated_by_user_id BIGINT UNSIGNED NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_hospital_settings_key (hospital_id, setting_key),
  CONSTRAINT fk_hospital_settings_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_hospital_settings_user FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE system_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSON NOT NULL,
  sensitivity ENUM('standard', 'restricted', 'secret_reference') NOT NULL DEFAULT 'standard',
  updated_by_user_id BIGINT UNSIGNED NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_system_settings_key (setting_key),
  CONSTRAINT fk_system_settings_user FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE departments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_departments_code (hospital_id, code),
  UNIQUE KEY uq_departments_name (hospital_id, name),
  UNIQUE KEY uq_departments_id_hospital (id, hospital_id),
  CONSTRAINT fk_departments_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE staff (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  department_id BIGINT UNSIGNED NULL,
  employee_number VARCHAR(60) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  job_title VARCHAR(120) NULL,
  specialty VARCHAR(120) NULL,
  phone VARCHAR(32) NULL,
  status ENUM('active', 'inactive', 'on_leave') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_staff_employee_number (hospital_id, employee_number),
  UNIQUE KEY uq_staff_id_hospital (id, hospital_id),
  KEY idx_staff_department_status (hospital_id, department_id, status),
  CONSTRAINT fk_staff_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_staff_department FOREIGN KEY (department_id, hospital_id) REFERENCES departments(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE patients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_number CHAR(26) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NULL,
  sex_at_birth ENUM('female', 'male', 'intersex', 'unknown', 'not_recorded') NOT NULL DEFAULT 'not_recorded',
  preferred_name VARCHAR(120) NULL,
  status ENUM('active', 'deceased', 'archived') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  archived_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_patients_patient_number (patient_number),
  UNIQUE KEY uq_patients_id_status (id, status),
  KEY idx_patients_name_dob (last_name, first_name, date_of_birth),
  KEY idx_patients_status_created (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE patient_identifiers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  identifier_type VARCHAR(40) NOT NULL,
  issuing_country CHAR(2) NOT NULL,
  encrypted_value VARBINARY(1024) NOT NULL,
  lookup_hmac BINARY(32) NOT NULL,
  verified_at DATETIME(3) NULL,
  verified_by_user_id BIGINT UNSIGNED NULL,
  valid_from DATE NULL,
  valid_to DATE NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_patient_identifier_lookup (identifier_type, issuing_country, lookup_hmac),
  KEY idx_patient_identifiers_patient (patient_id, revoked_at),
  CONSTRAINT fk_patient_identifiers_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_patient_identifiers_verifier FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_patient_identifier_dates CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
) ENGINE=InnoDB;

CREATE TABLE patient_contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  contact_type ENUM('phone', 'email', 'address', 'emergency_contact', 'guardian') NOT NULL,
  contact_name VARCHAR(180) NULL,
  value_text VARCHAR(500) NOT NULL,
  relationship_to_patient VARCHAR(80) NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_patient_contacts_patient_type (patient_id, contact_type, is_primary),
  CONSTRAINT fk_patient_contacts_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE patient_addresses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  address_type ENUM('home', 'postal', 'temporary', 'other') NOT NULL DEFAULT 'home',
  address_line1 VARCHAR(180) NULL,
  address_line2 VARCHAR(180) NULL,
  province VARCHAR(100) NULL,
  district VARCHAR(100) NULL,
  sector VARCHAR(100) NULL,
  cell VARCHAR(100) NULL,
  village VARCHAR(100) NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'RW',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  valid_from DATE NULL,
  valid_to DATE NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_patient_addresses_patient (patient_id, is_primary, valid_to),
  CONSTRAINT fk_patient_addresses_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT chk_patient_address_dates CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
) ENGINE=InnoDB;

CREATE TABLE patient_hospital_registrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  medical_record_number VARCHAR(60) NOT NULL,
  registered_by_user_id BIGINT UNSIGNED NULL,
  status ENUM('active', 'inactive', 'merged_pending_review') NOT NULL DEFAULT 'active',
  registered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  closed_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_patient_registration_local (hospital_id, patient_id),
  UNIQUE KEY uq_patient_registration_mrn (hospital_id, medical_record_number),
  UNIQUE KEY uq_patient_registration_tenant_link (id, patient_id, hospital_id),
  KEY idx_patient_registration_patient_status (patient_id, status),
  CONSTRAINT fk_patient_registration_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_patient_registration_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_patient_registration_user FOREIGN KEY (registered_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE patient_allergies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  patient_registration_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  substance VARCHAR(180) NOT NULL,
  reaction VARCHAR(500) NULL,
  severity ENUM('unknown', 'mild', 'moderate', 'severe') NOT NULL DEFAULT 'unknown',
  status ENUM('active', 'entered_in_error', 'resolved') NOT NULL DEFAULT 'active',
  recorded_by_staff_id BIGINT UNSIGNED NOT NULL,
  recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  resolved_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_patient_allergies_history (patient_id, status, recorded_at),
  KEY idx_patient_allergies_hospital (hospital_id, patient_id, status),
  CONSTRAINT fk_patient_allergies_registration FOREIGN KEY (patient_registration_id, patient_id, hospital_id) REFERENCES patient_hospital_registrations(id, patient_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_patient_allergies_staff FOREIGN KEY (recorded_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE patient_conditions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  patient_registration_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  code_system VARCHAR(40) NULL,
  condition_code VARCHAR(40) NULL,
  condition_name VARCHAR(180) NOT NULL,
  clinical_status ENUM('active', 'recurrence', 'relapse', 'resolved', 'entered_in_error') NOT NULL DEFAULT 'active',
  onset_date DATE NULL,
  recorded_by_staff_id BIGINT UNSIGNED NOT NULL,
  recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  resolved_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_patient_conditions_history (patient_id, clinical_status, recorded_at),
  KEY idx_patient_conditions_hospital (hospital_id, patient_id, clinical_status),
  CONSTRAINT fk_patient_conditions_registration FOREIGN KEY (patient_registration_id, patient_id, hospital_id) REFERENCES patient_hospital_registrations(id, patient_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_patient_conditions_staff FOREIGN KEY (recorded_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE patient_user_accounts (
  patient_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (patient_id, user_id),
  UNIQUE KEY uq_patient_user_account_user (user_id),
  CONSTRAINT fk_patient_user_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_patient_user_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE patient_profile_correction_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  requested_by_user_id BIGINT UNSIGNED NOT NULL,
  field_name VARCHAR(80) NOT NULL,
  proposed_value_encrypted VARBINARY(2048) NOT NULL,
  patient_message VARCHAR(1000) NULL,
  status ENUM('requested', 'approved', 'rejected', 'applied', 'withdrawn') NOT NULL DEFAULT 'requested',
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  review_reason VARCHAR(1000) NULL,
  requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  reviewed_at DATETIME(3) NULL,
  applied_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_patient_correction_queue (status, requested_at),
  KEY idx_patient_correction_patient (patient_id, requested_at),
  CONSTRAINT fk_patient_correction_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_patient_correction_requester FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_patient_correction_reviewer FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE patient_consents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  source_hospital_id BIGINT UNSIGNED NOT NULL,
  receiving_hospital_id BIGINT UNSIGNED NOT NULL,
  consent_status ENUM('granted', 'withdrawn', 'expired') NOT NULL,
  purpose VARCHAR(160) NOT NULL,
  legal_basis VARCHAR(160) NOT NULL,
  captured_by_user_id BIGINT UNSIGNED NULL,
  granted_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NULL,
  withdrawn_at DATETIME(3) NULL,
  evidence_reference VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_patient_consents_scope (id, patient_id, source_hospital_id, receiving_hospital_id),
  KEY idx_patient_consents_scope (patient_id, source_hospital_id, receiving_hospital_id, consent_status, expires_at),
  CONSTRAINT fk_patient_consents_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_patient_consents_source FOREIGN KEY (source_hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_patient_consents_receiver FOREIGN KEY (receiving_hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_patient_consents_captured_by FOREIGN KEY (captured_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_patient_consents_different_hospitals CHECK (source_hospital_id <> receiving_hospital_id),
  CONSTRAINT chk_patient_consents_dates CHECK (expires_at IS NULL OR expires_at > granted_at)
) ENGINE=InnoDB;

CREATE TABLE patient_sharing_authorizations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  patient_id BIGINT UNSIGNED NOT NULL,
  source_hospital_id BIGINT UNSIGNED NOT NULL,
  receiving_hospital_id BIGINT UNSIGNED NOT NULL,
  consent_id BIGINT UNSIGNED NULL,
  authorization_type ENUM('consent', 'legal_basis', 'emergency') NOT NULL,
  authorized_record_types JSON NOT NULL,
  date_from DATE NULL,
  date_to DATE NULL,
  purpose VARCHAR(160) NOT NULL,
  legal_basis VARCHAR(160) NOT NULL,
  status ENUM('active', 'revoked', 'expired') NOT NULL DEFAULT 'active',
  approved_by_user_id BIGINT UNSIGNED NOT NULL,
  justification VARCHAR(1000) NULL,
  starts_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_sharing_authorization_lookup (patient_id, source_hospital_id, receiving_hospital_id, status, starts_at, expires_at),
  CONSTRAINT fk_sharing_authorization_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sharing_authorization_source FOREIGN KEY (source_hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sharing_authorization_receiver FOREIGN KEY (receiving_hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sharing_authorization_consent FOREIGN KEY (consent_id, patient_id, source_hospital_id, receiving_hospital_id) REFERENCES patient_consents(id, patient_id, source_hospital_id, receiving_hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_sharing_authorization_approver FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_sharing_authorization_different_hospitals CHECK (source_hospital_id <> receiving_hospital_id),
  CONSTRAINT chk_sharing_authorization_consent CHECK (authorization_type <> 'consent' OR consent_id IS NOT NULL),
  CONSTRAINT chk_sharing_authorization_dates CHECK (expires_at IS NULL OR expires_at > starts_at),
  CONSTRAINT chk_sharing_authorization_record_types CHECK (JSON_TYPE(authorized_record_types) = 'ARRAY' AND JSON_LENGTH(authorized_record_types) > 0),
  CONSTRAINT chk_sharing_authorization_record_dates CHECK (date_to IS NULL OR date_from IS NULL OR date_to >= date_from)
) ENGINE=InnoDB;

CREATE TABLE patient_identity_review_cases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id BIGINT UNSIGNED NOT NULL,
  requested_by_user_id BIGINT UNSIGNED NOT NULL,
  identifier_type VARCHAR(40) NOT NULL,
  issuing_country CHAR(2) NOT NULL,
  lookup_hmac BINARY(32) NOT NULL,
  status ENUM('open', 'resolved_match', 'resolved_no_match', 'closed') NOT NULL DEFAULT 'open',
  resolution_notes VARCHAR(1000) NULL,
  resolved_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  resolved_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_identity_review_hospital_status (hospital_id, status, created_at),
  CONSTRAINT fk_identity_review_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_identity_review_requester FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_identity_review_resolver FOREIGN KEY (resolved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE patient_identity_review_candidates (
  review_case_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  added_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (review_case_id, patient_id),
  CONSTRAINT fk_identity_review_candidate_case FOREIGN KEY (review_case_id) REFERENCES patient_identity_review_cases(id) ON DELETE RESTRICT,
  CONSTRAINT fk_identity_review_candidate_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE appointments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  appointment_number CHAR(26) NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  patient_registration_id BIGINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NULL,
  clinician_staff_id BIGINT UNSIGNED NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  appointment_type ENUM('scheduled', 'follow_up', 'walk_in') NOT NULL DEFAULT 'scheduled',
  status ENUM('requested', 'scheduled', 'confirmed', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'scheduled',
  reason VARCHAR(500) NULL,
  patient_notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_appointments_id_hospital (id, hospital_id),
  UNIQUE KEY uq_appointments_number (appointment_number),
  UNIQUE KEY uq_appointments_tenant_link (id, patient_id, hospital_id),
  KEY idx_appointments_queue (hospital_id, starts_at, status),
  KEY idx_appointments_clinician (hospital_id, clinician_staff_id, starts_at),
  CONSTRAINT fk_appointments_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_patient_registration FOREIGN KEY (patient_registration_id, patient_id, hospital_id) REFERENCES patient_hospital_registrations(id, patient_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_department FOREIGN KEY (department_id, hospital_id) REFERENCES departments(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_clinician FOREIGN KEY (clinician_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_appointments_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_appointments_times CHECK (ends_at > starts_at)
) ENGINE=InnoDB;

CREATE TABLE visits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_number CHAR(26) NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  patient_registration_id BIGINT UNSIGNED NOT NULL,
  appointment_id BIGINT UNSIGNED NULL,
  department_id BIGINT UNSIGNED NULL,
  attending_staff_id BIGINT UNSIGNED NULL,
  visit_type ENUM('appointment', 'walk_in', 'emergency', 'follow_up') NOT NULL,
  status ENUM('arrived', 'registered', 'awaiting_triage', 'triaged', 'waiting_for_consultation', 'consultation_in_progress', 'awaiting_tests', 'results_pending', 'results_review', 'treatment_in_progress', 'awaiting_discharge', 'discharged', 'visit_completed', 'cancelled') NOT NULL DEFAULT 'arrived',
  arrived_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_visits_number (visit_number),
  UNIQUE KEY uq_visits_id_hospital (id, hospital_id),
  UNIQUE KEY uq_visits_tenant_link (id, patient_id, hospital_id),
  KEY idx_visits_patient_history (patient_id, arrived_at),
  KEY idx_visits_hospital_queue (hospital_id, status, arrived_at),
  CONSTRAINT fk_visits_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_visits_patient_registration FOREIGN KEY (patient_registration_id, patient_id, hospital_id) REFERENCES patient_hospital_registrations(id, patient_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_visits_appointment FOREIGN KEY (appointment_id, patient_id, hospital_id) REFERENCES appointments(id, patient_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_visits_department FOREIGN KEY (department_id, hospital_id) REFERENCES departments(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_visits_attending_staff FOREIGN KEY (attending_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_visits_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_visits_completed_date CHECK (completed_at IS NULL OR completed_at >= arrived_at)
) ENGINE=InnoDB;

CREATE TABLE triage_assessments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  recorded_by_staff_id BIGINT UNSIGNED NOT NULL,
  priority ENUM('immediate', 'urgent', 'standard', 'non_urgent') NOT NULL,
  symptoms TEXT NULL,
  pain_score TINYINT UNSIGNED NULL,
  blood_pressure_systolic SMALLINT UNSIGNED NULL,
  blood_pressure_diastolic SMALLINT UNSIGNED NULL,
  heart_rate_bpm SMALLINT UNSIGNED NULL,
  respiratory_rate SMALLINT UNSIGNED NULL,
  temperature_c DECIMAL(4,1) NULL,
  oxygen_saturation_percent DECIMAL(5,2) NULL,
  weight_kg DECIMAL(6,2) NULL,
  height_cm DECIMAL(6,2) NULL,
  bmi DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN weight_kg IS NOT NULL AND height_cm > 0
      THEN weight_kg / ((height_cm / 100) * (height_cm / 100))
      ELSE NULL
    END
  ) STORED,
  assessed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_triage_visit_time (visit_id, assessed_at),
  CONSTRAINT fk_triage_visit FOREIGN KEY (visit_id, hospital_id) REFERENCES visits(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_triage_staff FOREIGN KEY (recorded_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT chk_triage_pain_score CHECK (pain_score IS NULL OR pain_score <= 10),
  CONSTRAINT chk_triage_oxygen CHECK (oxygen_saturation_percent IS NULL OR oxygen_saturation_percent <= 100)
) ENGINE=InnoDB;

CREATE TABLE clinical_notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  recorded_by_staff_id BIGINT UNSIGNED NOT NULL,
  note_type ENUM('presenting_complaint', 'history', 'examination', 'assessment', 'plan', 'discharge', 'other') NOT NULL,
  note_text MEDIUMTEXT NOT NULL,
  sensitivity ENUM('standard', 'restricted') NOT NULL DEFAULT 'standard',
  recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  amended_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clinical_notes_tenant (id, hospital_id),
  KEY idx_clinical_notes_visit (visit_id, recorded_at),
  KEY idx_clinical_notes_hospital (hospital_id, recorded_at),
  CONSTRAINT fk_clinical_notes_visit FOREIGN KEY (visit_id, hospital_id) REFERENCES visits(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_clinical_notes_staff FOREIGN KEY (recorded_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE clinical_note_amendments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clinical_note_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  previous_text MEDIUMTEXT NOT NULL,
  corrected_text MEDIUMTEXT NOT NULL,
  correction_reason VARCHAR(1000) NOT NULL,
  amended_by_staff_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_clinical_note_amendment_version (clinical_note_id, version_number),
  KEY idx_clinical_note_amendments_hospital (hospital_id, created_at),
  CONSTRAINT fk_clinical_note_amendment_note FOREIGN KEY (clinical_note_id, hospital_id) REFERENCES clinical_notes(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_clinical_note_amendment_staff FOREIGN KEY (amended_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE diagnoses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  recorded_by_staff_id BIGINT UNSIGNED NOT NULL,
  code_system VARCHAR(40) NULL,
  diagnosis_code VARCHAR(40) NULL,
  diagnosis_name VARCHAR(180) NOT NULL,
  clinical_status ENUM('provisional', 'confirmed', 'resolved', 'entered_in_error') NOT NULL DEFAULT 'provisional',
  recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_diagnoses_id_hospital (id, hospital_id),
  KEY idx_diagnoses_visit (visit_id, recorded_at),
  CONSTRAINT fk_diagnoses_visit FOREIGN KEY (visit_id, hospital_id) REFERENCES visits(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_diagnoses_staff FOREIGN KEY (recorded_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE diagnosis_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  diagnosis_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  event_type ENUM('status_changed', 'corrected', 'entered_in_error', 'superseded') NOT NULL,
  previous_status VARCHAR(40) NULL,
  new_status VARCHAR(40) NULL,
  reason VARCHAR(1000) NOT NULL,
  changed_by_staff_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_diagnosis_events_history (diagnosis_id, created_at),
  CONSTRAINT fk_diagnosis_events_diagnosis FOREIGN KEY (diagnosis_id, hospital_id) REFERENCES diagnoses(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_diagnosis_events_staff FOREIGN KEY (changed_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE treatment_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  created_by_staff_id BIGINT UNSIGNED NOT NULL,
  plan_text MEDIUMTEXT NOT NULL,
  follow_up_at DATETIME(3) NULL,
  status ENUM('active', 'completed', 'superseded', 'cancelled') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_treatment_plans_visit (visit_id, created_at),
  CONSTRAINT fk_treatment_plans_visit FOREIGN KEY (visit_id, hospital_id) REFERENCES visits(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_treatment_plans_staff FOREIGN KEY (created_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE referrals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  referring_staff_id BIGINT UNSIGNED NOT NULL,
  destination_hospital_id BIGINT UNSIGNED NULL,
  destination_department VARCHAR(160) NULL,
  reason TEXT NOT NULL,
  urgency ENUM('routine', 'urgent', 'emergency') NOT NULL DEFAULT 'routine',
  status ENUM('draft', 'sent', 'accepted', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
  referred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_referrals_visit (visit_id, referred_at),
  KEY idx_referrals_destination (destination_hospital_id, status, referred_at),
  CONSTRAINT fk_referrals_visit FOREIGN KEY (visit_id, hospital_id) REFERENCES visits(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_referrals_staff FOREIGN KEY (referring_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_referrals_destination FOREIGN KEY (destination_hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE lab_tests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  specimen_requirements VARCHAR(500) NULL,
  unit VARCHAR(60) NULL,
  reference_range VARCHAR(160) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_tests_code (code),
  KEY idx_lab_tests_name_status (name, status)
) ENGINE=InnoDB;

CREATE TABLE lab_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_number CHAR(26) NOT NULL,
  visit_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  requested_by_staff_id BIGINT UNSIGNED NOT NULL,
  priority ENUM('routine', 'urgent', 'stat') NOT NULL DEFAULT 'routine',
  status ENUM('requested', 'accepted', 'processing', 'partially_complete', 'complete', 'cancelled') NOT NULL DEFAULT 'requested',
  clinical_question VARCHAR(1000) NULL,
  requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_requests_number (request_number),
  UNIQUE KEY uq_lab_requests_tenant (id, hospital_id),
  KEY idx_lab_requests_queue (hospital_id, status, priority, requested_at),
  KEY idx_lab_requests_visit (visit_id, requested_at),
  CONSTRAINT fk_lab_requests_visit FOREIGN KEY (visit_id, patient_id, hospital_id) REFERENCES visits(id, patient_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_lab_requests_requester FOREIGN KEY (requested_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE lab_request_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lab_request_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  lab_test_id BIGINT UNSIGNED NOT NULL,
  status ENUM('requested', 'collected', 'processing', 'awaiting_validation', 'released', 'cancelled') NOT NULL DEFAULT 'requested',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_request_item_tenant (id, hospital_id),
  KEY idx_lab_request_items_status (hospital_id, status),
  CONSTRAINT fk_lab_items_request FOREIGN KEY (lab_request_id, hospital_id) REFERENCES lab_requests(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_lab_items_test FOREIGN KEY (lab_test_id) REFERENCES lab_tests(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE specimens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  specimen_number CHAR(26) NOT NULL,
  lab_request_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  specimen_type VARCHAR(80) NOT NULL,
  status ENUM('ordered', 'collected', 'received', 'processing', 'rejected', 'completed', 'disposed') NOT NULL DEFAULT 'ordered',
  collected_at DATETIME(3) NULL,
  received_at DATETIME(3) NULL,
  rejected_at DATETIME(3) NULL,
  rejection_reason VARCHAR(500) NULL,
  collected_by_staff_id BIGINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_specimens_number (specimen_number),
  UNIQUE KEY uq_specimens_tenant (id, hospital_id),
  KEY idx_specimens_queue (hospital_id, status, created_at),
  CONSTRAINT fk_specimens_request FOREIGN KEY (lab_request_id, hospital_id) REFERENCES lab_requests(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_specimens_collector FOREIGN KEY (collected_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE lab_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lab_request_item_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  specimen_id BIGINT UNSIGNED NULL,
  result_data JSON NOT NULL,
  interpretation TEXT NULL,
  abnormal_flag BOOLEAN NOT NULL DEFAULT FALSE,
  critical_flag BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('preliminary', 'awaiting_validation', 'validated', 'released', 'amended', 'cancelled') NOT NULL DEFAULT 'preliminary',
  entered_by_staff_id BIGINT UNSIGNED NOT NULL,
  validated_by_staff_id BIGINT UNSIGNED NULL,
  released_by_staff_id BIGINT UNSIGNED NULL,
  entered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  validated_at DATETIME(3) NULL,
  released_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_results_tenant (id, hospital_id),
  KEY idx_lab_results_status (hospital_id, status, entered_at),
  KEY idx_lab_results_specimen (specimen_id),
  CONSTRAINT fk_lab_results_item FOREIGN KEY (lab_request_item_id, hospital_id) REFERENCES lab_request_items(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_lab_results_specimen FOREIGN KEY (specimen_id, hospital_id) REFERENCES specimens(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_lab_results_enterer FOREIGN KEY (entered_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_lab_results_validator FOREIGN KEY (validated_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_lab_results_releaser FOREIGN KEY (released_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT chk_lab_results_validation_order CHECK (validated_at IS NULL OR validated_at >= entered_at),
  CONSTRAINT chk_lab_results_release_order CHECK (released_at IS NULL OR validated_at IS NOT NULL AND released_at >= validated_at)
) ENGINE=InnoDB;

CREATE TABLE lab_result_versions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  lab_result_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  result_data JSON NOT NULL,
  change_reason VARCHAR(1000) NOT NULL,
  changed_by_staff_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_lab_result_version (lab_result_id, version_number),
  KEY idx_lab_result_versions_hospital (hospital_id, created_at),
  CONSTRAINT fk_lab_result_versions_result FOREIGN KEY (lab_result_id, hospital_id) REFERENCES lab_results(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_lab_result_versions_staff FOREIGN KEY (changed_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE medicines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(60) NOT NULL,
  generic_name VARCHAR(180) NOT NULL,
  brand_name VARCHAR(180) NULL,
  strength VARCHAR(80) NULL,
  dosage_form VARCHAR(80) NULL,
  unit_of_measure VARCHAR(40) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_medicines_code (code),
  KEY idx_medicines_name_status (generic_name, status)
) ENGINE=InnoDB;

CREATE TABLE suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_code VARCHAR(60) NOT NULL,
  name VARCHAR(180) NOT NULL,
  contact_person VARCHAR(180) NULL,
  phone VARCHAR(32) NULL,
  email VARCHAR(254) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_suppliers_code (supplier_code),
  KEY idx_suppliers_name_status (name, status)
) ENGINE=InnoDB;

CREATE TABLE purchase_orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number CHAR(26) NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  status ENUM('draft', 'submitted', 'approved', 'partially_received', 'received', 'cancelled') NOT NULL DEFAULT 'draft',
  currency CHAR(3) NOT NULL DEFAULT 'RWF',
  requested_by_user_id BIGINT UNSIGNED NOT NULL,
  approved_by_user_id BIGINT UNSIGNED NULL,
  reason VARCHAR(1000) NULL,
  ordered_at DATETIME(3) NULL,
  expected_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_orders_number (order_number),
  UNIQUE KEY uq_purchase_orders_tenant (id, hospital_id),
  KEY idx_purchase_orders_queue (hospital_id, status, created_at),
  CONSTRAINT fk_purchase_orders_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_orders_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_orders_requester FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_orders_approver FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE purchase_order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_order_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  medicine_id BIGINT UNSIGNED NOT NULL,
  quantity_ordered DECIMAL(12,3) NOT NULL,
  quantity_received DECIMAL(12,3) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12,2) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_order_item_tenant_medicine (id, medicine_id, hospital_id),
  KEY idx_purchase_order_items_order (purchase_order_id),
  CONSTRAINT fk_purchase_order_items_order FOREIGN KEY (purchase_order_id, hospital_id) REFERENCES purchase_orders(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_order_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT,
  CONSTRAINT chk_purchase_order_item_quantity CHECK (quantity_ordered > 0 AND quantity_received >= 0 AND quantity_received <= quantity_ordered),
  CONSTRAINT chk_purchase_order_item_cost CHECK (unit_cost >= 0)
) ENGINE=InnoDB;

CREATE TABLE medicine_batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id BIGINT UNSIGNED NOT NULL,
  medicine_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NULL,
  purchase_order_item_id BIGINT UNSIGNED NULL,
  supplier_name VARCHAR(180) NULL,
  batch_number VARCHAR(80) NOT NULL,
  received_at DATETIME(3) NOT NULL,
  expires_on DATE NOT NULL,
  quantity_received DECIMAL(12,3) NOT NULL,
  quantity_available DECIMAL(12,3) NOT NULL,
  unit_cost DECIMAL(12,2) NULL,
  status ENUM('available', 'quarantined', 'expired', 'depleted') NOT NULL DEFAULT 'available',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_medicine_batch (hospital_id, medicine_id, batch_number),
  UNIQUE KEY uq_batch_medicine_hospital (id, medicine_id, hospital_id),
  KEY idx_batches_stock_expiry (hospital_id, medicine_id, expires_on, status),
  CONSTRAINT fk_medicine_batches_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_medicine_batches_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT,
  CONSTRAINT fk_medicine_batches_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_medicine_batches_purchase_item FOREIGN KEY (purchase_order_item_id, medicine_id, hospital_id) REFERENCES purchase_order_items(id, medicine_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT chk_medicine_batch_quantities CHECK (quantity_received >= 0 AND quantity_available >= 0 AND quantity_available <= quantity_received),
  CONSTRAINT chk_medicine_batch_cost CHECK (unit_cost IS NULL OR unit_cost >= 0)
) ENGINE=InnoDB;

CREATE TABLE hospital_medicine_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id BIGINT UNSIGNED NOT NULL,
  medicine_id BIGINT UNSIGNED NOT NULL,
  reorder_level DECIMAL(12,3) NOT NULL DEFAULT 0,
  storage_location VARCHAR(120) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_hospital_medicine_settings (hospital_id, medicine_id),
  KEY idx_hospital_medicine_reorder (hospital_id, is_active, reorder_level),
  CONSTRAINT fk_hospital_medicine_settings_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_hospital_medicine_settings_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT,
  CONSTRAINT chk_hospital_medicine_reorder CHECK (reorder_level >= 0)
) ENGINE=InnoDB;

CREATE TABLE stock_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id BIGINT UNSIGNED NOT NULL,
  medicine_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('receipt', 'dispense', 'return', 'adjustment_in', 'adjustment_out', 'waste', 'transfer_in', 'transfer_out') NOT NULL,
  quantity_delta DECIMAL(12,3) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  reference_type VARCHAR(60) NULL,
  reference_id BIGINT UNSIGNED NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_stock_movements_batch_time (batch_id, created_at),
  KEY idx_stock_movements_hospital_time (hospital_id, created_at),
  CONSTRAINT fk_stock_movements_batch FOREIGN KEY (batch_id, medicine_id, hospital_id) REFERENCES medicine_batches(id, medicine_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movements_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_stock_movement_quantity CHECK (quantity_delta <> 0)
) ENGINE=InnoDB;

CREATE TABLE prescriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  prescription_number CHAR(26) NOT NULL,
  visit_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  prescriber_staff_id BIGINT UNSIGNED NOT NULL,
  status ENUM('draft', 'active', 'partially_dispensed', 'dispensed', 'cancelled') NOT NULL DEFAULT 'active',
  instructions TEXT NULL,
  prescribed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  cancelled_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_prescriptions_number (prescription_number),
  UNIQUE KEY uq_prescriptions_tenant (id, hospital_id),
  KEY idx_prescriptions_queue (hospital_id, status, prescribed_at),
  KEY idx_prescriptions_patient (patient_id, prescribed_at),
  CONSTRAINT fk_prescriptions_visit FOREIGN KEY (visit_id, patient_id, hospital_id) REFERENCES visits(id, patient_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_prescriptions_prescriber FOREIGN KEY (prescriber_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE prescription_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  prescription_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  medicine_id BIGINT UNSIGNED NOT NULL,
  dose VARCHAR(120) NOT NULL,
  route VARCHAR(80) NOT NULL,
  frequency VARCHAR(120) NOT NULL,
  duration VARCHAR(120) NOT NULL,
  quantity_prescribed DECIMAL(12,3) NOT NULL,
  quantity_dispensed DECIMAL(12,3) NOT NULL DEFAULT 0,
  instructions VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_prescription_item_medicine_hospital (id, medicine_id, hospital_id),
  KEY idx_prescription_items_prescription (prescription_id),
  CONSTRAINT fk_prescription_items_prescription FOREIGN KEY (prescription_id, hospital_id) REFERENCES prescriptions(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_prescription_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT,
  CONSTRAINT chk_prescription_item_quantities CHECK (quantity_prescribed > 0 AND quantity_dispensed >= 0 AND quantity_dispensed <= quantity_prescribed)
) ENGINE=InnoDB;

CREATE TABLE dispense_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  prescription_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  dispensed_by_staff_id BIGINT UNSIGNED NOT NULL,
  status ENUM('partially_dispensed', 'dispensed', 'reversed') NOT NULL,
  dispensed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_dispense_records_tenant (id, hospital_id),
  KEY idx_dispense_records_queue (hospital_id, dispensed_at),
  CONSTRAINT fk_dispense_records_prescription FOREIGN KEY (prescription_id, hospital_id) REFERENCES prescriptions(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_dispense_records_staff FOREIGN KEY (dispensed_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE dispense_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dispense_record_id BIGINT UNSIGNED NOT NULL,
  prescription_item_id BIGINT UNSIGNED NOT NULL,
  medicine_id BIGINT UNSIGNED NOT NULL,
  batch_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  quantity_dispensed DECIMAL(12,3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_dispense_items_record (dispense_record_id),
  CONSTRAINT fk_dispense_items_record FOREIGN KEY (dispense_record_id, hospital_id) REFERENCES dispense_records(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_dispense_items_prescription_item FOREIGN KEY (prescription_item_id, medicine_id, hospital_id) REFERENCES prescription_items(id, medicine_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_dispense_items_batch FOREIGN KEY (batch_id, medicine_id, hospital_id) REFERENCES medicine_batches(id, medicine_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT chk_dispense_item_quantity CHECK (quantity_dispensed > 0)
) ENGINE=InnoDB;

CREATE TABLE wards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id BIGINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NULL,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  PRIMARY KEY (id),
  UNIQUE KEY uq_wards_code (hospital_id, code),
  UNIQUE KEY uq_wards_id_hospital (id, hospital_id),
  CONSTRAINT fk_wards_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_wards_department FOREIGN KEY (department_id, hospital_id) REFERENCES departments(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE beds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id BIGINT UNSIGNED NOT NULL,
  ward_id BIGINT UNSIGNED NOT NULL,
  bed_number VARCHAR(40) NOT NULL,
  status ENUM('available', 'occupied', 'maintenance', 'inactive') NOT NULL DEFAULT 'available',
  PRIMARY KEY (id),
  UNIQUE KEY uq_beds_number (hospital_id, bed_number),
  UNIQUE KEY uq_beds_id_hospital (id, hospital_id),
  CONSTRAINT fk_beds_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_beds_ward FOREIGN KEY (ward_id, hospital_id) REFERENCES wards(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE admissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admission_number CHAR(26) NOT NULL,
  visit_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  patient_registration_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  ward_id BIGINT UNSIGNED NOT NULL,
  bed_id BIGINT UNSIGNED NULL,
  admitted_by_staff_id BIGINT UNSIGNED NOT NULL,
  status ENUM('admitted', 'transferred', 'discharged', 'cancelled') NOT NULL DEFAULT 'admitted',
  admitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  discharged_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admissions_number (admission_number),
  UNIQUE KEY uq_admissions_tenant (id, hospital_id),
  KEY idx_admissions_hospital_status (hospital_id, status, admitted_at),
  KEY idx_admissions_patient (patient_id, admitted_at),
  CONSTRAINT fk_admissions_visit FOREIGN KEY (visit_id, patient_id, hospital_id) REFERENCES visits(id, patient_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_admissions_registration FOREIGN KEY (patient_registration_id, patient_id, hospital_id) REFERENCES patient_hospital_registrations(id, patient_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_admissions_ward FOREIGN KEY (ward_id, hospital_id) REFERENCES wards(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_admissions_bed FOREIGN KEY (bed_id, hospital_id) REFERENCES beds(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_admissions_staff FOREIGN KEY (admitted_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT chk_admissions_discharge_time CHECK (discharged_at IS NULL OR discharged_at >= admitted_at)
) ENGINE=InnoDB;

CREATE TABLE discharge_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admission_id BIGINT UNSIGNED NULL,
  visit_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  discharged_by_staff_id BIGINT UNSIGNED NOT NULL,
  discharge_status ENUM('home', 'transfer', 'against_medical_advice', 'other') NOT NULL,
  status ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'completed',
  instructions TEXT NULL,
  follow_up_at DATETIME(3) NULL,
  discharged_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_discharge_records_id_hospital (id, hospital_id),
  KEY idx_discharge_visit (visit_id, discharged_at),
  CONSTRAINT fk_discharge_admission FOREIGN KEY (admission_id, hospital_id) REFERENCES admissions(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_discharge_visit FOREIGN KEY (visit_id, hospital_id) REFERENCES visits(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_discharge_staff FOREIGN KEY (discharged_by_staff_id, hospital_id) REFERENCES staff(id, hospital_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE invoices (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_number CHAR(26) NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  patient_id BIGINT UNSIGNED NOT NULL,
  visit_id BIGINT UNSIGNED NULL,
  status ENUM('draft', 'issued', 'partially_paid', 'paid', 'voided') NOT NULL DEFAULT 'draft',
  currency CHAR(3) NOT NULL DEFAULT 'RWF',
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  balance_due DECIMAL(14,2) NOT NULL DEFAULT 0,
  issued_at DATETIME(3) NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_invoices_number (invoice_number),
  UNIQUE KEY uq_invoices_id_hospital (id, hospital_id),
  KEY idx_invoices_hospital_status_date (hospital_id, status, issued_at),
  KEY idx_invoices_patient (patient_id, issued_at),
  CONSTRAINT fk_invoices_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_visit FOREIGN KEY (visit_id, patient_id, hospital_id) REFERENCES visits(id, patient_id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_invoices_amounts CHECK (subtotal >= 0 AND discount_amount >= 0 AND total_amount >= 0 AND balance_due >= 0 AND discount_amount <= subtotal AND total_amount = subtotal - discount_amount AND balance_due <= total_amount)
) ENGINE=InnoDB;

CREATE TABLE invoice_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL,
  service_code VARCHAR(60) NULL,
  quantity DECIMAL(12,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(14,2) NOT NULL,
  line_total DECIMAL(14,2) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_invoice_items_invoice (invoice_id),
  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id, hospital_id) REFERENCES invoices(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT chk_invoice_items_amounts CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0)
) ENGINE=InnoDB;

CREATE TABLE payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_number CHAR(26) NOT NULL,
  invoice_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'RWF',
  method ENUM('cash', 'bank_transfer_manual', 'mobile_money_manual', 'cheque', 'other_manual') NOT NULL,
  verification_reference VARCHAR(160) NULL,
  status ENUM('recorded', 'verified', 'reversed') NOT NULL DEFAULT 'recorded',
  received_by_user_id BIGINT UNSIGNED NOT NULL,
  verified_by_user_id BIGINT UNSIGNED NULL,
  paid_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_number (payment_number),
  UNIQUE KEY uq_payments_id_hospital (id, hospital_id),
  KEY idx_payments_invoice_time (invoice_id, paid_at),
  KEY idx_payments_hospital_status_time (hospital_id, status, paid_at),
  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id, hospital_id) REFERENCES invoices(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payments_receiver FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payments_verifier FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_payments_amount CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE TABLE receipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  payment_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  receipt_number CHAR(26) NOT NULL,
  issued_by_user_id BIGINT UNSIGNED NOT NULL,
  issued_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  document_reference VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_receipts_payment (payment_id),
  UNIQUE KEY uq_receipts_number (receipt_number),
  CONSTRAINT fk_receipts_payment FOREIGN KEY (payment_id, hospital_id) REFERENCES payments(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_receipts_issuer FOREIGN KEY (issued_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE financial_adjustments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  adjustment_type ENUM('refund', 'credit', 'write_off', 'correction') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  requested_by_user_id BIGINT UNSIGNED NOT NULL,
  approved_by_user_id BIGINT UNSIGNED NULL,
  status ENUM('pending', 'approved', 'rejected', 'posted') NOT NULL DEFAULT 'pending',
  requested_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  approved_at DATETIME(3) NULL,
  posted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_financial_adjustments_hospital_status (hospital_id, status, requested_at),
  CONSTRAINT fk_financial_adjustments_invoice FOREIGN KEY (invoice_id, hospital_id) REFERENCES invoices(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_financial_adjustments_requester FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_financial_adjustments_approver FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_financial_adjustment_amount CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE TABLE payment_reconciliation_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id BIGINT UNSIGNED NOT NULL,
  reconciliation_number CHAR(26) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  statement_reference VARCHAR(160) NULL,
  status ENUM('open', 'in_review', 'completed', 'cancelled') NOT NULL DEFAULT 'open',
  opened_by_user_id BIGINT UNSIGNED NOT NULL,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  opened_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_reconciliation_number (reconciliation_number),
  UNIQUE KEY uq_payment_reconciliation_tenant (id, hospital_id),
  KEY idx_payment_reconciliation_queue (hospital_id, status, period_start),
  CONSTRAINT fk_payment_reconciliation_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_reconciliation_opener FOREIGN KEY (opened_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_reconciliation_reviewer FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_payment_reconciliation_period CHECK (period_end >= period_start)
) ENGINE=InnoDB;

CREATE TABLE payment_reconciliation_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reconciliation_run_id BIGINT UNSIGNED NOT NULL,
  payment_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NOT NULL,
  matched_amount DECIMAL(14,2) NOT NULL,
  status ENUM('matched', 'mismatch', 'unmatched', 'excluded') NOT NULL,
  notes VARCHAR(1000) NULL,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reconciliation_run_payment (reconciliation_run_id, payment_id),
  KEY idx_reconciliation_items_run (reconciliation_run_id, status),
  CONSTRAINT fk_reconciliation_items_run FOREIGN KEY (reconciliation_run_id, hospital_id) REFERENCES payment_reconciliation_runs(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_reconciliation_items_payment FOREIGN KEY (payment_id, hospital_id) REFERENCES payments(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_reconciliation_items_reviewer FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_reconciliation_item_amount CHECK (matched_amount >= 0)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient_user_id BIGINT UNSIGNED NOT NULL,
  hospital_id BIGINT UNSIGNED NULL,
  notification_type VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  resource_type VARCHAR(80) NULL,
  resource_id BIGINT UNSIGNED NULL,
  sensitivity ENUM('standard', 'sensitive') NOT NULL DEFAULT 'standard',
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_notifications_user_unread (recipient_user_id, read_at, created_at),
  KEY idx_notifications_hospital_time (hospital_id, created_at),
  CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_notifications_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  hospital_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id BIGINT UNSIGNED NULL,
  patient_id BIGINT UNSIGNED NULL,
  outcome ENUM('success', 'denied', 'failure') NOT NULL,
  purpose VARCHAR(160) NULL,
  justification VARCHAR(1000) NULL,
  request_id CHAR(36) NULL,
  ip_address VARBINARY(16) NULL,
  metadata JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_hospital_time (hospital_id, created_at),
  KEY idx_audit_actor_time (actor_user_id, created_at),
  KEY idx_audit_patient_time (patient_id, created_at),
  KEY idx_audit_resource (resource_type, resource_id, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_audit_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  identifier_hmac BINARY(32) NOT NULL,
  ip_address VARBINARY(16) NULL,
  succeeded BOOLEAN NOT NULL,
  attempted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_login_attempts_identifier_time (identifier_hmac, attempted_at),
  KEY idx_login_attempts_ip_time (ip_address, attempted_at),
  CONSTRAINT fk_login_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash BINARY(32) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_token_hash (token_hash),
  KEY idx_password_reset_user_expiry (user_id, expires_at, used_at),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE workflow_status_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  hospital_id BIGINT UNSIGNED NOT NULL,
  resource_type ENUM('appointment', 'visit', 'lab_request', 'lab_request_item', 'specimen', 'lab_result', 'prescription', 'invoice', 'payment', 'admission', 'discharge') NOT NULL,
  appointment_id BIGINT UNSIGNED NULL,
  visit_id BIGINT UNSIGNED NULL,
  lab_request_id BIGINT UNSIGNED NULL,
  lab_request_item_id BIGINT UNSIGNED NULL,
  specimen_id BIGINT UNSIGNED NULL,
  lab_result_id BIGINT UNSIGNED NULL,
  prescription_id BIGINT UNSIGNED NULL,
  invoice_id BIGINT UNSIGNED NULL,
  payment_id BIGINT UNSIGNED NULL,
  admission_id BIGINT UNSIGNED NULL,
  discharge_record_id BIGINT UNSIGNED NULL,
  previous_status VARCHAR(40) NULL,
  new_status VARCHAR(40) NOT NULL,
  changed_by_user_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_workflow_status_hospital_time (hospital_id, created_at),
  KEY idx_workflow_status_appointment (appointment_id, created_at),
  KEY idx_workflow_status_visit (visit_id, created_at),
  KEY idx_workflow_status_lab_item (lab_request_item_id, created_at),
  KEY idx_workflow_status_specimen (specimen_id, created_at),
  KEY idx_workflow_status_lab_result (lab_result_id, created_at),
  KEY idx_workflow_status_prescription (prescription_id, created_at),
  KEY idx_workflow_status_invoice (invoice_id, created_at),
  KEY idx_workflow_status_payment (payment_id, created_at),
  KEY idx_workflow_status_admission (admission_id, created_at),
  KEY idx_workflow_status_discharge (discharge_record_id, created_at),
  CONSTRAINT fk_workflow_status_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  CONSTRAINT fk_workflow_status_appointment FOREIGN KEY (appointment_id, hospital_id) REFERENCES appointments(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_workflow_status_visit FOREIGN KEY (visit_id, hospital_id) REFERENCES visits(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_workflow_status_lab_request FOREIGN KEY (lab_request_id, hospital_id) REFERENCES lab_requests(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_workflow_status_lab_item FOREIGN KEY (lab_request_item_id, hospital_id) REFERENCES lab_request_items(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_workflow_status_specimen FOREIGN KEY (specimen_id, hospital_id) REFERENCES specimens(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_workflow_status_lab_result FOREIGN KEY (lab_result_id, hospital_id) REFERENCES lab_results(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_workflow_status_prescription FOREIGN KEY (prescription_id, hospital_id) REFERENCES prescriptions(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_workflow_status_invoice FOREIGN KEY (invoice_id, hospital_id) REFERENCES invoices(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_workflow_status_payment FOREIGN KEY (payment_id, hospital_id) REFERENCES payments(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_workflow_status_admission FOREIGN KEY (admission_id, hospital_id) REFERENCES admissions(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_workflow_status_discharge FOREIGN KEY (discharge_record_id, hospital_id) REFERENCES discharge_records(id, hospital_id) ON DELETE RESTRICT,
  CONSTRAINT fk_workflow_status_actor FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_workflow_status_one_resource CHECK (
    (appointment_id IS NOT NULL) + (visit_id IS NOT NULL) + (lab_request_id IS NOT NULL) +
    (lab_request_item_id IS NOT NULL) + (specimen_id IS NOT NULL) + (lab_result_id IS NOT NULL) +
    (prescription_id IS NOT NULL) + (invoice_id IS NOT NULL) + (payment_id IS NOT NULL) +
    (admission_id IS NOT NULL) + (discharge_record_id IS NOT NULL) = 1
  ),
  CONSTRAINT chk_workflow_status_resource_type CHECK (
    (resource_type = 'appointment' AND appointment_id IS NOT NULL) OR
    (resource_type = 'visit' AND visit_id IS NOT NULL) OR
    (resource_type = 'lab_request' AND lab_request_id IS NOT NULL) OR
    (resource_type = 'lab_request_item' AND lab_request_item_id IS NOT NULL) OR
    (resource_type = 'specimen' AND specimen_id IS NOT NULL) OR
    (resource_type = 'lab_result' AND lab_result_id IS NOT NULL) OR
    (resource_type = 'prescription' AND prescription_id IS NOT NULL) OR
    (resource_type = 'invoice' AND invoice_id IS NOT NULL) OR
    (resource_type = 'payment' AND payment_id IS NOT NULL) OR
    (resource_type = 'admission' AND admission_id IS NOT NULL) OR
    (resource_type = 'discharge' AND discharge_record_id IS NOT NULL)
  )
) ENGINE=InnoDB;
