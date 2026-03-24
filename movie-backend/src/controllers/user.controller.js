const userService = require('../services/user.service');
const { successResponse } = require('../utils/api-response');

async function listUsers(req, res, next) {
  try {
    const result = await userService.listUsers(req.query);
    return res.status(200).json(successResponse(result.items, result.meta));
  } catch (error) {
    return next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    return res.status(201).json(successResponse(user));
  } catch (error) {
    return next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return res.status(200).json(successResponse(user));
  } catch (error) {
    return next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.params.id);
    return res.status(200).json(successResponse({ success: true }));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  deleteUser
};
