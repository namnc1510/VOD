const authService = require('../services/auth.service');

function optionalAuthenticate(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return next();
  }

  const token = authorization.slice('Bearer '.length).trim();
  if (!token) {
    return next();
  }

  try {
    const payload = authService.verifyToken(token);
    req.auth = {
      userId: payload.sub,
      role: payload.role
    };
    return next();
  } catch (error) {
    return next();
  }
}

module.exports = optionalAuthenticate;
