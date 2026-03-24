const settingService = require('../services/setting.service');
const { successResponse } = require('../utils/api-response');

async function getSettings(req, res, next) {
  try {
    const data = await settingService.getSettings();
    return res.status(200).json(successResponse(data));
  } catch (error) {
    return next(error);
  }
}

async function getPublicSettings(req, res, next) {
  try {
    const data = await settingService.getSettings();
    return res.status(200).json(successResponse(settingService.toPublicSettings(data)));
  } catch (error) {
    return next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const data = await settingService.updateSettings(req.body);
    return res.status(200).json(successResponse(data));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSettings,
  getPublicSettings,
  updateSettings
};
