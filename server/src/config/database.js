import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '../.env' });

const isMockDatabaseMode = () => process.env.NODE_ENV === 'test' || process.env.USE_MOCK_DB === 'true' || !process.env.DB_HOST;

const mockState = {
  roles: [
    { id: 1, name: 'super_admin', description: 'System-wide administrator' },
    { id: 2, name: 'doctor', description: 'Clinical physician' },
    { id: 3, name: 'receptionist', description: 'Front desk and appointments' },
    { id: 4, name: 'pharmacist', description: 'Medication dispensing' },
    { id: 5, name: 'lab_technician', description: 'Laboratory operations' },
    { id: 6, name: 'accountant', description: 'Billing and finance' },
  ],
  permissions: [
    { id: 1, name: 'view_dashboard' },
    { id: 2, name: 'manage_users' },
    { id: 3, name: 'manage_patients' },
    { id: 4, name: 'manage_appointments' },
    { id: 5, name: 'manage_clinical_records' },
    { id: 6, name: 'manage_lab_orders' },
    { id: 7, name: 'manage_pharmacy' },
    { id: 8, name: 'manage_billing' },
    { id: 9, name: 'manage_wards' },
    { id: 10, name: 'view_reports' },
    { id: 11, name: 'register_hospitals' },
    { id: 12, name: 'manage_hospitals' },
    { id: 13, name: 'register_patients' },
    { id: 14, name: 'view_activity_logs' },
  ],
  users: [
    { id: 1, full_name: 'Super administrator', username: 'admin', email: 'admin@hospital.local', phone: '+250788000001', password_hash: bcrypt.hashSync('system@123', 10), role_id: 1, is_active: 1, last_login_at: null, failed_login_attempts: 0, created_at: new Date().toISOString() },
    { id: 2, full_name: 'Dr. Amina Niyonsenga', username: 'doctor', email: 'doctor@hospital.local', phone: '+250788000002', password_hash: bcrypt.hashSync('system@123', 10), role_id: 2, is_active: 1, last_login_at: null, failed_login_attempts: 0, created_at: new Date().toISOString() },
    { id: 3, full_name: 'Reception Desk', username: 'receptionist', email: 'receptionist@hospital.local', phone: '+250788000003', password_hash: bcrypt.hashSync('system@123', 10), role_id: 3, is_active: 1, last_login_at: null, failed_login_attempts: 0, created_at: new Date().toISOString() },
    { id: 4, full_name: 'Pharmacy Lead', username: 'pharmacist', email: 'pharmacist@hospital.local', phone: '+250788000004', password_hash: bcrypt.hashSync('system@123', 10), role_id: 4, is_active: 1, last_login_at: null, failed_login_attempts: 0, created_at: new Date().toISOString() },
    { id: 5, full_name: 'Lab Supervisor', username: 'lab', email: 'lab@hospital.local', phone: '+250788000005', password_hash: bcrypt.hashSync('system@123', 10), role_id: 5, is_active: 1, last_login_at: null, failed_login_attempts: 0, created_at: new Date().toISOString() },
    { id: 6, full_name: 'Billing Manager', username: 'accountant', email: 'accountant@hospital.local', phone: '+250788000006', password_hash: bcrypt.hashSync('system@123', 10), role_id: 6, is_active: 1, last_login_at: null, failed_login_attempts: 0, created_at: new Date().toISOString() },
  ],
  patients: [
    { id: 1, patient_number: 'PAT-000001', first_name: 'Alice', last_name: 'Nguyen', gender: 'female', date_of_birth: '1990-01-15', phone: '0912345678', email: 'alice@example.com', address_line1: '12 Main Street', city: 'Kigali', country: 'Rwanda', emergency_contact_name: 'John Nguyen', emergency_contact_phone: '+250700000001', registration_date: new Date().toISOString(), created_at: new Date().toISOString() },
  ],
  hospitals: [
    { id: 1, name: 'City General Hospital', address: 'Kigali, KG 12 St', manager: 'Dr. Amina Niyonsenga', status: 'Operational', created_at: new Date().toISOString() },
    { id: 2, name: 'Lakeview Community Care', address: 'Huye, Main Road', manager: 'Dr. Joseph Mutesa', status: 'Operational', created_at: new Date().toISOString() },
  ],
  audit_logs: [
    { id: 1, user_id: 1, action: 'Registered new hospital', resource_type: 'Global Admin', details: JSON.stringify({}), created_at: new Date().toISOString() },
    { id: 2, user_id: 3, action: 'Registered patient', resource_type: 'Front Desk', details: JSON.stringify({ nationalId: '119876543218766' }), created_at: new Date().toISOString() },
  ],
  appointments: [],
  visits: [],
  departments: [],
  staff: [],
  medicines: [],
  stock_movements: [],
  lab_orders: [],
  lab_results: [],
  notifications: [],
  invoices: [],
  payment_records: [],
  admissions: [],
  wards: [],
  beds: [],
  vital_signs: [],
  role_permissions: [
    { role_id: 1, permission_id: 1 }, { role_id: 1, permission_id: 2 }, { role_id: 1, permission_id: 3 }, { role_id: 1, permission_id: 4 }, { role_id: 1, permission_id: 5 }, { role_id: 1, permission_id: 6 }, { role_id: 1, permission_id: 7 }, { role_id: 1, permission_id: 8 }, { role_id: 1, permission_id: 9 }, { role_id: 1, permission_id: 10 }, { role_id: 1, permission_id: 11 }, { role_id: 1, permission_id: 12 }, { role_id: 1, permission_id: 13 }, { role_id: 1, permission_id: 14 },
    { role_id: 2, permission_id: 5 }, { role_id: 2, permission_id: 10 },
    { role_id: 3, permission_id: 3 }, { role_id: 3, permission_id: 4 }, { role_id: 3, permission_id: 13 },
    { role_id: 4, permission_id: 7 },
    { role_id: 5, permission_id: 6 },
    { role_id: 6, permission_id: 8 }, { role_id: 6, permission_id: 10 },
  ],
};

