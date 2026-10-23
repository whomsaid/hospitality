import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { query, withTransaction } from '../config/database.js'
import { requireAuth } from '../middleware/authenticate.js'
import { authorize } from '../middleware/authorize.js'

const router = Router()

const displayStatus = (status) => ({ active: 'Operational', inactive: 'Pending', suspended: 'Review' }[status] || status)

router.get('/hospitals', requireAuth, authorize(['manage_hospitals', 'register_hospitals', 'view_dashboard']), async (req, res) => {
  const isPlatformUser = req.session.user.roleScope === 'platform'
  const rows = await query(
    `
      SELECT h.id, h.code, h.name, h.status, h.address_line1 AS address,
             h.province, h.district, h.sector, h.cell, h.village,
             JSON_UNQUOTE(hs.setting_value) AS manager
      FROM hospitals h
      LEFT JOIN hospital_settings hs
        ON hs.hospital_id = h.id AND hs.setting_key = 'manager_display_name'
      WHERE (? = 1 OR h.id = ?)
      ORDER BY h.created_at DESC
    `,
    [isPlatformUser ? 1 : 0, req.session.user.hospitalId],
  )

  return res.json({
    success: true,
    message: 'Hospitals loaded',
    data: rows.map((row) => ({ ...row, status: displayStatus(row.status) })),
  })
})

router.post('/hospitals', requireAuth, authorize(['manage_hospitals', 'register_hospitals']), async (req, res) => {
  const { name, address, manager, status, province, district, sector, cell, village, phone, email } = req.body || {}
  if (!name || !manager) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'hospital', message: 'Hospital name and manager name are required' }],
    })
  }

  const statusValue = ({ operational: 'active', pending: 'inactive', review: 'suspended' })[String(status || 'Operational').toLowerCase()] || 'active'
  const code = `HSP-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`
  const created = await withTransaction(async (runQuery) => {
    const inserted = await runQuery(
      `INSERT INTO hospitals (code, name, status, phone, email, address_line1, province, district, sector, cell, village)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, name.trim(), statusValue, phone || null, email || null, address || null, province || null, district || null, sector || null, cell || null, village || null],
    )
    await runQuery(
      'INSERT INTO hospital_settings (hospital_id, setting_key, setting_value) VALUES (?, ?, ?)',
      [inserted.insertId, 'manager_display_name', JSON.stringify(manager.trim())],
    )
    return inserted.insertId
  })

  return res.status(201).json({
    success: true,
    message: 'Hospital registered successfully',
    data: { id: created, code, name: name.trim(), address, manager: manager.trim(), status: displayStatus(statusValue), province, district, sector, cell, village },
  })
})

router.delete('/hospitals/:id', requireAuth, authorize(['manage_hospitals']), async (req, res) => {
  const hospitalId = Number(req.params.id)
  if (!Number.isSafeInteger(hospitalId) || hospitalId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid hospital ID', errors: [{ field: 'id', message: 'A positive hospital ID is required' }] })
  }

  const result = await query(
    `UPDATE hospitals SET status = 'inactive', updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND status <> 'inactive'`,
    [hospitalId],
  )
  if (!result.affectedRows) {
    return res.status(404).json({ success: false, message: 'Hospital not found', errors: [{ field: 'hospital', message: 'The hospital is unavailable' }] })
  }

  return res.json({ success: true, message: 'Hospital deactivated successfully', data: null })
})

export default router