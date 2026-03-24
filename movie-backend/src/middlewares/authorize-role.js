const HttpError = require('../utils/http-error');

function authorizeRole(roles) {
  return (req, res, next) => {
    if (!req.auth || !req.auth.role) {
      return next(new HttpError(401, 'Unauthorized'));
    }

    // Superuser bypass.
    if (req.auth.role === 'super') {
      return next();
    }

    if (!roles.includes(req.auth.role)) {
      return next(new HttpError(403, 'Forbidden'));
    }

    return next();
  };
}

module.exports = authorizeRole;
