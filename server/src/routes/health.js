import { Router } from 'express';
import { testConnection } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const dbReady = await testConnection();

    res.json({
      success: true,
      message: 'Hospital system health check passed',
      data: {
        status: 'ok',
        database: dbReady ? 'connected' : 'unavailable',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      errors: [{ field: 'server', message: 'The server is not ready' }],
    });
  }
});

export default router;
