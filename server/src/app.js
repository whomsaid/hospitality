import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import rolesRoutes from './routes/roles.js';
import usersRoutes from './routes/users.js';
import departmentsRoutes from './routes/departments.js';
import patientsRoutes from './routes/patients.js';
import staffRoutes from './routes/staff.js';
import appointmentsRoutes from './routes/appointments.js';
import clinicalRoutes from './routes/clinical.js';
import labRoutes from './routes/lab.js';
import pharmacyRoutes from './routes/pharmacy.js';
import inpatientRoutes from './routes/inpatient.js';
import billingRoutes from './routes/billing.js';
import reportsRoutes from './routes/reports.js';
import notificationsRoutes from './routes/notifications.js';
import hospitalsRoutes from './routes/hospitals.js';
import activityRoutes from './routes/activity.js';
import sessionMiddleware from './config/session.js';

dotenv.config({ path: '../.env' });

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(sessionMiddleware);

app.get('/', (req, res) => {
  res.redirect(302, process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173');
});

app.use('/api/auth', authRoutes);
app.use('/api', rolesRoutes);
app.use('/api', usersRoutes);
app.use('/api', hospitalsRoutes);
app.use('/api', activityRoutes);
app.use('/api', departmentsRoutes);
app.use('/api', patientsRoutes);
app.use('/api', staffRoutes);
app.use('/api', appointmentsRoutes);
app.use('/api', clinicalRoutes);
app.use('/api', pharmacyRoutes);
app.use('/api', inpatientRoutes);
app.use('/api', billingRoutes);
app.use('/api', reportsRoutes);
app.use('/api', notificationsRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/health', healthRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    errors: [{ field: 'route', message: 'The requested API route does not exist' }],
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || 'An unexpected server error occurred',
    errors: [{ field: 'server', message: 'Please contact the system administrator' }],
  });
});

export default app;
