import { Router } from 'express';
import { query } from '../config/database.js';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/wards', requireAuth, authorize(['manage_wards']), async (req, res) => {
  const rows = await query(`SELECT * FROM wards ORDER BY name ASC LIMIT 50`);
  return res.json({ success: true, message: 'Wards loaded', data: rows });
});

router.post('/wards', requireAuth, authorize(['manage_wards']), async (req, res) => {
  const { name, code } = req.body || {};

  if (!name) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ field: 'ward', message: 'Ward name is required' }] });
  }

  const result = await query(`INSERT INTO wards (name, code, is_active) VALUES (?, ?, 1)`, [name, code || null]);
  return res.status(201).json({ success: true, message: 'Ward created', data: { id: result.insertId, name } });
});

router.get('/beds', requireAuth, authorize(['manage_wards']), async (req, res) => {
  const rows = await query(`SELECT * FROM beds ORDER BY number ASC LIMIT 50`);
  return res.json({ success: true, message: 'Beds loaded', data: rows });
});

router.post('/admissions', requireAuth, authorize(['manage_wards']), async (req, res) => {
  const { patientId, wardId, bedId, reason, admittedBy } = req.body || {};

  if (!patientId || !wardId || !bedId) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ field: 'admission', message: 'Patient, ward and bed are required' }] });
  }

  const result = await query(
    `INSERT INTO admissions (patient_id, ward_id, bed_id, reason, admitted_by, status) VALUES (?, ?, ?, ?, ?, 'admitted')`,
    [patientId, wardId, bedId, reason || null, admittedBy || null],
  );

  return res.status(201).json({ success: true, message: 'Admission recorded', data: { id: result.insertId, patientId, wardId, bedId } });
});

export default router;
