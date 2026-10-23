import { Router } from 'express';
import { query } from '../config/database.js';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/notifications', requireAuth, authorize(['view_dashboard']), async (req, res) => {
  const rows = await query(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20`);
  return res.json({ success: true, message: 'Notifications loaded', data: rows });
});

router.post('/notifications', requireAuth, authorize(['view_dashboard']), async (req, res) => {
  const { recipientId, type, message } = req.body || {};

  if (!recipientId || !type || !message) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ field: 'notification', message: 'Recipient, type and message are required' }] });
  }

  const result = await query(
    `INSERT INTO notifications (recipient_id, type, message, is_read) VALUES (?, ?, ?, 0)`,
    [recipientId, type, message],
  );

  return res.status(201).json({ success: true, message: 'Notification created', data: { id: result.insertId, recipientId, type } });
});

export default router;
