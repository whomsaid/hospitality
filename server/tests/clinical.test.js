import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Clinical workflow', () => {
  it('creates a visit for an authorized doctor', async () => {
    const agent = request.agent(app);

    await agent.post('/api/auth/login').send({ username: 'admin', password: 'Admin@123' });

    const response = await agent.post('/api/visits').send({
      patientId: 1,
      appointmentId: 1,
      doctorId: 1,
      chiefComplaint: 'Fever and fatigue',
      historyNotes: 'Symptoms for three days',
      allergies: 'None reported',
      status: 'in_progress',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('records vital signs for the created visit', async () => {
    const agent = request.agent(app);

    await agent.post('/api/auth/login').send({ username: 'admin', password: 'Admin@123' });

    const response = await agent.post('/api/visits/1/vitals').send({
      recordedBy: 1,
      bloodPressure: '120/80',
      heartRate: '72',
      respiratoryRate: '18',
      temperature: '36.8',
      oxygenSaturation: '98%',
      weight: 70,
      height: 170,
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
