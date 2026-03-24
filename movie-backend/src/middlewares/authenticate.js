const HttpError = require('../utils/http-error');
const authService = require('../services/auth.service');

function authenticate(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Missing Bearer token'));
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    return next(new HttpError(401, 'Missing Bearer token'));
  }

  try {
    const payload = authService.verifyToken(token);
    req.auth = {
      userId: payload.sub,
      role: payload.role
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticate;
