const dashboardService = require('../services/dashboard.service');
const { successResponse } = require('../utils/api-response');

async function getOverview(req, res, next) {
  try {
    const data = await dashboardService.getOverview(req.query);
    return res.status(200).json(successResponse(data));
  } catch (error) {
    return next(error);
  }
}

async function getRevenue(req, res, next) {
  try {
    const data = await dashboardService.getRevenue(req.query);
    return res.status(200).json(successResponse(data));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOverview,
  getRevenue
};
