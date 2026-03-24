const { errorResponse } = require('../utils/api-response');

function createRateLimiter(options) {
  const windowMs = options.windowMs;
  const max = options.max;
  const requests = new Map();

  const cleaner = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of requests.entries()) {
      if (entry.expiresAt <= now) {
        requests.delete(key);
      }
    }
  }, windowMs);

  if (typeof cleaner.unref === 'function') {
    cleaner.unref();
  }

  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = requests.get(key);

    if (!entry || entry.expiresAt <= now) {
      entry = {
        count: 0,
        expiresAt: now + windowMs
      };
      requests.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(max - entry.count, 0);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.expiresAt / 1000)));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.expiresAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json(
        errorResponse('Too many requests', {
          retryAfterSeconds: retryAfter
        })
      );
    }

    return next();
  };
}

module.exports = createRateLimiter;
