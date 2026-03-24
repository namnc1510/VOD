const app = require('./app');
const config = require('./config/env');
const { connectToDatabase, disconnectFromDatabase } = require('./config/db');
const logger = require('./utils/logger');

let isShuttingDown = false;
let server;

async function startServer() {
  await connectToDatabase(config.mongoUri, {
    maxPoolSize: config.mongoMaxPoolSize,
    serverSelectionTimeoutMS: config.mongoServerSelectionTimeoutMs,
    socketTimeoutMS: config.mongoSocketTimeoutMs,
  });

  server = app.listen(config.port, () => {
    logger.info('server_started', {
      port: config.port,
      env: config.env
    });
  });
}

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.warn('server_shutdown_requested', { signal });

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }

  await disconnectFromDatabase();
  process.exit(0);
}

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((error) => {
    logger.error('server_shutdown_failed', {
      signal: 'SIGINT',
      error: logger.serializeError(error)
    });
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((error) => {
    logger.error('server_shutdown_failed', {
      signal: 'SIGTERM',
      error: logger.serializeError(error)
    });
    process.exit(1);
  });
});

startServer().catch((error) => {
  logger.error('server_startup_failed', {
    error: logger.serializeError(error)
  });
  process.exit(1);
});
