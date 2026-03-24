const fs = require('fs');
const path = require('path');

const mongoose = require('mongoose');

const config = require('../src/config/env');
const Movie = require('../src/models/movie.model');

function bucket(url) {
  const value = String(url || '').trim();
  if (!value) return 'empty';
  if (value.includes('picsum.photos/seed/')) return 'picsum';
  if (value.includes('/uploads/')) return 'uploads';
  if (value.includes('res.cloudinary.com') || value.includes('cloudinary.com')) {
    return 'cloudinary';
  }
  return 'other';
}

function isHttpUrl(value) {
  return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
}

function localUploadFileExists(urlLike) {
  const value = String(urlLike || '').trim();
  if (!value.includes('/uploads/')) return null;
  const filename = path.basename(value);
  if (!filename) return null;
  const filePath = path.join(__dirname, '../data/uploads', filename);
  return fs.existsSync(filePath);
}

function topDuplicates(map, limit = 10) {
  return Array.from(map.entries())
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

async function main() {
  await mongoose.connect(config.mongoUri);

  const docs = await Movie.find(
    {},
    {
      title: 1,
      slug: 1,
      posterUrl: 1,
      backdropUrl: 1,
      gallery: 1,
    },
  ).lean();

  const stats = {
    mongoUri: config.mongoUri,
    total: docs.length,
    poster: { empty: 0, picsum: 0, uploads: 0, cloudinary: 0, other: 0 },
    backdrop: { empty: 0, picsum: 0, uploads: 0, cloudinary: 0, other: 0 },
    picsumMismatch: { poster: 0, backdrop: 0 },
    uploadsMissing: { poster: 0, backdrop: 0, galleryItems: 0 },
    nonHttpUrls: { poster: 0, backdrop: 0 },
  };

  const posterCounts = new Map();
  const backdropCounts = new Map();

  for (const m of docs) {
    const posterUrl = String(m.posterUrl || '').trim();
    const backdropUrl = String(m.backdropUrl || '').trim();

    const pb = bucket(posterUrl);
    const bb = bucket(backdropUrl);

    stats.poster[pb] += 1;
    stats.backdrop[bb] += 1;

    if (posterUrl && !isHttpUrl(posterUrl) && !posterUrl.startsWith('/uploads/')) {
      stats.nonHttpUrls.poster += 1;
    }
    if (backdropUrl && !isHttpUrl(backdropUrl) && !backdropUrl.startsWith('/uploads/')) {
      stats.nonHttpUrls.backdrop += 1;
    }

    if (pb === 'picsum' && m.slug) {
      const want = `/seed/${m.slug}-poster/`;
      if (!posterUrl.includes(want)) stats.picsumMismatch.poster += 1;
    }
    if (bb === 'picsum' && m.slug) {
      const want = `/seed/${m.slug}-backdrop/`;
      if (!backdropUrl.includes(want)) stats.picsumMismatch.backdrop += 1;
    }

    if (pb === 'uploads') {
      const exists = localUploadFileExists(posterUrl);
      if (exists === false) stats.uploadsMissing.poster += 1;
    }
    if (bb === 'uploads') {
      const exists = localUploadFileExists(backdropUrl);
      if (exists === false) stats.uploadsMissing.backdrop += 1;
    }

    const gallery = Array.isArray(m.gallery) ? m.gallery : [];
    for (const g of gallery) {
      if (bucket(g) === 'uploads') {
        const exists = localUploadFileExists(g);
        if (exists === false) stats.uploadsMissing.galleryItems += 1;
      }
    }

    if (posterUrl) posterCounts.set(posterUrl, (posterCounts.get(posterUrl) || 0) + 1);
    if (backdropUrl) backdropCounts.set(backdropUrl, (backdropCounts.get(backdropUrl) || 0) + 1);
  }

  const report = {
    stats,
    topPosterDuplicates: topDuplicates(posterCounts, 10),
    topBackdropDuplicates: topDuplicates(backdropCounts, 10),
  };

  console.log(JSON.stringify(report, null, 2));
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

