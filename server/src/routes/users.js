import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query, withTransaction } from '../config/database.js'
import { requireAuth } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'

const router = Router()

router.get('/users', requireAuth, authorize(['manage_users', 'view_dashboard']), async (req, res) => {
  const isPlatformUser = req.session.user.roleScope === 'platform'
  const rows = await query(
    `
      SELECT u.id, u.full_name AS name, u.username, u.email, u.phone, u.status AS account_status,
             r.name AS role, r.name AS role_name, ur.hospital_id, h.name AS hospital
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.status = 'active'
      JOIN roles r ON r.id = ur.role_id
      LEFT JOIN hospitals h ON h.id = ur.hospital_id
      WHERE (? = 1 OR ur.hospital_id = ?)
        AND ur.starts_at <= UTC_TIMESTAMP(3)
        AND (ur.ends_at IS NULL OR ur.ends_at > UTC_TIMESTAMP(3))
      ORDER BY u.created_at DESC
    `,
    [isPlatformUser ? 1 : 0, req.session.user.hospitalId],
  )

  return res.json({ success: true, message: 'Users loaded', data: rows })
})

router.post('/users', requireAuth, authorize(['manage_users']), async (req, res) => {
  const { username, email, phone, name, password, role = 'doctor', hospitalId, departmentId, jobTitle, patientId } = req.body || {}

  if (!username || !email || !phone || !name) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'user', message: 'Name, username, email, and phone are required' }],
    })
  }

  const roleRows = await query('SELECT id, scope FROM roles WHERE name = ? AND is_active = 1 LIMIT 1', [role])
  const roleRecord = roleRows[0]
  if (!roleRecord) {
    return res.status(400).json({ success: false, message: 'Invalid role', errors: [{ field: 'role', message: 'The selected role is unavailable' }] })
  }

  const actor = req.session.user
  const targetHospitalId = roleRecord.scope === 'platform' ? null : Number(actor.roleScope === 'platform' ? hospitalId : actor.hospitalId)
  if (roleRecord.scope === 'hospital' && (!targetHospitalId || (actor.roleScope !== 'platform' && targetHospitalId !== Number(actor.hospitalId)))) {
    return res.status(403).json({ success: false, message: 'Hospital access denied', errors: [{ field: 'hospitalId', message: 'Choose a hospital within your authorized scope' }] })
  }
  if (roleRecord.scope === 'platform' && actor.roleScope !== 'platform') {
    return res.status(403).json({ success: false, message: 'Permission denied', errors: [{ field: 'role', message: 'You cannot assign platform roles' }] })
  }
  const linkedPatientId = roleRecord.scope === 'patient' ? Number(patientId) : null
  if (roleRecord.scope === 'patient' && (!Number.isSafeInteger(linkedPatientId) || linkedPatientId <= 0)) {
    return res.status(400).json({ success: false, message: 'Patient link required', errors: [{ field: 'patientId', message: 'A verified patient record is required for a patient account' }] })
  }
  if (linkedPatientId) {
    const patientRows = await query('SELECT id FROM patients WHERE id = ? AND status = \'active\' LIMIT 1', [linkedPatientId])
    if (!patientRows.length) {
      return res.status(404).json({ success: false, message: 'Patient not found', errors: [{ field: 'patientId', message: 'The patient record is unavailable' }] })
    }
  }

  const duplicate = await query('SELECT id FROM users WHERE username = ? OR email = ? OR phone = ? LIMIT 1', [username, email, phone])
  if (duplicate.length) {
    return res.status(409).json({ success: false, message: 'Duplicate user', errors: [{ field: 'username', message: 'Username, email, or phone is already registered' }] })
  }

  const passwordHash = await bcrypt.hash(password || 'system@123', 12)
  const result = await withTransaction(async (runQuery) => {
    const inserted = await runQuery(
      `INSERT INTO users (username, email, phone, full_name, password_hash, status, password_changed_at)
       VALUES (?, ?, ?, ?, ?, 'active', UTC_TIMESTAMP(3))`,
      [username, email, phone, name, passwordHash],
    )
    const userId = inserted.insertId
    await runQuery(
      `INSERT INTO user_roles (user_id, role_id, hospital_id, assigned_by_user_id, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [userId, roleRecord.id, targetHospitalId, actor.id],
    )

    if (linkedPatientId) {
      await runQuery('INSERT INTO patient_user_accounts (patient_id, user_id) VALUES (?, ?)', [linkedPatientId, userId])
    }

    if (roleRecord.scope === 'hospital' && role !== 'patient') {
      const nameParts = String(name).trim().split(/\s+/)
      const firstName = nameParts.shift() || username
      const lastName = nameParts.join(' ') || firstName
      const employeeNumber = `EMP-${userId}`
      await runQuery(
        `INSERT INTO staff (hospital_id, user_id, department_id, employee_number, first_name, last_name, job_title, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [targetHospitalId, userId, departmentId || null, employeeNumber, firstName, lastName, jobTitle || role],
      )
    }
    return userId
  })

  return res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: { id: result, name, username, email, phone, role, hospitalId: targetHospitalId },
  })
})

router.delete('/users/:id', requireAuth, authorize(['manage_users']), async (req, res) => {
  const userId = Number(req.params.id)
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid user ID', errors: [{ field: 'id', message: 'A positive user ID is required' }] })
  }

  const actor = req.session.user
  const target = await query(
    `SELECT u.id, ur.hospital_id FROM users u JOIN user_roles ur ON ur.user_id = u.id
     WHERE u.id = ? AND ur.status = 'active' LIMIT 1`,
    [userId],
  )
  if (!target.length || (actor.roleScope !== 'platform' && Number(target[0].hospital_id) !== Number(actor.hospitalId))) {
    return res.status(404).json({ success: false, message: 'User not found', errors: [{ field: 'user', message: 'The user is unavailable in this scope' }] })
  }
  if (userId === Number(actor.id)) {
    return res.status(409).json({ success: false, message: 'Action not allowed', errors: [{ field: 'user', message: 'You cannot deactivate your own account' }] })
  }

  await withTransaction(async (runQuery) => {
    await runQuery(`UPDATE user_roles SET status = 'revoked', ends_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND status = 'active'`, [userId])
    await runQuery(`UPDATE users SET status = 'inactive', updated_at = UTC_TIMESTAMP(3) WHERE id = ?`, [userId])
  })

  return res.json({ success: true, message: 'User deactivated successfully', data: null })
})

export default router