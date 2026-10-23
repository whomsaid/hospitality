import { Router } from 'express';
import { query } from '../config/database.js';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requireHospitalScope } from '../middleware/hospitalScope.js';
import { archivePatient, createPatient, findPatientsByNationalId, findPotentialDuplicatePatients, getPatientById, listPatients } from '../services/patientService.js';

const router = Router();

router.get('/patients', requireAuth, authorize(['manage_patients']), requireHospitalScope, async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;

  const result = await listPatients({ search, page, limit, hospitalId: req.hospitalId });

  return res.json({
    success: true,
    message: 'Patients loaded',
    data: result.rows,
    meta: {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      total: result.total,
    },
  });
});

router.get('/patients/search', requireAuth, authorize(['patient.search', 'manage_patients']), requireHospitalScope, async (req, res) => {
  const { patientNumber = '', phone = '', nationalId = '' } = req.query;
  const searchValue = String(patientNumber || phone || nationalId).trim();
  if (!searchValue) {
    return res.status(400).json({ success: false, message: 'Search identifier required', errors: [{ field: 'identifier', message: 'Enter a patient number, phone, or approved identity number' }] });
  }

  if (nationalId) {
    try {
      const matches = await findPatientsByNationalId(nationalId, req.hospitalId)
      return res.json({ success: true, message: 'Patient matches loaded', data: matches })
    } catch (error) {
      return res.status(503).json({ success: false, message: 'Identifier search unavailable', errors: [{ field: 'identifier', message: error.message }] })
    }
  }

  const rows = await listPatients({ search: searchValue, page: 1, limit: 10, hospitalId: req.hospitalId });
  return res.json({ success: true, message: 'Patient matches loaded', data: rows.rows })
})

router.post('/patients', requireAuth, authorize(['manage_patients']), requireHospitalScope, async (req, res) => {
  try {
    const fullName = String(req.body?.name || '').trim().split(/\s+/).filter(Boolean)
    const duplicateCheck = await findPotentialDuplicatePatients({
      firstName: req.body?.firstName || fullName[0],
      lastName: req.body?.lastName || fullName.slice(1).join(' '),
      dateOfBirth: req.body?.dateOfBirth,
      phone: req.body?.phone,
      hospitalId: req.hospitalId,
    });

    const identifierMatches = req.body?.nationalId
      ? await findPatientsByNationalId(req.body.nationalId, req.hospitalId)
      : []
    if (identifierMatches.length) {
      return res.status(409).json({
        success: false,
        message: 'Patient already registered at this hospital',
        data: identifierMatches,
        errors: [{ field: 'nationalId', message: 'Use the existing patient record and create a new visit instead of registering another profile' }],
      })
    }

    const patient = await createPatient(req.body || {}, { hospitalId: req.hospitalId, userId: req.session.user.id });

    return res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      data: {
        ...patient,
        potentialDuplicates: duplicateCheck.slice(0, 5),
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'patient', message: error.message }],
    });
  }
});

router.get('/patients/:id', requireAuth, authorize(['manage_patients']), requireHospitalScope, async (req, res) => {
  const patient = await getPatientById(Number(req.params.id), req.hospitalId);

  if (!patient) {
    return res.status(404).json({
      success: false,
      message: 'Patient not found',
      errors: [{ field: 'patient', message: 'The requested patient does not exist' }],
    });
  }

  return res.json({
    success: true,
    message: 'Patient loaded',
    data: patient,
  });
});

router.patch('/patients/:id', requireAuth, authorize(['manage_patients']), requireHospitalScope, async (req, res) => {
  const patientId = Number(req.params.id);
  const patient = await getPatientById(patientId, req.hospitalId)
  if (!patient) {
    return res.status(404).json({ success: false, message: 'Patient not found', errors: [{ field: 'patient', message: 'The patient is unavailable in this hospital' }] })
  }
  const nameParts = String(req.body?.name || '').trim().split(/\s+/).filter(Boolean)
  const firstName = req.body?.firstName ?? (nameParts.length ? nameParts[0] : undefined)
  const lastName = req.body?.lastName ?? (nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined)
  const nextFirstName = firstName || patient.first_name
  const nextLastName = lastName || patient.last_name
  const dateOfBirth = req.body?.dateOfBirth ?? patient.date_of_birth
  const sexAtBirth = req.body?.gender ?? patient.sex_at_birth

  if (nextFirstName === patient.first_name && nextLastName === patient.last_name && dateOfBirth === patient.date_of_birth && sexAtBirth === patient.sex_at_birth) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'patient', message: 'At least one supported demographic field must change' }],
    });
  }

  await query(
    `UPDATE patients SET first_name = ?, last_name = ?, date_of_birth = ?, sex_at_birth = ?, updated_at = UTC_TIMESTAMP(3)
     WHERE id = ?`,
    [nextFirstName, nextLastName, dateOfBirth || null, sexAtBirth || 'not_recorded', patientId],
  )

  const updatedPatient = await getPatientById(patientId, req.hospitalId)

  return res.json({
    success: true,
    message: 'Patient updated successfully',
    data: updatedPatient,
  });
});

router.delete('/patients/:id', requireAuth, authorize(['manage_patients']), requireHospitalScope, async (req, res) => {
  const patientId = Number(req.params.id);

  if (!Number.isFinite(patientId)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'patient', message: 'A valid patient id is required' }],
    });
  }

  const archived = await archivePatient(patientId, req.hospitalId)
  if (!archived) {
    return res.status(404).json({ success: false, message: 'Patient not found', errors: [{ field: 'patient', message: 'The patient is unavailable in this hospital' }] })
  }

  return res.json({
    success: true,
    message: 'Patient deleted successfully',
    data: null,
  });
});

export default router;
