const watchlistService = require('../services/watchlist.service');
const { successResponse } = require('../utils/api-response');

function inferDeviceType(userAgent) {
  const ua = String(userAgent || '').toLowerCase();
  if (!ua) return 'unknown';
  if (ua.includes('smart-tv') || ua.includes('smarttv') || ua.includes('hbbtv') || ua.includes('tizen') || ua.includes('webos')) {
    return 'tv';
  }
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
    return 'mobile';
  }
  return 'desktop';
}

async function listWatchlist(req, res, next) {
  try {
    const items = await watchlistService.listWatchlist(req.auth.userId);
    return res.status(200).json(successResponse(items, { total: items.length }));
  } catch (error) {
    return next(error);
  }
}

async function upsertWatchlistItem(req, res, next) {
  try {
    const payload = {
      ...req.body,
      movieId: req.params.movieId || req.body.movieId,
      deviceType: inferDeviceType(req.headers['user-agent'])
    };
    const item = await watchlistService.upsertWatchlistItem(req.auth.userId, payload);
    return res.status(200).json(successResponse(item));
  } catch (error) {
    return next(error);
  }
}

async function removeWatchlistItem(req, res, next) {
  try {
    await watchlistService.removeWatchlistItem(req.auth.userId, req.params.movieId);
    return res.status(200).json(successResponse({ removed: true }));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listWatchlist,
  upsertWatchlistItem,
  removeWatchlistItem
};
