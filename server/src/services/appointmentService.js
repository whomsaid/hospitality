import { query } from '../config/database.js';

export async function findAppointmentConflict({ doctorId, appointmentDate, startTime, endTime, excludeId = null }) {
  const rows = await query(
    `
      SELECT a.id, a.status, a.appointment_date, a.start_time, a.end_time
      FROM appointments a
      WHERE a.staff_id = ?
        AND a.appointment_date = ?
        AND a.status IN ('scheduled', 'confirmed', 'checked_in', 'in_progress')
        AND (? IS NULL OR a.id != ?)
        AND (
          (a.start_time < ? AND a.end_time > ?) OR
          (a.start_time < ? AND a.end_time > ?) OR
          (a.start_time >= ? AND a.start_time < ?) OR
          (a.start_time <= ? AND a.end_time > ?)
        )
      ORDER BY a.start_time ASC
      LIMIT 1
    `,
    [
      doctorId,
      appointmentDate,
      excludeId,
      excludeId,
      endTime,
      startTime,
      endTime,
      startTime,
      startTime,
      endTime,
      endTime,
      startTime,
      startTime,
    ],
  );

  return rows[0] || null;
}

export async function createAppointment(data) {
  const patientId = Number(data.patientId); 
  const doctorId = Number(data.doctorId);
  const date = data.appointmentDate;

  if (!patientId || !doctorId || !date || !data.startTime || !data.endTime) {
    throw new Error('Patient, doctor, date, start time and end time are required');
  }

  const patientRows = await query('SELECT id FROM patients WHERE id = ? LIMIT 1', [patientId]);
  if (!patientRows[0]) {
    throw new Error('Patient does not exist');
  }

  const doctorRows = await query('SELECT id, is_active FROM staff WHERE id = ? LIMIT 1', [doctorId]);
  if (!doctorRows[0] || Number(doctorRows[0].is_active) !== 1) {
    throw new Error('Doctor must be active and eligible for the appointment');
  }

  const conflict = await findAppointmentConflict({
    doctorId,
    appointmentDate: date,
    startTime: data.startTime,
    endTime: data.endTime,
  });

  if (conflict) {
    throw new Error(`Doctor already has an appointment scheduled for ${conflict.appointment_date} ${conflict.start_time}`);
  }

  const result = await query(
    `
      INSERT INTO appointments (
        patient_id, staff_id, department_id, appointment_date, start_time, end_time,
        status, reason, notes
      ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `,
    [patientId, doctorId, data.departmentId || null, date, data.startTime, data.endTime, data.reason || null, data.notes || null],
  );

  return { id: result.insertId, status: 'scheduled' };
}

export async function listAppointments({ departmentId, doctorId, status, page = 1, limit = 20 }) {
  const pageNumber = Number(page) > 0 ? Number(page) : 1;
  const pageSize = Number(limit) > 0 ? Number(limit) : 20;
  const offset = (pageNumber - 1) * pageSize;

  const filters = [];
  const values = [];

  if (departmentId) {
    filters.push('a.department_id = ?');
    values.push(Number(departmentId));
  }

  if (doctorId) {
    filters.push('a.staff_id = ?');
    values.push(Number(doctorId));
  }

  if (status) {
    filters.push('a.status = ?');
    values.push(status);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = await query(
    `
      SELECT a.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
             s.first_name AS doctor_first_name, s.last_name AS doctor_last_name
      FROM appointments a
      LEFT JOIN patients p ON p.id = a.patient_id
      LEFT JOIN staff s ON s.id = a.staff_id
      ${whereClause}
      ORDER BY a.appointment_date DESC, a.start_time DESC
      LIMIT ? OFFSET ?
    `,
    [...values, pageSize, offset],
  );

  const totalResult = await query(
    `SELECT COUNT(*) AS total FROM appointments a ${whereClause}`,
    values,
  );

  return {
    rows,
    total: Number(totalResult[0]?.total || 0),
  };
}

export async function updateAppointmentStatus(id, nextStatus) {
  const allowedTransitions = {
    scheduled: ['confirmed', 'cancelled', 'completed', 'no_show'],
    confirmed: ['checked_in', 'cancelled', 'completed', 'no_show'],
    checked_in: ['in_progress', 'completed', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  const rows = await query('SELECT status FROM appointments WHERE id = ? LIMIT 1', [id]);
  const currentStatus = rows[0]?.status;

  if (!currentStatus) {
    throw new Error('Appointment not found');
  }

  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
    throw new Error(`Cannot change appointment status from ${currentStatus} to ${nextStatus}`);
  }

  await query('UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [nextStatus, id]);

  return { id, status: nextStatus };
}

export async function getAppointmentById(id) {
  const rows = await query('SELECT * FROM appointments WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}
