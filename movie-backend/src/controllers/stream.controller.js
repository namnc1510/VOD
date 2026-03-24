const fs = require('fs');
const path = require('path');

const Episode = require('../models/episode.model');
const Movie = require('../models/movie.model');
const slugify = require('../utils/slug');

const plans = { free: 0, standard: 1, premium: 2, ultimate: 3 };
const roles = { user: 0, editor: 1, moderator: 1, admin: 2, super: 3 };

function checkAccess(user, accessMode) {
  const userPlanRank = plans[user?.plan || 'free'] ?? 0;
  const movieAccessRank = plans[accessMode || 'free'] ?? 0;
  const userRoleRank = roles[user?.role || 'user'] ?? 0;
  return userRoleRank > 0 || userPlanRank >= movieAccessRank;
}

function isExternalUrl(value) {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
}

function parseUrlSafe(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isPlaceholderUrl(value) {
  if (!isExternalUrl(value)) return false;
  const url = parseUrlSafe(value);
  if (!url) return false;
  const host = String(url.hostname || '').toLowerCase();
  return host === 'example.com' || host.endsWith('.example.com');
}

function isProbablyDirectVideoAssetUrl(value) {
  if (!isExternalUrl(value)) return false;
  const url = parseUrlSafe(value);
  if (!url) return false;
  const pathname = String(url.pathname || '').toLowerCase();
  return ['.mp4', '.webm', '.ogv', '.ogg', '.mov', '.m4v'].some((ext) => pathname.endsWith(ext));
}

function resolveUploadFilePathFromStreamUrl(streamUrl) {
  if (typeof streamUrl !== 'string' || !streamUrl.trim()) return null;

  let pathname = streamUrl;
  try {
    // If it's an absolute URL, extract pathname.
    if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://')) {
      pathname = new URL(streamUrl).pathname;
    }
  } catch {
    // ignore parse errors and treat as path-like string
  }

  if (!pathname.includes('/uploads/')) return null;

  const filename = path.basename(pathname);
  if (!filename) return null;

  return path.join(__dirname, '../../data/uploads', filename);
}

exports.streamMovie = async (req, res, next) => {
  try {
    const slug = slugify(req.params.slug);

    // Default fallback video
    let videoPath = path.join(__dirname, '../../data/videos/dummy.mp4');

    const movie = await Movie.findOne(
      { slug, deletedAt: null, status: { $ne: 'hidden' } },
      { streamUrl: 1, accessMode: 1 },
    ).lean();

    if (!movie) {
      return res.status(404).json({
        status: 'error',
        message: 'Movie not found',
      });
    }

    if (!checkAccess(req.user, movie.accessMode)) {
      return res.status(403).json({
        status: 'error',
        message: 'Premium subscription required to stream this content.',
      });
    }

    // If streamUrl is an external URL (e.g. Cloudinary), redirect the client.
    const streamUrl = typeof movie?.streamUrl === 'string' ? movie.streamUrl.trim() : '';
    if (streamUrl && isExternalUrl(streamUrl) && !isPlaceholderUrl(streamUrl) && isProbablyDirectVideoAssetUrl(streamUrl)) {
      const candidate = resolveUploadFilePathFromStreamUrl(streamUrl);
      if (!candidate) {
        return res.redirect(streamUrl);
      }
    }
    const candidate = resolveUploadFilePathFromStreamUrl(movie?.streamUrl);
    if (candidate && fs.existsSync(candidate)) {
      videoPath = candidate;
    }

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        status: 'error',
        message: 'Video file not found on server',
      });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Chunked streaming (HTTP 206)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(206, head);
      file.pipe(res);
      return;
    }

    // Full download (HTTP 200)
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  } catch (error) {
    next(error);
  }
};

exports.streamEpisode = async (req, res, next) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid episode identifier',
      });
    }

    // Default fallback video
    let videoPath = path.join(__dirname, '../../data/videos/dummy.mp4');

    const episode = await Episode.findOne(
      { _id: id, deletedAt: null, status: 'published' },
      { streamUrl: 1, movie: 1 },
    ).lean();
    if (!episode) {
      return res.status(404).json({
        status: 'error',
        message: 'Episode not found',
      });
    }

    const movie = await Movie.findOne(
      { _id: episode.movie, deletedAt: null, status: { $ne: 'hidden' } },
      { _id: 1, accessMode: 1 },
    ).lean();
    if (!movie) {
      return res.status(404).json({
        status: 'error',
        message: 'Movie not found',
      });
    }

    if (!checkAccess(req.user, movie.accessMode)) {
      return res.status(403).json({
        status: 'error',
        message: 'Premium subscription required to stream this content.',
      });
    }

    // If it's an external URL (not local uploads), just redirect the player.
    if (typeof episode.streamUrl === 'string' && isExternalUrl(episode.streamUrl) && !isPlaceholderUrl(episode.streamUrl) && isProbablyDirectVideoAssetUrl(episode.streamUrl)) {
      const candidate = resolveUploadFilePathFromStreamUrl(episode.streamUrl);
      if (!candidate) {
        return res.redirect(episode.streamUrl);
      }
    }

    const candidate = resolveUploadFilePathFromStreamUrl(episode?.streamUrl);
    if (candidate && fs.existsSync(candidate)) {
      videoPath = candidate;
    }

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        status: 'error',
        message: 'Video file not found on server',
      });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const chunksize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(206, head);
      file.pipe(res);
      return;
    }

    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  } catch (error) {
    next(error);
  }
};
