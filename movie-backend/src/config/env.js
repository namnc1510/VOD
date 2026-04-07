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

function isLocalUrl(value) {
  return /:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(String(value || ''));
}

const defaultOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // vben admin dev port
  'http://localhost:5666',
  'http://127.0.0.1:5666',
  // Vercel deployment domains
  'https://vod-ten.vercel.app',
  'https://vod-qwqk.vercel.app',
];

const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: parseNumber(process.env.PORT, 3001),
  mongoUri: process.env.MONGO_URI || (process.env.NODE_ENV === 'production' ? '' : 'mongodb://127.0.0.1:27017/The-Movie'),
  mongoMaxPoolSize: parseNumber(process.env.MONGO_MAX_POOL_SIZE, 20),
  mongoServerSelectionTimeoutMs: parseNumber(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10_000),
  mongoSocketTimeoutMs: parseNumber(process.env.MONGO_SOCKET_TIMEOUT_MS, 45_000),
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-keep-it-local'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-refresh-secret-keep-it-local'),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
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
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || 'movie-uploads',

  // VNPAY Payment Gateway
  vnpTmnCode: process.env.VNP_TMNCODE || 'VNBTS001', // Example Sandbox TmnCode
  vnpHashSecret: process.env.VNP_HASHSECRET || 'SECRET_GOES_HERE',
  vnpUrl: process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnpReturnUrl: process.env.VNP_RETURNURL || 'http://localhost:3001/api/v1/payment/vnpay-return',
  vnpIpnUrl: process.env.VNP_IPNURL || 'http://localhost:3001/api/v1/payment/vnpay-ipn',
  frontendPaymentSuccessUrl: process.env.FRONTEND_PAYMENT_SUCCESS_URL || 'http://localhost:5173/payment/success',
  frontendPaymentErrorUrl: process.env.FRONTEND_PAYMENT_ERROR_URL || 'http://localhost:5173/payment/error',
});

if (config.env === 'production') {
  if (!config.mongoUri) {
    console.error('\x1b[31m[ERROR] MONGO_URI is not defined in production environment!\x1b[0m');
  }
  if (!config.jwtSecret || config.jwtSecret === 'dev-secret-keep-it-local') {
    console.error('\x1b[31m[ERROR] JWT_SECRET is not defined or using insecure default in production!\x1b[0m');
  }
  if (!config.jwtRefreshSecret || config.jwtRefreshSecret === 'dev-refresh-secret-keep-it-local') {
    console.error('\x1b[31m[ERROR] JWT_REFRESH_SECRET is not defined or using insecure default in production!\x1b[0m');
  }
  
  if (!config.mongoUri || !config.jwtSecret || config.jwtSecret === 'dev-secret-keep-it-local' || !config.jwtRefreshSecret || config.jwtRefreshSecret === 'dev-refresh-secret-keep-it-local') {
    console.error('\x1b[33m[TIP] Please set MONGO_URI, JWT_SECRET and JWT_REFRESH_SECRET in your dashboard (Render/Vercel/etc.)\x1b[0m');
    // In production, we should ideally exit if critical secrets are missing
    // process.exit(1); 
  }

  const paymentEnvIssues = [];

  if (!config.vnpTmnCode || config.vnpTmnCode === 'VNBTS001') {
    paymentEnvIssues.push('VNP_TMNCODE');
  }
  if (!config.vnpHashSecret || config.vnpHashSecret === 'SECRET_GOES_HERE') {
    paymentEnvIssues.push('VNP_HASHSECRET');
  }
  if (!config.vnpReturnUrl || isLocalUrl(config.vnpReturnUrl)) {
    paymentEnvIssues.push('VNP_RETURNURL');
  }
  if (!config.frontendPaymentSuccessUrl || isLocalUrl(config.frontendPaymentSuccessUrl)) {
    paymentEnvIssues.push('FRONTEND_PAYMENT_SUCCESS_URL');
  }
  if (!config.frontendPaymentErrorUrl || isLocalUrl(config.frontendPaymentErrorUrl)) {
    paymentEnvIssues.push('FRONTEND_PAYMENT_ERROR_URL');
  }

  if (paymentEnvIssues.length > 0) {
    console.error(`\x1b[31m[ERROR] Missing or invalid VNPAY env vars in production: ${paymentEnvIssues.join(', ')}\x1b[0m`);
    console.error('\x1b[33m[TIP] Set the VNPAY callback URLs to your deployed backend/frontend domains instead of localhost.\x1b[0m');
  }
}

module.exports = config;
