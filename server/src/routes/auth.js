import { randomUUID } from 'crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticateUser, changeUserPassword } from '../services/authService.js';
import { requireAuth } from '../middleware/authenticate.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = Router();

router.get('/csrf', (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomUUID();
  }

  return res.json({
    success: true,
    message: 'CSRF token issued',
    data: { csrfToken: req.session.csrfToken },
  });
});

router.post('/login', async (req, res) => {
  const { username, email, phone, password } = req.body || {};
  const identifier = username || email || phone;

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'credentials', message: 'Username/email/phone and password are required' }],
    });
  }

  const user = await authenticateUser(identifier, password);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
      errors: [{ field: 'credentials', message: 'The provided login details are incorrect' }],
    });
  }

  req.session.regenerate((regenerateError) => {
    if (regenerateError) {
      return res.status(500).json({
        success: false,
        message: 'Session could not be created',
        errors: [{ field: 'session', message: 'There was a problem creating the user session' }],
      });
    }

    req.session.user = user;
    req.session.csrfToken = randomUUID();

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roleName: user.roleName,
          permissions: user.permissions,
        },
        csrfToken: req.session.csrfToken,
      },
    });
  });
});

router.post('/logout', requireAuth, csrfProtection, (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Logout failed',
        errors: [{ field: 'session', message: 'Unable to end the current session' }],
      });
    }

    res.clearCookie(process.env.SESSION_NAME || 'shms.sid');

    return res.json({
      success: true,
      message: 'Logged out successfully',
      data: null,
    });
  });
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({
    success: true,
    message: 'Current user loaded',
    data: {
      user: req.session.user,
      csrfToken: req.session.csrfToken,
    },
  });
});

router.post('/change-password', requireAuth, csrfProtection, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'password', message: 'Current and new password are required' }],
    });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'newPassword', message: 'New password must be at least 8 characters long' }],
    });
  }

  const changed = await changeUserPassword(req.session.user.id, currentPassword, newPassword);

  if (!changed) {
    return res.status(401).json({
      success: false,
      message: 'Password change failed',
      errors: [{ field: 'password', message: 'The current password is incorrect' }],
    });
  }

  req.session.csrfToken = randomUUID();

  return res.json({
    success: true,
    message: 'Password changed successfully',
    data: { csrfToken: req.session.csrfToken },
  });
});

export default router;
