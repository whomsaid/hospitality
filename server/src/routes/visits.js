import { Router } from 'express';
import { query } from '../config/database.js';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

router.post('/visits', requireAuth, authorize(['manage_clinical_records']), async (req, res) => {
  const { patientId, appointmentId, doctorId, chiefComplaint, historyNotes, allergies, status } = req.body || {};

  if (!patientId || !doctorId) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'visit', message: 'Patient and doctor are required' }],
    });
  }

  const result = await query(
    `
      INSERT INTO visits (patient_id, appointment_id, doctor_id, chief_complaint, history_notes, allergies, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [patientId, appointmentId || null, doctorId, chiefComplaint || null, historyNotes || null, allergies || null, status || 'in_progress'],
  );

  return res.status(201).json({
    success: true,
    message: 'Visit created successfully',
    data: { id: result.insertId, patientId, doctorId, status: status || 'in_progress' },
  });
});

router.get('/visits/:id', requireAuth, authorize(['manage_clinical_records']), async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query('SELECT * FROM visits WHERE id = ? LIMIT 1', [id]);

  if (!rows[0]) {
    return res.status(404).json({
      success: false,
      message: 'Visit not found',
      errors: [{ field: 'visit', message: 'The requested visit does not exist' }],
    });
  }

  return res.json({
    success: true,
    message: 'Visit loaded',
    data: rows[0],
  });
});

router.post('/visits/:id/vitals', requireAuth, authorize(['manage_clinical_records']), async (req, res) => {
  const visitId = Number(req.params.id);
  const { bloodPressure, heartRate, respiratoryRate, temperature, oxygenSaturation, weight, height } = req.body || {};

  const result = await query(
    `
      INSERT INTO vital_signs (
        visit_id, blood_pressure, heart_rate, respiratory_rate, temperature,
        oxygen_saturation, weight_kg, height_cm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [visitId, bloodPressure || null, heartRate || null, respiratoryRate || null, temperature || null, oxygenSaturation || null, weight || null, height || null],
  );

  return res.status(201).json({
    success: true,
    message: 'Vital signs recorded',
    data: { id: result.insertId, visitId },
  });
});

export default router;
