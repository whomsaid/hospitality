import { Router } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { createAppointment, getAppointmentById, listAppointments, updateAppointmentStatus } from '../services/appointmentService.js';

const router = Router();

router.get('/appointments', requireAuth, authorize(['manage_appointments']), async (req, res) => {
  const { departmentId, doctorId, status, page, limit } = req.query;
  const result = await listAppointments({ departmentId, doctorId, status, page, limit });

  return res.json({
    success: true,
    message: 'Appointments loaded',
    data: result.rows,
    meta: {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      total: result.total,
    },
  });
});

router.post('/appointments', requireAuth, authorize(['manage_appointments']), async (req, res) => {
  try {
    const appointment = await createAppointment(req.body || {});
    return res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'appointment', message: error.message }],
    });
  }
});

router.get('/appointments/:id', requireAuth, authorize(['manage_appointments']), async (req, res) => {
  const appointment = await getAppointmentById(Number(req.params.id));

  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found',
      errors: [{ field: 'appointment', message: 'The requested appointment does not exist' }],
    });
  }

  return res.json({
    success: true,
    message: 'Appointment loaded',
    data: appointment,
  });
});

router.patch('/appointments/:id', requireAuth, authorize(['manage_appointments']), async (req, res) => {
  const appointment = await getAppointmentById(Number(req.params.id));
  if (!appointment) {
    return res.status(404).json({
      success: false,
      message: 'Appointment not found',
      errors: [{ field: 'appointment', message: 'The requested appointment does not exist' }],
    });
  }

  const updates = { status: req.body?.status };
  if (updates.status) {
    try {
      const result = await updateAppointmentStatus(Number(req.params.id), updates.status);
      return res.json({
        success: true,
        message: 'Appointment status updated',
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Status transition failed',
        errors: [{ field: 'status', message: error.message }],
      });
    }
  }

  return res.json({
    success: true,
    message: 'Appointment updated',
    data: appointment,
  });
});

export default router;
