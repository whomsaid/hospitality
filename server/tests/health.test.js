import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Health endpoint', () => {
  it('returns server status and database status in a standard JSON response', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('status');
    expect(response.body.data).toHaveProperty('timestamp');
  });
});
