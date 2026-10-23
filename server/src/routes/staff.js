import { Router } from 'express';
import { query } from '../config/database.js';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/staff', requireAuth, authorize(['view_dashboard']), async (req, res) => {
  const rows = await query(`
    SELECT s.id, s.employee_number, s.first_name, s.last_name,
           s.job_title, s.specialty, s.is_active, d.name AS department_name
    FROM staff s
    LEFT JOIN departments d ON d.id = s.department_id
    ORDER BY s.first_name ASC, s.last_name ASC
  `);

  return res.json({
    success: true,
    message: 'Staff loaded',
    data: rows,
  });
});

router.post('/staff', requireAuth, authorize(['manage_users']), async (req, res) => {
  const { employeeNumber, firstName, lastName, departmentId, jobTitle, specialty } = req.body || {};

  if (!employeeNumber || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'staff', message: 'Employee number, first name and last name are required' }],
    });
  }

  const result = await query(
    `
      INSERT INTO staff (employee_number, first_name, last_name, department_id, job_title, specialty, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `,
    [employeeNumber, firstName, lastName, departmentId || null, jobTitle || null, specialty || null],
  );

  return res.status(201).json({
    success: true,
    message: 'Staff member created',
    data: { id: result.insertId, employeeNumber, firstName, lastName },
  });
});

router.get('/staff/:id', requireAuth, authorize(['view_dashboard']), async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query(`SELECT * FROM staff WHERE id = ? LIMIT 1`, [id]);

  if (!rows[0]) {
    return res.status(404).json({
      success: false,
      message: 'Staff member not found',
      errors: [{ field: 'staff', message: 'The requested staff record does not exist' }],
    });
  }

  return res.json({
    success: true,
    message: 'Staff loaded',
    data: rows[0],
  });
});

export default router;
