import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Laboratory routes', () => {
  it('creates a lab order for an authorized user', async () => {
    const agent = request.agent(app);

    await agent.post('/api/auth/login').send({ username: 'admin', password: 'Admin@123' });

    const response = await agent.post('/api/lab/orders').send({
      patientId: 1,
      orderNumber: 'LAB-001',
      testType: 'CBC',
      priority: 'routine',
      clinicalNotes: 'Review for routine assessment',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
