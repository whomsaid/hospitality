import { Router } from 'express';
import { query } from '../config/database.js';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.get('/reports/dashboard', requireAuth, authorize(['view_reports']), async (req, res) => {
  const totalPatients = await query('SELECT COUNT(*) AS total FROM patients');
  const todayAppointments = await query('SELECT COUNT(*) AS total FROM appointments WHERE appointment_date = CURDATE()');
  const activeAdmissions = await query('SELECT COUNT(*) AS total FROM admissions WHERE status = "admitted"');

  return res.json({
    success: true,
    message: 'Dashboard report loaded',
    data: {
      totalRegisteredPatients: Number(totalPatients[0]?.total || 0),
      appointmentsToday: Number(todayAppointments[0]?.total || 0),
      activeAdmissions: Number(activeAdmissions[0]?.total || 0),
    },
  });
});

router.get('/reports/appointments', requireAuth, authorize(['view_reports']), async (req, res) => {
  const rows = await query(`SELECT status, COUNT(*) AS total FROM appointments GROUP BY status ORDER BY status ASC`);
  return res.json({ success: true, message: 'Appointment report loaded', data: rows });
});

export default router;
