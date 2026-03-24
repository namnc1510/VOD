const mongoose = require('mongoose');
const logger = require('../utils/logger');

const READY_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

let listenersAttached = false;

function attachConnectionListeners() {
  if (listenersAttached) {
    return;
  }

  mongoose.connection.on('connected', () => {
    logger.info('mongodb_connected', {
      host: mongoose.connection.host,
      database: mongoose.connection.name
    });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('mongodb_disconnected');
  });

  mongoose.connection.on('error', (error) => {
    logger.error('mongodb_error', {
      error: logger.serializeError(error)
    });
  });

  listenersAttached = true;
}

async function connectToDatabase(uri) {
  attachConnectionListeners();
  const options = arguments.length > 1 ? arguments[1] : undefined;
  await mongoose.connect(uri, options);
}

async function disconnectFromDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

function getDatabaseHealth() {
  const readyState = mongoose.connection.readyState;

  return {
    state: READY_STATES[readyState] || 'unknown',
    readyState,
    dbName: mongoose.connection.name || null
  };
}

module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
  getDatabaseHealth
};
