const config = require('../config/env');
const { errorResponse } = require('../utils/api-response');
const logger = require('../utils/logger');

function normalizeError(error) {
  if (error.message === 'Not allowed by CORS') {
    return {
      statusCode: 403,
      message: 'CORS origin denied'
    };
  }

  if (error.name === 'MongoServerError' && error.code === 11000) {
    return {
      statusCode: 409,
      message: 'Duplicate value',
      details: error.keyValue
    };
  }

  if (error.name === 'ValidationError') {
    return {
      statusCode: 400,
      message: 'Validation failed',
      details: Object.values(error.errors).map((item) => ({
        field: item.path,
        message: item.message
      }))
    };
  }

  if (error.name === 'HttpError') {
    return {
      statusCode: error.statusCode || 400,
      message: error.message,
      details: error.details
    };
  }

  return {
    statusCode: error.statusCode || error.status || 500,
    message: error.message || 'Internal server error'
  };
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const normalized = normalizeError(error);
  const debugDetails = normalized.details || (config.env === 'development' ? { stack: error.stack } : undefined);

  if (normalized.statusCode >= 500) {
    logger.error('unhandled_error', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      error: logger.serializeError(error)
    });
  }

  const responseDetails =
    debugDetails === undefined
      ? { requestId: req.id }
      : Array.isArray(debugDetails)
      ? { requestId: req.id, issues: debugDetails }
      : { requestId: req.id, ...debugDetails };

  return res.status(normalized.statusCode).json(errorResponse(normalized.message, responseDetails));
}

module.exports = errorHandler;
