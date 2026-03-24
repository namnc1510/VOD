const { errorResponse } = require('../utils/api-response');

function notFoundHandler(req, res) {
  res.status(404).json(
    errorResponse('Route not found', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl
    })
  );
}

module.exports = notFoundHandler;
