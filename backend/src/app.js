
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import config from './config/index.js';
import errorHandler, { notFound } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import classRoutes from './routes/classes.js';
import academicYearRoutes from './routes/academicYears.js';
import studentRoutes from './routes/students.js';
import feeRoutes from './routes/fees.js';
import paymentRoutes from './routes/payments.js';
import inventoryRoutes from './routes/inventory.js';
import uniformRoutes from './routes/uniforms.js';
import reportRoutes from './routes/reports.js';
import notificationRoutes from './routes/notifications.js';
import auditRoutes from './routes/auditLogs.js';
import settingRoutes from './routes/settings.js';
import dashboardRoutes from './routes/dashboard.js';
import teachingRoutes from './routes/teaching.js';

const app = express();

app.disable('x-powered-by');

app.use(helmet());

// CORS: allow only explicitly configured frontend origins.
app.use(
  cors({
    origin(origin, callback) {
      // Requests without Origin include health checks and server-to-server calls.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');

      if (config.corsOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: '5mb' }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// API rate limiting
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests, please try again later',
    },
  })
);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    time: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/uniforms', uniformRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/teaching', teachingRoutes);

// Error handlers must come after the routes.
app.use(notFound);
app.use(errorHandler);

export default app;
