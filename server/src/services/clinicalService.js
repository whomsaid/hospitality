import { query } from '../config/database.js';

export async function createVisit(data) {
  const { patientId, appointmentId, doctorId, chiefComplaint, historyNotes, allergies, status } = data || {};

  if (!patientId || !doctorId) {
    throw new Error('Patient and doctor are required');
  }

  const result = await query(
    `
      INSERT INTO visits (patient_id, appointment_id, doctor_id, chief_complaint, history_notes, allergies, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [patientId, appointmentId || null, doctorId, chiefComplaint || null, historyNotes || null, allergies || null, status || 'in_progress'],
  );

  return { id: result.insertId, patientId, doctorId, status: status || 'in_progress' };
}

export async function createVitalSigns(visitId, data) {
  const { recordedBy, bloodPressure, heartRate, respiratoryRate, temperature, oxygenSaturation, weight, height } = data || {};

  const result = await query(
    `
      INSERT INTO vital_signs (
        visit_id, recorded_by, blood_pressure, heart_rate, respiratory_rate,
        temperature, oxygen_saturation, weight_kg, height_cm, bmi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [visitId, recordedBy || null, bloodPressure || null, heartRate || null, respiratoryRate || null, temperature || null, oxygenSaturation || null, weight || null, height || null, calculateBMI(weight, height)],
  );

  return { id: result.insertId, visitId };
}

export async function addDiagnosis(visitId, data) {
  const { recordedBy, diagnosisCode, diagnosisName, description, status } = data || {};

  if (!diagnosisName) {
    throw new Error('Diagnosis name is required');
  }

  const result = await query(
    `INSERT INTO diagnoses (visit_id, recorded_by, diagnosis_code, diagnosis_name, description, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [visitId, recordedBy || null, diagnosisCode || null, diagnosisName, description || null, status || 'active'],
  );

  return { id: result.insertId, visitId, diagnosisName };
}

export async function addClinicalNote(visitId, data) {
  const { recordedBy, noteType, noteText } = data || {};

  if (!noteText) {
    throw new Error('Clinical note text is required');
  }

  const result = await query(
    `INSERT INTO clinical_notes (visit_id, recorded_by, note_type, note_text) VALUES (?, ?, ?, ?)`,
    [visitId, recordedBy || null, noteType || 'general', noteText],
  );

  return { id: result.insertId, visitId };
}

export async function addTreatmentPlan(visitId, data) {
  const { recordedBy, planSummary, followUpDate } = data || {};

  if (!planSummary) {
    throw new Error('Treatment plan is required');
  }

  const result = await query(
    `INSERT INTO treatment_plans (visit_id, recorded_by, plan_summary, follow_up_date) VALUES (?, ?, ?, ?)`,
    [visitId, recordedBy || null, planSummary, followUpDate || null],
  );

  return { id: result.insertId, visitId };
}

function calculateBMI(weight, height) {
  if (!weight || !height) return null;
  const heightInMeters = Number(height) / 100;
  if (heightInMeters <= 0) return null;
  return Number((Number(weight) / (heightInMeters * heightInMeters)).toFixed(2));
}
