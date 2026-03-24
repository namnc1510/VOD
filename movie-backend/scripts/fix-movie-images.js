const fs = require('fs');
const path = require('path');

const mongoose = require('mongoose');

const config = require('../src/config/env');
const Movie = require('../src/models/movie.model');

const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n');
const MODE = (() => {
  const raw = process.argv.find((arg) => arg.startsWith('--mode='));
  const value = raw ? raw.slice('--mode='.length).trim().toLowerCase() : 'safe';
  return ['safe', 'reset-picsum'].includes(value) ? value : 'safe';
})();

function isHttpUrl(value) {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
}

function isLocalUploadsPath(value) {
  const v = String(value || '').trim();
  return v.startsWith('/uploads/') || v.includes('/uploads/');
}

function localUploadFileExists(urlLike) {
  const value = String(urlLike || '').trim();
  if (!value.includes('/uploads/')) return null;
  const filename = path.basename(value);
  if (!filename) return null;
  const filePath = path.join(__dirname, '../data/uploads', filename);
  return fs.existsSync(filePath);
}

function expectedPoster(slug) {
  return `https://picsum.photos/seed/${slug}-poster/600/900`;
}

function expectedBackdrop(slug) {
  return `https://picsum.photos/seed/${slug}-backdrop/1600/900`;
}

function isKnownPlaceholderUrl(url) {
  const u = String(url || '').trim().toLowerCase();
  if (!u) return false;

  // Placeholder links frequently used in demos/import templates.
  if (u.includes('image.tmdb.org') && u.includes('sampleposter.jpg')) return true;
  if (u.includes('image.tmdb.org') && u.includes('samplebackdrop.jpg')) return true;
  if (u.endsWith('/sampleposter.jpg')) return true;
  if (u.endsWith('/samplebackdrop.jpg')) return true;

  return false;
}

function shouldReplaceWithPlaceholder(current, slug, kind) {
  const url = String(current || '').trim();
  if (!slug) return false;

  if (!url) return true;

  // Known placeholders should be replaced.
  if (isKnownPlaceholderUrl(url)) return true;

  // If it's a picsum seed but for another movie, fix it.
  if (url.includes('picsum.photos/seed/')) {
    const want = kind === 'poster' ? `/seed/${slug}-poster/` : `/seed/${slug}-backdrop/`;
    return !url.includes(want);
  }

  // Local upload points to missing file.
  if (isLocalUploadsPath(url)) {
    const exists = localUploadFileExists(url);
    if (exists === false) return true;
    return false;
  }

  // If it's not http(s) (bad value), replace.
  if (!isHttpUrl(url) && !url.startsWith('/uploads/')) return true;

  // Otherwise leave it alone (could be TMDB/Cloudinary/custom).
  return false;
}

async function main() {
  await mongoose.connect(config.mongoUri);

  const cursor = Movie.find(
    {},
    { title: 1, slug: 1, posterUrl: 1, backdropUrl: 1 },
  ).cursor();

  const ops = [];
  const summary = {
    mongoUri: config.mongoUri,
    dryRun: DRY_RUN,
    mode: MODE,
    scanned: 0,
    updated: 0,
    posterFixed: 0,
    backdropFixed: 0,
  };

  for await (const movie of cursor) {
    summary.scanned += 1;

    const slug = String(movie.slug || '').trim();
    if (!slug) continue;

    const next = {};

    const posterUrl = String(movie.posterUrl || '').trim();
    const backdropUrl = String(movie.backdropUrl || '').trim();

    const posterShould = MODE === 'reset-picsum'
      ? expectedPoster(slug)
      : shouldReplaceWithPlaceholder(posterUrl, slug, 'poster')
        ? expectedPoster(slug)
        : null;

    const backdropShould = MODE === 'reset-picsum'
      ? expectedBackdrop(slug)
      : shouldReplaceWithPlaceholder(backdropUrl, slug, 'backdrop')
        ? expectedBackdrop(slug)
        : null;

    if (posterShould && posterShould !== posterUrl) {
      next.posterUrl = posterShould;
      summary.posterFixed += 1;
    }
    if (backdropShould && backdropShould !== backdropUrl) {
      next.backdropUrl = backdropShould;
      summary.backdropFixed += 1;
    }

    if (Object.keys(next).length === 0) continue;
    summary.updated += 1;

    ops.push({
      updateOne: {
        filter: { _id: movie._id },
        update: { $set: next },
      },
    });

    if (ops.length >= 500) {
      if (!DRY_RUN) await Movie.bulkWrite(ops, { ordered: false });
      ops.length = 0;
    }
  }

  if (ops.length > 0) {
    if (!DRY_RUN) await Movie.bulkWrite(ops, { ordered: false });
  }

  console.log(JSON.stringify(summary, null, 2));
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error(err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exitCode = 1;
  });
}
