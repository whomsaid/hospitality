import { Router } from 'express';
import { query } from '../config/database.js';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/medicines', requireAuth, authorize(['manage_pharmacy']), async (req, res) => {
  const rows = await query(`SELECT * FROM medicines ORDER BY name ASC LIMIT 50`);
  return res.json({ success: true, message: 'Medicines loaded', data: rows });
});

router.post('/medicines', requireAuth, authorize(['manage_pharmacy']), async (req, res) => {
  const { name, genericName, strength, dosageForm, unitOfMeasure } = req.body || {};

  if (!name) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ field: 'medicine', message: 'Medicine name is required' }] });
  }

  const result = await query(
    `INSERT INTO medicines (name, generic_name, strength, dosage_form, unit_of_measure, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
    [name, genericName || null, strength || null, dosageForm || null, unitOfMeasure || null],
  );

  return res.status(201).json({ success: true, message: 'Medicine created', data: { id: result.insertId, name } });
});

router.get('/inventory/movements', requireAuth, authorize(['manage_pharmacy']), async (req, res) => {
  const rows = await query(`SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 50`);
  return res.json({ success: true, message: 'Inventory movements loaded', data: rows });
});

export default router;
