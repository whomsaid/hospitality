import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Notifications routes', () => {
  it('returns notifications for logged-in users', async () => {
    const agent = request.agent(app);

    await agent.post('/api/auth/login').send({ username: 'admin', password: 'Admin@123' });

    const response = await agent.get('/api/notifications');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
