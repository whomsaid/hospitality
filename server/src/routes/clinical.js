import { Router } from 'express';
import { requireAuth } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { createVisit, createVitalSigns, addDiagnosis, addClinicalNote, addTreatmentPlan } from '../services/clinicalService.js';

const router = Router();

router.post('/visits', requireAuth, authorize(['manage_clinical_records']), async (req, res) => {
  try {
    const visit = await createVisit(req.body || {});
    return res.status(201).json({ success: true, message: 'Visit created successfully', data: visit });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ field: 'visit', message: error.message }] });
  }
});

router.get('/visits/:id', requireAuth, authorize(['manage_clinical_records']), async (req, res) => {
  return res.json({ success: true, message: 'Visit loaded', data: { id: Number(req.params.id) } });
});

router.post('/visits/:id/vitals', requireAuth, authorize(['manage_clinical_records']), async (req, res) => {
  try {
    const vitalSigns = await createVitalSigns(Number(req.params.id), req.body || {});
    return res.status(201).json({ success: true, message: 'Vital signs recorded', data: vitalSigns });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ field: 'vitals', message: error.message }] });
  }
});

router.post('/visits/:id/diagnoses', requireAuth, authorize(['manage_clinical_records']), async (req, res) => {
  try {
    const diagnosis = await addDiagnosis(Number(req.params.id), req.body || {});
    return res.status(201).json({ success: true, message: 'Diagnosis recorded', data: diagnosis });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ field: 'diagnosis', message: error.message }] });
  }
});

router.post('/visits/:id/notes', requireAuth, authorize(['manage_clinical_records']), async (req, res) => {
  try {
    const note = await addClinicalNote(Number(req.params.id), req.body || {});
    return res.status(201).json({ success: true, message: 'Clinical note added', data: note });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ field: 'notes', message: error.message }] });
  }
});

router.post('/visits/:id/treatment-plans', requireAuth, authorize(['manage_clinical_records']), async (req, res) => {
  try {
    const plan = await addTreatmentPlan(Number(req.params.id), req.body || {});
    return res.status(201).json({ success: true, message: 'Treatment plan created', data: plan });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: [{ field: 'plan', message: error.message }] });
  }
});

export default router;
