import { Router } from 'express';
import { query } from '../config/database.js';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/lab/orders', requireAuth, authorize(['manage_lab_orders']), async (req, res) => {
  const rows = await query(`SELECT * FROM lab_orders ORDER BY created_at DESC LIMIT 50`);
  return res.json({ success: true, message: 'Laboratory orders loaded', data: rows });
});

router.post('/lab/orders', requireAuth, authorize(['manage_lab_orders']), async (req, res) => {
  const { patientId, orderNumber, testType, priority, clinicalNotes } = req.body || {};

  if (!patientId || !orderNumber || !testType) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'lab', message: 'Patient, order number and test type are required' }],
    });
  }

  const result = await query(
    `INSERT INTO lab_orders (patient_id, order_number, test_type, priority, clinical_notes, status) VALUES (?, ?, ?, ?, ?, 'pending')`,
    [patientId, orderNumber, testType, priority || 'routine', clinicalNotes || null],
  );

  return res.status(201).json({ success: true, message: 'Lab order created', data: { id: result.insertId, orderNumber } });
});

router.post('/lab/orders/:id/results', requireAuth, authorize(['manage_lab_orders']), async (req, res) => {
  const labOrderId = Number(req.params.id);
  const { resultValue, unit, referenceRange, status } = req.body || {};

  const result = await query(
    `INSERT INTO lab_results (lab_order_id, result_value, unit, reference_range, status) VALUES (?, ?, ?, ?, ?)
    `,
    [labOrderId, resultValue || null, unit || null, referenceRange || null, status || 'finalized'],
  );

  return res.status(201).json({ success: true, message: 'Lab result recorded', data: { id: result.insertId, labOrderId } });
});

export default router;
