const { getDatabaseHealth } = require('../config/db');
const { successResponse } = require('../utils/api-response');

function getHealth(req, res) {
  res.status(200).json(
    successResponse({
      status: 'ok',
      requestId: req.id,
      database: getDatabaseHealth()
    })
  );
}

module.exports = {
  getHealth
};
