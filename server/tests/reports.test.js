import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Reports routes', () => {
  it('returns dashboard metrics for authorized reporting users', async () => {
    const agent = request.agent(app);

    await agent.post('/api/auth/login').send({ username: 'admin', password: 'Admin@123' });

    const response = await agent.get('/api/reports/dashboard');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('totalRegisteredPatients');
  });
});
