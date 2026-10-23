import { Router } from 'express';
import { query } from '../config/database.js';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/invoices', requireAuth, authorize(['manage_billing']), async (req, res) => {
  const rows = await query(`SELECT * FROM invoices ORDER BY created_at DESC LIMIT 50`);
  return res.json({ success: true, message: 'Invoices loaded', data: rows });
});

router.post('/invoices', requireAuth, authorize(['manage_billing']), async (req, res) => {
  const { patientId, totalAmount, currency, status } = req.body || {};

  if (!patientId || !totalAmount) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ field: 'invoice', message: 'Patient and total amount are required' }] });
  }

  const result = await query(
    `INSERT INTO invoices (patient_id, total_amount, currency, status) VALUES (?, ?, ?, ?)` ,
    [patientId, totalAmount, currency || 'USD', status || 'draft'],
  );

  return res.status(201).json({ success: true, message: 'Invoice created', data: { id: result.insertId, patientId } });
});

router.post('/invoices/:id/payments', requireAuth, authorize(['manage_billing']), async (req, res) => {
  const { amount, paymentMethod, recordedBy } = req.body || {};
  const invoiceId = Number(req.params.id);

  if (!amount) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ field: 'payment', message: 'Payment amount is required' }] });
  }

  const result = await query(
    `INSERT INTO payment_records (invoice_id, amount, payment_method, recorded_by) VALUES (?, ?, ?, ?)`,
    [invoiceId, amount, paymentMethod || 'cash', recordedBy || null],
  );

  return res.status(201).json({ success: true, message: 'Payment recorded', data: { id: result.insertId, invoiceId } });
});

export default router;
