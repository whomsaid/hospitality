import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Appointment scheduling', () => {
  it('creates an appointment when the doctor slot is available', async () => {
    const agent = request.agent(app);

    const loginResponse = await agent.post('/api/auth/login').send({
      username: 'admin',
      password: 'Admin@123',
    });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .post('/api/appointments')
      .set('X-CSRF-Token', loginResponse.body.data.csrfToken)
      .send({
        patientId: 1,
        doctorId: 1,
        departmentId: 1,
        appointmentDate: '2026-10-22',
        startTime: '09:00:00',
        endTime: '09:30:00',
        reason: 'Routine checkup',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('returns the appointment list for authorized users', async () => {
    const agent = request.agent(app);

    await agent.post('/api/auth/login').send({
      username: 'admin',
      password: 'Admin@123',
    });

    const response = await agent.get('/api/appointments');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
