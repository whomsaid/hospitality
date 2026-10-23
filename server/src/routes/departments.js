import { Router } from 'express';
import { query } from '../config/database.js';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { listDepartments, createDepartment } from '../services/departmentService.js';

const router = Router();

router.get('/departments', requireAuth, authorize(['view_dashboard']), async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;

  const data = await listDepartments({ search, page, limit });

  return res.json({
    success: true,
    message: 'Departments loaded',
    data: data.rows,
    meta: {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      total: data.total,
    },
  });
});

router.post('/departments', requireAuth, authorize(['manage_users']), async (req, res) => {
  try {
    const department = await createDepartment(req.body || {});

    return res.status(201).json({
      success: true,
      message: 'Department created',
      data: department,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'department', message: error.message }],
    });
  }
});

router.get('/departments/:id', requireAuth, authorize(['view_dashboard']), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'id', message: 'Department id must be a valid integer' }],
    });
  }

  const rows = await query(`SELECT * FROM departments WHERE id = ? LIMIT 1`, [id]);

  if (!rows[0]) {
    return res.status(404).json({
      success: false,
      message: 'Department not found',
      errors: [{ field: 'department', message: 'The requested department does not exist' }],
    });
  }

  return res.json({
    success: true,
    message: 'Department loaded',
    data: rows[0],
  });
});

export default router;