const normalizeSql = (sql) => sql.replace(/\s+/g, ' ').trim();

const toNumber = (value) => Number(value ?? 0);

const lastParam = (params = []) => params[params.length - 1];

const parseInsert = (sql) => {
  const match = sql.match(/INSERT\s+INTO\s+([A-Za-z_]+)\s*\(([^)]*)\)\s*VALUES\s*\((.*)\)\s*;?$/is);
  if (!match) return null;
  const [, tableName, columnsRaw, valuesRaw] = match;
  const columns = columnsRaw.split(',').map((item) => item.trim().replace(/`/g, '')).filter(Boolean);
  const values = valuesRaw.split(',').map((item) => item.trim()).filter((item) => item !== '');
  return { tableName, columns, values };
};

const parseAssignments = (sql) => {
  const match = sql.match(/UPDATE\s+[A-Za-z_]+\s+SET\s+(.+?)(?:\s+WHERE\s+.*)?$/is);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((assignment) => assignment.trim())
    .filter(Boolean);
};

const sanitizeValue = (value) => {
  if (value === undefined) return undefined;
  const raw = String(value).trim();
  if (raw === '' || raw === 'NULL' || raw === 'null') return null;
  if (raw === 'CURRENT_TIMESTAMP') return new Date().toISOString();
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    return raw.slice(1, -1);
  }
  return raw;
};

const makeId = (tableName) => {
  const rows = mockState[tableName] || [];
  return rows.reduce((max, row) => Math.max(max, Number(row.id || 0)), 0) + 1;
};

const setTable = (tableName, rows) => {
  mockState[tableName] = rows;
};

const getTable = (tableName) => mockState[tableName] || [];

const findUserByCredential = (identifier) => mockState.users.find((user) => user.username === identifier || user.email === identifier || user.phone === identifier);

const mockQuery = async (sql, params = []) => {
  const query = normalizeSql(sql);

  if (query.startsWith('SELECT 1 AS ok')) {
    return [{ ok: 1 }];
  }

  if (query.startsWith('SELECT * FROM roles ORDER BY name ASC')) {
    return mockState.roles;
  }

  if (query.startsWith('SELECT * FROM permissions ORDER BY name ASC')) {
    return mockState.permissions;
  }

  if (query.startsWith('SELECT u.*, r.name AS role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.username = ? OR u.email = ? OR u.phone = ? LIMIT 1')) {
    const user = findUserByCredential(params[0]);
    return user ? [{ ...user, role_name: mockState.roles.find((role) => role.id === user.role_id)?.name || null }] : [];
  }

  if (query.startsWith('SELECT DISTINCT p.name FROM users u LEFT JOIN roles r ON r.id = u.role_id LEFT JOIN role_permissions rp ON rp.role_id = r.id LEFT JOIN permissions p ON p.id = rp.permission_id WHERE u.id = ?')) {
    const userId = Number(params[0]);
    const user = mockState.users.find((entry) => Number(entry.id) === userId);
    if (!user) return [];
    const permissionIds = mockState.role_permissions
      .filter((entry) => Number(entry.role_id) === Number(user.role_id))
      .map((entry) => entry.permission_id);
    return mockState.permissions
      .filter((permission) => permissionIds.includes(Number(permission.id)))
      .map((permission) => ({ name: permission.name }));
  }

  if (query.startsWith('SELECT u.id, u.username, u.email, u.role_id, r.name AS role_name, u.is_active FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = ?')) {
    const user = mockState.users.find((entry) => Number(entry.id) === Number(params[0]));
    return user ? [{ id: user.id, username: user.username, email: user.email, role_id: user.role_id, role_name: mockState.roles.find((role) => role.id === user.role_id)?.name || null, is_active: user.is_active }] : [];
  }

  if (query.startsWith('SELECT password_hash FROM users WHERE id = ? LIMIT 1')) {
    const user = mockState.users.find((entry) => Number(entry.id) === Number(params[0]));
    return user ? [{ password_hash: user.password_hash }] : [];
  }

  if (query.startsWith('SELECT id FROM users WHERE username = ? OR email = ? OR phone = ? LIMIT 1')) {
    const user = findUserByCredential(params[0]);
    return user ? [{ id: user.id }] : [];
  }

  if (query.startsWith('SELECT id FROM roles WHERE name = ? LIMIT 1')) {
    const role = mockState.roles.find((entry) => entry.name === params[0]);
    return role ? [{ id: role.id }] : [];
  }

  if (query.startsWith('SELECT u.id, u.username, u.email, u.phone, u.password_hash, u.is_active, u.last_login_at, u.created_at, r.name AS role_name FROM users u LEFT JOIN roles r ON r.id = u.role_id ORDER BY u.created_at DESC')) {
    return mockState.users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      password_hash: user.password_hash,
      is_active: user.is_active,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      role_name: mockState.roles.find((role) => role.id === user.role_id)?.name || null,
    }));
  }

  if (query.startsWith('SELECT * FROM users WHERE id = ? LIMIT 1')) {
    const user = mockState.users.find((entry) => Number(entry.id) === Number(params[0]));
    return user ? [user] : [];
  }

  if (query.startsWith('SELECT * FROM hospitals ORDER BY created_at DESC')) {
    return mockState.hospitals;
  }

  if (query.startsWith('SELECT id, name, address, manager, status, created_at FROM hospitals ORDER BY created_at DESC')) {
    return mockState.hospitals;
  }

  if (query.startsWith('SELECT * FROM hospitals WHERE id = ? LIMIT 1')) {
    const hospital = mockState.hospitals.find((entry) => Number(entry.id) === Number(params[0]));
    return hospital ? [hospital] : [];
  }

  if (query.startsWith('SELECT id, user_id, action, resource_type AS location, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 50')) {
    return mockState.audit_logs;
  }

  if (query.startsWith('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50')) {
    return mockState.audit_logs;
  }

  if (query.startsWith('SELECT * FROM audit_logs')) {
    return mockState.audit_logs;
  }

  if (query.startsWith('SELECT * FROM patients')) {
    const text = query.toLowerCase();
    const rows = [...mockState.patients];
    if (text.includes('count(*) as total')) {
      return [{ total: rows.length }];
    }
    if (text.includes('like')) {
      const search = String(params[0] || '').trim();
      const term = search ? search.toLowerCase() : '';
      return rows.filter((patient) => {
        const searchable = [patient.patient_number, patient.first_name, patient.last_name, patient.email, patient.phone].filter(Boolean).join(' ').toLowerCase();
        return !term || searchable.includes(term);
      });
    }
    return rows;
  }

  if (query.startsWith('SELECT COUNT(*) AS total FROM patients')) {
    return [{ total: mockState.patients.length }];
  }

  if (query.startsWith('SELECT * FROM patients WHERE id = ? LIMIT 1')) {
    const patient = mockState.patients.find((entry) => Number(entry.id) === Number(params[0]));
    return patient ? [patient] : [];
  }

  if (query.startsWith('SELECT id, patient_number, first_name, last_name, gender, date_of_birth, phone, email, registration_date, archived_at FROM patients')) {
    return mockState.patients;
  }

  if (query.startsWith('SELECT id, patient_number, first_name, last_name, date_of_birth, phone FROM patients')) {
    return mockState.patients.map((patient) => ({
      id: patient.id,
      patient_number: patient.patient_number,
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth,
      phone: patient.phone,
    }));
  }

  if (query.startsWith('INSERT INTO users')) {
    const parsed = parseInsert(query);
    if (!parsed) return { insertId: 0, affectedRows: 0 };
    const row = {};
    parsed.columns.forEach((column, index) => {
      row[column] = sanitizeValue(parsed.values[index] ?? params[index] ?? null);
    });
    row.id = row.id ?? makeId('users');
    row.full_name = row.full_name || row.username || 'New User';
    row.password_hash = row.password_hash || bcrypt.hashSync('system@123', 10);
    row.created_at = row.created_at || new Date().toISOString();
    mockState.users.push(row);
    return { insertId: row.id, affectedRows: 1 };
  }

  if (query.startsWith('INSERT INTO hospitals')) {
    const parsed = parseInsert(query);
    if (!parsed) return { insertId: 0, affectedRows: 0 };
    const row = {};
    parsed.columns.forEach((column, index) => {
      row[column] = sanitizeValue(parsed.values[index] ?? params[index] ?? null);
    });
    row.id = row.id ?? makeId('hospitals');
    row.created_at = row.created_at || new Date().toISOString();
    mockState.hospitals.push(row);
    return { insertId: row.id, affectedRows: 1 };
  }

  if (query.startsWith('INSERT INTO audit_logs')) {
    const parsed = parseInsert(query);
    if (!parsed) return { insertId: 0, affectedRows: 0 };
    const row = {};
    parsed.columns.forEach((column, index) => {
      row[column] = sanitizeValue(parsed.values[index] ?? params[index] ?? null);
    });
    row.id = row.id ?? makeId('audit_logs');
    row.created_at = row.created_at || new Date().toISOString();
    mockState.audit_logs.push(row);
    return { insertId: row.id, affectedRows: 1 };
  }

  if (query.startsWith('INSERT INTO patients')) {
    const parsed = parseInsert(query);
    if (!parsed) return { insertId: 0, affectedRows: 0 };
    const row = {};
    parsed.columns.forEach((column, index) => {
      row[column] = sanitizeValue(parsed.values[index] ?? params[index] ?? null);
    });
    row.id = row.id ?? makeId('patients');
    row.patient_number = row.patient_number || `PAT-${String(row.id).padStart(6, '0')}`;
    row.created_at = row.created_at || new Date().toISOString();
    mockState.patients.push(row);
    return { insertId: row.id, affectedRows: 1 };
  }

  if (query.startsWith('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')) {
    const user = mockState.users.find((entry) => Number(entry.id) === Number(params[1]));
    if (!user) return { affectedRows: 0 };
    user.password_hash = params[0];
    return { affectedRows: 1 };
  }

  if (query.startsWith('UPDATE patients SET')) {
    const assignments = parseAssignments(query);
    const patientId = Number(lastParam(params));
    const patient = mockState.patients.find((entry) => Number(entry.id) === patientId);
    if (!patient) return { affectedRows: 0 };
    assignments.forEach((assignment, index) => {
      const [column] = assignment.split('=');
      if (column) {
        patient[column.trim()] = sanitizeValue(params[index]);
      }
    });
    return { affectedRows: 1 };
  }

  if (query.startsWith('DELETE FROM users WHERE id = ?')) {
    const targetId = Number(params[0]);
    const before = mockState.users.length;
    mockState.users = mockState.users.filter((entry) => Number(entry.id) !== targetId);
    return { affectedRows: before - mockState.users.length };
  }

  if (query.startsWith('DELETE FROM hospitals WHERE id = ?')) {
    const targetId = Number(params[0]);
    const before = mockState.hospitals.length;
    mockState.hospitals = mockState.hospitals.filter((entry) => Number(entry.id) !== targetId);
    return { affectedRows: before - mockState.hospitals.length };
  }

  if (query.startsWith('DELETE FROM patients WHERE id = ?')) {
    const targetId = Number(params[0]);
    const before = mockState.patients.length;
    mockState.patients = mockState.patients.filter((entry) => Number(entry.id) !== targetId);
    return { affectedRows: before - mockState.patients.length };
  }

  if (query.startsWith('SELECT * FROM users')) {
    return mockState.users;
  }

  return [];
};

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_hospital',
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  waitForConnections: true,
  queueLimit: 0,
  charset: 'utf8mb4',
  multipleStatements: false,
});

export const query = async (sql, params = []) => {
  if (isMockDatabaseMode()) {
    return mockQuery(sql, params);
  }

  const [rows] = await pool.execute(sql, params);
  return rows;
};

export const withTransaction = async (operation) => {
  if (isMockDatabaseMode()) {
    return operation(query);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const transactionQuery = async (sql, params = []) => {
      const [rows] = await connection.execute(sql, params);
      return rows;
    };
    const result = await operation(transactionQuery);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const testConnection = async () => {
  if (isMockDatabaseMode()) {
    return true;
  }

  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    return rows[0]?.ok === 1;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
};

export default pool;
