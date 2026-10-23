import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import mysql from 'mysql2/promise'

dotenv.config({ path: '../.env' })

const databaseName = 'smart_hospital_proposed'
const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD

if (process.env.NODE_ENV === 'production') {
  throw new Error('The development Phase 2 seed is disabled in production.')
}

if (!adminPassword || adminPassword.length < 12) {
  throw new Error('Set BOOTSTRAP_ADMIN_PASSWORD to a unique password of at least 12 characters.')
}

const roles = [
  ['super_admin', 'Platform administrator', 'platform'],
  ['hospital_manager', 'Assigned hospital operations manager', 'hospital'],
  ['receptionist', 'Patient reception and appointments', 'hospital'],
  ['doctor', 'Clinical care', 'hospital'],
  ['pharmacist', 'Pharmacy operations', 'hospital'],
  ['lab_technician', 'Laboratory operations', 'hospital'],
  ['accountant', 'Hospital finance', 'hospital'],
  ['patient', 'Patient portal account', 'patient'],
]

const permissionNames = [
  'view_dashboard', 'manage_users', 'manage_hospitals', 'register_hospitals',
  'manage_patients', 'register_patients', 'manage_appointments',
  'manage_clinical_records', 'manage_lab_orders', 'manage_pharmacy',
  'manage_billing', 'manage_wards', 'view_activity_logs', 'view_reports',
  'hospital.create', 'hospital.read', 'hospital.update', 'hospital.status.manage',
  'hospital.settings.manage', 'staff.read', 'staff.create', 'staff.manage',
  'department.read', 'department.manage', 'patient.search', 'patient.register',
  'patient.demographics.read', 'patient.demographics.update', 'patient.registration.read',
  'appointment.read', 'appointment.create', 'appointment.update', 'visit.create',
  'clinical.note.read', 'clinical.note.write', 'clinical.diagnosis.write',
  'triage.write', 'lab.request.read', 'lab.specimen.manage', 'lab.result.read', 'lab.result.enter',
  'lab.result.validate', 'lab.result.release', 'pharmacy.inventory.read',
  'pharmacy.stock.receive', 'pharmacy.dispense', 'finance.invoice.read',
  'finance.invoice.create', 'finance.payment.record', 'finance.receipt.issue',
  'finance.adjustment.request', 'finance.report.read', 'audit.read',
  'patient.share.approve', 'patient.share.revoke', 'notification.read',
  'patient.portal.profile.read', 'patient.portal.appointment.read',
  'patient.portal.history.read', 'patient.portal.lab-results.read',
  'patient.portal.prescriptions.read', 'patient.portal.invoice.read',
]

const rolePermissions = {
  super_admin: [
    'view_dashboard', 'manage_users', 'manage_hospitals', 'register_hospitals',
    'view_activity_logs', 'view_reports', 'hospital.create', 'hospital.read',
    'hospital.update', 'hospital.status.manage', 'hospital.settings.manage',
    'staff.read', 'staff.create', 'staff.manage', 'department.read', 'department.manage',
    'audit.read', 'patient.share.approve', 'patient.share.revoke',
  ],
  hospital_manager: [
    'view_dashboard', 'manage_users', 'view_reports', 'staff.read', 'staff.create',
    'staff.manage', 'department.read', 'department.manage', 'appointment.read',
    'view_activity_logs', 'notification.read',
  ],
  receptionist: [
    'view_dashboard', 'manage_patients', 'register_patients', 'manage_appointments',
    'patient.search', 'patient.register', 'patient.demographics.read',
    'patient.demographics.update', 'patient.registration.read', 'appointment.read',
    'appointment.create', 'appointment.update', 'visit.create', 'notification.read',
  ],
  doctor: [
    'view_dashboard', 'manage_appointments', 'manage_clinical_records',
    'appointment.read', 'visit.create', 'clinical.note.read', 'clinical.note.write',
    'clinical.diagnosis.write', 'triage.write', 'lab.result.read',
  ],
  pharmacist: [
    'view_dashboard', 'manage_pharmacy', 'pharmacy.inventory.read',
    'pharmacy.stock.receive', 'pharmacy.dispense', 'notification.read',
  ],
  lab_technician: [
    'view_dashboard', 'manage_lab_orders', 'lab.request.read', 'lab.specimen.manage',
    'lab.result.enter', 'lab.result.validate', 'lab.result.release', 'notification.read',
  ],
  accountant: [
    'view_dashboard', 'manage_billing', 'view_reports', 'finance.invoice.read',
    'finance.invoice.create', 'finance.payment.record', 'finance.receipt.issue',
    'finance.adjustment.request', 'finance.report.read',
  ],
  patient: [
    'view_dashboard', 'notification.read', 'patient.portal.profile.read',
    'patient.portal.appointment.read', 'patient.portal.history.read',
    'patient.portal.lab-results.read', 'patient.portal.prescriptions.read',
    'patient.portal.invoice.read',
  ],
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: databaseName,
  charset: 'utf8mb4',
})

try {
  await connection.beginTransaction()

  for (const [name, description, scope] of roles) {
    await connection.execute(
      'INSERT INTO roles (name, description, scope, is_active) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE description = VALUES(description), scope = VALUES(scope), is_active = 1',
      [name, description, scope],
    )
  }

  for (const name of permissionNames) {
    const [resourceName, actionName] = name.includes('.') ? name.split('.', 2) : [name.split('_')[1] || 'system', name.split('_')[0]]
    await connection.execute(
      'INSERT INTO permissions (name, description, resource_name, action_name) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE resource_name = VALUES(resource_name), action_name = VALUES(action_name)',
      [name, name, resourceName, actionName],
    )
  }

  for (const [roleName, assignedPermissions] of Object.entries(rolePermissions)) {
    const [[role]] = await connection.execute('SELECT id FROM roles WHERE name = ?', [roleName])
    for (const permissionName of assignedPermissions) {
      const [[permission]] = await connection.execute('SELECT id FROM permissions WHERE name = ?', [permissionName])
      await connection.execute(
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [role.id, permission.id],
      )
    }
  }

  await connection.execute(
    `INSERT INTO hospitals (code, name, status, address_line1, province, district, country_code)
     VALUES ('DEMO-001', 'City General Hospital', 'active', 'KG 12 St', 'Kigali City', 'Gasabo', 'RW')
     ON DUPLICATE KEY UPDATE name = VALUES(name)`,
  )

  const [[adminRole]] = await connection.execute('SELECT id FROM roles WHERE name = ?', ['super_admin'])
  const [[existingAdmin]] = await connection.execute('SELECT id FROM users WHERE username = ?', ['admin'])
  let adminId = existingAdmin?.id

  if (!adminId) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    const [inserted] = await connection.execute(
      `INSERT INTO users (username, email, phone, full_name, password_hash, status, password_changed_at)
       VALUES (?, ?, ?, ?, ?, 'active', UTC_TIMESTAMP(3))`,
      ['admin', 'admin@hospital.local', '+250788000001', 'Super administrator', passwordHash],
    )
    adminId = inserted.insertId
  }

  await connection.execute(
    `INSERT INTO user_roles (user_id, role_id, hospital_id, status)
     VALUES (?, ?, NULL, 'active')
     ON DUPLICATE KEY UPDATE status = 'active', ends_at = NULL`,
    [adminId, adminRole.id],
  )

  await connection.commit()
  console.log(`Seeded reference roles and bootstrap account in ${databaseName}.`)
} catch (error) {
  await connection.rollback()
  console.error(error.message)
  process.exitCode = 1
} finally {
  await connection.end()
}