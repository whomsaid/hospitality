import { Router } from 'express';
import { query } from '../config/database.js';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/activity', requireAuth, authorize(['view_activity_logs', 'view_dashboard']), async (req, res) => {
  const rows = await query(`
    SELECT id, user_id, action, resource_type AS location, details, created_at
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT 50
  `);

  const transformed = rows.map((row) => ({
    id: row.id,
    time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    user: row.user_id ? `user-${row.user_id}` : 'system',
    action: row.action,
    location: row.location,
    details: row.details || '',
    created_at: row.created_at,
  }));

  return res.json({
    success: true,
    message: 'Activity log loaded',
    data: transformed,
  });
});

router.post('/activity', requireAuth, authorize(['view_activity_logs', 'view_dashboard']), async (req, res) => {
  const { action, location, details, actor } = req.body || {};

  if (!action) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'activity', message: 'Action is required' }],
    });
  }

  const result = await query(
    `INSERT INTO audit_logs (user_id, action, resource_type, details, created_at) VALUES (?, ?, ?, ?, NOW())`,
    [req.session?.user?.id || null, action, location || 'System', JSON.stringify({ details, actor })],
  );

  return res.status(201).json({
    success: true,
    message: 'Activity created successfully',
    data: { id: result.insertId, action, location, details, actor },
  });
});

export default router;
