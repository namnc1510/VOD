const authService = require('../services/auth.service');
const { successResponse } = require('../utils/api-response');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json(successResponse(result));
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json(successResponse(result));
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.auth.userId);
    return res.status(200).json(successResponse(user));
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const updatedUser = await authService.updateProfile(req.auth.userId, req.body);
    return res.status(200).json(successResponse(updatedUser));
  } catch (error) {
    return next(error);
  }
}

async function deleteAccount(req, res, next) {
  try {
    await authService.deleteAccount(req.auth.userId);
    return res.status(200).json(successResponse({ message: 'Account deleted successfully' }));
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.auth.userId, oldPassword, newPassword);
    return res.status(200).json(successResponse({ message: 'Password updated successfully' }));
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json(errorResponse('Refresh Token is required', 400));
    }
    const result = await authService.refresh(refreshToken);
    return res.status(200).json(successResponse(result));
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    return res.status(200).json(successResponse(null));
  } catch (error) {
    return next(error);
  }
}

async function codes(req, res, next) {
  try {
    const rolePermissionService = require('../services/role-permission.service');
    const codes = await rolePermissionService.getCodesForRole(req.auth.role);
    return res.status(200).json(successResponse(codes));
  } catch (error) {
    return next(error);
  }
}

async function googleLogin(req, res, next) {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json(errorResponse('Google Token (credential) is missing', 400));
    }
    const result = await authService.loginWithGoogle(credential);
    return res.status(200).json(successResponse(result));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  me,
  updateProfile,
  deleteAccount,
  changePassword,
  refresh,
  logout,
  codes,
  googleLogin
};
