import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

const mockAuthenticateUser = vi.fn();
const mockChangeUserPassword = vi.fn();

vi.mock('../src/services/authService.js', () => ({
  authenticateUser: mockAuthenticateUser,
  changeUserPassword: mockChangeUserPassword,
}));

describe('Authentication flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns a CSRF token and allows a valid login session', async () => {
    mockAuthenticateUser.mockResolvedValue({
      id: 1,
      username: 'admin',
      email: 'admin@hospital.local',
      roleName: 'super_admin',
      permissions: ['view_dashboard', 'manage_users'],
    });

    const agent = request.agent(app);

    const csrfResponse = await agent.get('/api/auth/csrf');
    expect(csrfResponse.status).toBe(200);
    expect(csrfResponse.body.data.csrfToken).toBeTruthy();

    const loginResponse = await agent.post('/api/auth/login').send({
      username: 'admin',
      password: 'Admin@123',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.user.username).toBe('admin');
    expect(loginResponse.body.data.csrfToken).toBeTruthy();
  });

  it('rejects unauthenticated access to protected routes', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Authentication required');
  });

  it('destroys the authenticated session on logout', async () => {
    mockAuthenticateUser.mockResolvedValue({
      id: 1,
      username: 'admin',
      email: 'admin@hospital.local',
      roleName: 'super_admin',
      permissions: ['view_dashboard'],
    });

    const agent = request.agent(app);
    const loginResponse = await agent.post('/api/auth/login').send({ username: 'admin', password: 'Admin@123' });
    const logoutResponse = await agent
      .post('/api/auth/logout')
      .set('X-CSRF-Token', loginResponse.body.data.csrfToken);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);

    const currentUserResponse = await agent.get('/api/auth/me');
    expect(currentUserResponse.status).toBe(401);
    expect(currentUserResponse.body.message).toBe('Authentication required');
  });

  it('blocks protected resource access when the user lacks required permissions', async () => {
    mockAuthenticateUser.mockResolvedValue({
      id: 7,
      username: 'receptionist',
      email: 'receptionist@hospital.local',
      roleName: 'receptionist',
      permissions: ['manage_patients'],
    });

    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ username: 'receptionist', password: 'Secret123' });

    const response = await agent.get('/api/users').set(
      'X-CSRF-Token',
      agent.jar.getCookie('shms.sid') ? 'ignored' : 'token',
    );

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Permission denied');
  });

  it('lets an authenticated user change their password with valid credentials', async () => {
    mockAuthenticateUser.mockResolvedValue({
      id: 10,
      username: 'doctor',
      email: 'doctor@hospital.local',
      roleName: 'doctor',
      permissions: ['manage_clinical_records'],
    });
    mockChangeUserPassword.mockResolvedValue(true);

    const agent = request.agent(app);
    const loginResponse = await agent.post('/api/auth/login').send({ username: 'doctor', password: 'Doctor@123' });

    const response = await agent
      .post('/api/auth/change-password')
      .set('X-CSRF-Token', loginResponse.body.data.csrfToken)
      .send({ currentPassword: 'Doctor@123', newPassword: 'NewDoctor@456' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Password changed successfully');
  });
});
