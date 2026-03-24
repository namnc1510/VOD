const rolePermissionService = require('../services/role-permission.service');
const { successResponse } = require('../utils/api-response');

async function listRoles(req, res, next) {
  try {
    const items = await rolePermissionService.listRolePermissions();
    return res.status(200).json(successResponse(items));
  } catch (error) {
    return next(error);
  }
}

async function getRole(req, res, next) {
  try {
    const doc = await rolePermissionService.getRolePermission(req.params.role);
    return res.status(200).json(successResponse({ role: doc.role, codes: doc.codes || [] }));
  } catch (error) {
    return next(error);
  }
}

async function updateRole(req, res, next) {
  try {
    const updated = await rolePermissionService.updateRolePermission(req.params.role, req.body);
    return res.status(200).json(successResponse(updated));
  } catch (error) {
    return next(error);
  }
}

async function listCodes(req, res, next) {
  try {
    return res.status(200).json(successResponse(rolePermissionService.ALL_CODES));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listRoles,
  getRole,
  updateRole,
  listCodes
};

