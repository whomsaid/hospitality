export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
export const DEFAULT_PASSWORD = 'system@123'
let csrfToken = null

export const rolePermissions = {
  super_admin: [
    'view_dashboard',
    'manage_users',
    'manage_hospitals',
    'register_hospitals',
    'manage_patients',
    'register_patients',
    'manage_appointments',
    'manage_clinical_records',
    'manage_lab_orders',
    'manage_pharmacy',
    'manage_billing',
    'manage_wards',
    'view_activity_logs',
    'view_reports',
  ],
  doctor: ['view_dashboard', 'manage_patients', 'manage_appointments', 'manage_clinical_records'],
  receptionist: ['view_dashboard', 'manage_patients', 'register_patients', 'manage_appointments'],
  pharmacist: ['view_dashboard', 'manage_pharmacy'],
  lab_technician: ['view_dashboard', 'manage_lab_orders'],
  accountant: ['view_dashboard', 'manage_billing', 'view_reports'],
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers['X-CSRF-Token'] = csrfToken
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })

  const payload = await response.json().catch(() => ({ success: false, message: 'Request failed', data: null }))

  if (!response.ok || payload.success === false) {
    const message = payload?.message || 'Request failed'
    throw new Error(message)
  }

  if (payload.data?.csrfToken) {
    csrfToken = payload.data.csrfToken
  }

  return payload
}

export function normalizeUser(user) {
  return {
    ...user,
    roleName: user.roleName || user.role_name || user.role,
    displayName: user.displayName || user.name || user.username,
    permissions: user.permissions || rolePermissions[user.roleName || user.role] || [],
  }
}

export function loginUser({ identifier, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: identifier,
      email: identifier,
      phone: identifier,
      password,
    }),
  })
}

export function getCurrentUser() {
  return apiRequest('/auth/me')
}

export async function logoutUser() {
  const response = await apiRequest('/auth/logout', { method: 'POST' })
  csrfToken = null
  return response
}

export function fetchUsers() {
  return apiRequest('/users')
}

export function createUser(payload) {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteUser(userId) {
  return apiRequest(`/users/${userId}`, { method: 'DELETE' })
}

export function fetchHospitals() {
  return apiRequest('/hospitals')
}

export function createHospital(payload) {
  return apiRequest('/hospitals', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteHospital(hospitalId) {
  return apiRequest(`/hospitals/${hospitalId}`, { method: 'DELETE' })
}

export function fetchPatients() {
  return apiRequest('/patients')
}

export function createPatient(payload) {
  return apiRequest('/patients', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deletePatient(patientId) {
  return apiRequest(`/patients/${patientId}`, { method: 'DELETE' })
}

export function fetchActivityLogs() {
  return apiRequest('/activity')
}

export function createActivityLog(payload) {
  return apiRequest('/activity', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
