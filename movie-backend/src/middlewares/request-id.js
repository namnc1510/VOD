const { randomUUID } = require('crypto');

function requestId(req, res, next) {
  const incomingRequestId = req.headers['x-request-id'];
  req.id = typeof incomingRequestId === 'string' && incomingRequestId.trim() ? incomingRequestId : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = requestId;
