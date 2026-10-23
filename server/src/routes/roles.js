import { Router } from 'express';
import { query } from '../config/database.js';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/roles', requireAuth, authorize(['view_dashboard']), async (req, res) => {
  const rows = await query(`SELECT * FROM roles ORDER BY name ASC`);

  return res.json({
    success: true,
    message: 'Roles loaded',
    data: rows,
  });
});

router.get('/permissions', requireAuth, authorize(['view_dashboard']), async (req, res) => {
  const rows = await query(`SELECT * FROM permissions ORDER BY name ASC`);

  return res.json({
    success: true,
    message: 'Permissions loaded',
    data: rows,
  });
});

export default router;
