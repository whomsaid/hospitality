import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Billing routes', () => {
  it('creates an invoice for an authorized billing user', async () => {
    const agent = request.agent(app);

    await agent.post('/api/auth/login').send({ username: 'admin', password: 'Admin@123' });

    const response = await agent.post('/api/invoices').send({
      patientId: 1,
      totalAmount: 250.00,
      currency: 'USD',
      status: 'draft',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
