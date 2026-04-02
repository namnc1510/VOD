const cors = require('cors');
const express = require('express');
const path = require('path');

const config = require('./config/env');
const apiRoutes = require('./routes');
const healthRoutes = require('./routes/health.routes');
const errorHandler = require('./middlewares/error-handler');
const notFoundHandler = require('./middlewares/not-found');
const createRateLimiter = require('./middlewares/rate-limit');
const requestId = require('./middlewares/request-id');
const requestLogger = require('./middlewares/request-logger');
const securityHeaders = require('./middlewares/security-headers');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(requestId);
app.use(requestLogger);
app.use(securityHeaders);
app.use(
  createRateLimiter({
    windowMs: config.rateLimitWindowMs,
    max: config.env === 'development' ? config.rateLimitMaxDev : config.rateLimitMax
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const isVercel = origin && origin.endsWith('.vercel.app');
      
      if (config.env === 'development' || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin) || isVercel) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    }
  })
);
app.use(express.json({ limit: config.jsonLimit }));
app.use(express.urlencoded({ extended: false, limit: config.jsonLimit }));

// Serve uploaded files (POST /api/v1/upload returns URLs under this mount).
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

app.use('/health', healthRoutes);
app.use('/api/v1', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
