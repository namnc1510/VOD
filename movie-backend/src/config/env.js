const dotenv = require('dotenv');

dotenv.config();

function parseNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOrigins(value, fallback) {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // vben admin dev port
  'http://localhost:5666',
  'http://127.0.0.1:5666',
];

const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: parseNumber(process.env.PORT, 3001),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/The-Movie',
  mongoMaxPoolSize: parseNumber(process.env.MONGO_MAX_POOL_SIZE, 20),
  mongoServerSelectionTimeoutMs: parseNumber(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10_000),
  mongoSocketTimeoutMs: parseNumber(process.env.MONGO_SOCKET_TIMEOUT_MS, 45_000),
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS, defaultOrigins),
  jsonLimit: process.env.JSON_LIMIT || '100kb',
  // Upload limits (multipart/form-data). Used by /api/v1/upload.
  // Increase if you need to upload large mp4 files.
  uploadMaxFileSizeMb: parseNumber(process.env.UPLOAD_MAX_FILE_SIZE_MB, 5120), // 5GB
  rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: parseNumber(process.env.RATE_LIMIT_MAX, 100),
  // Dev default: keep admin UIs responsive when clicking a lot.
  rateLimitMaxDev: parseNumber(process.env.RATE_LIMIT_MAX_DEV, 10000),

  // Cloudinary (optional). If not set, /api/v1/upload stores files locally under data/uploads.
  cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || 'movie-uploads'
});

module.exports = config;
