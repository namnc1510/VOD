const config = require('../src/config/env');
const { connectToDatabase, disconnectFromDatabase } = require('../src/config/db');
const settingService = require('../src/services/setting.service');
const rolePermissionService = require('../src/services/role-permission.service');
const mongoose = require('mongoose');

const Movie = require('../src/models/movie.model');
const Category = require('../src/models/category.model');
const Country = require('../src/models/country.model');
const Quality = require('../src/models/quality.model');
const Format = require('../src/models/format.model');
const Setting = require('../src/models/setting.model');
const User = require('../src/models/user.model');
const bcrypt = require('bcryptjs');

const slugify = require('../src/utils/slug');
const { escapeRegExp } = require('../src/utils/query');

const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n');
const ENSURE_ADMIN = process.argv.includes('--ensure-admin');
const RESET_ADMIN_PASSWORD = process.argv.includes('--reset-admin-password');
const PARTIAL_SCAN = process.argv.includes('--partial');

function log(message, context) {
  const payload = {
    time: new Date().toISOString(),
    message,
    ...(context && typeof context === 'object' ? { context } : {})
  };
  console.log(JSON.stringify(payload));
}

function titleCase(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function ensureUniqueSlug(Model, baseSlug, excludeId) {
  let slug = baseSlug;
  let counter = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await Model.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}

async function findTaxonomyByNameOrSlug(Model, value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const s = slugify(raw);
  if (!s) return null;

  return Model.findOne({
    $or: [{ slug: s }, { name: new RegExp(`^${escapeRegExp(raw)}$`, 'i') }]
  })
    .select('_id name slug')
    .lean();
}

async function ensureTaxonomy(Model, { name, slug, description }) {
  const rawName = String(name || '').trim();
  if (!rawName) return { doc: null, created: false };

  const baseSlug = slugify(slug || rawName);
  if (!baseSlug) return { doc: null, created: false };

  const existing = await Model.findOne({
    $or: [{ slug: baseSlug }, { name: new RegExp(`^${escapeRegExp(rawName)}$`, 'i') }]
  })
    .select('_id name slug')
    .lean();

  if (existing) return { doc: existing, created: false };

  const uniqueSlug = await ensureUniqueSlug(Model, baseSlug);
  const payload = {
    name: rawName,
    slug: uniqueSlug,
    ...(description !== undefined ? { description: String(description || '') } : {})
  };

  if (DRY_RUN) {
    return { doc: { _id: null, ...payload }, created: true, dryRun: true };
  }

  const created = await Model.create(payload);
  const doc = created.toObject ? created.toObject() : created;
  return { doc: { _id: doc._id, name: doc.name, slug: doc.slug }, created: true };
}

function isObjectIdLike(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

function toObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const s = String(value);
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
}

function normalizeObjectIdArray(input) {
  const values = Array.isArray(input) ? input : [];
  const out = [];
  const seen = new Set();

  for (const v of values) {
    const id = toObjectId(v);
    if (!id) continue;
    const key = id.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }

  return out;
}

function toBooleanOrDefault(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
  }
  return fallback;
}

function toNumberOrDefault(value, fallback) {
  const n = typeof value === 'number' ? value : Number(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function toStringOrDefault(value, fallback) {
  const s = value === undefined || value === null ? '' : String(value);
  const trimmed = s.trim();
  return trimmed ? trimmed : fallback;
}

function normalizeMovieStatus(input) {
  const raw = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (!raw) return null;
  if (raw === 'published') return 'released';
  if (raw === 'unpublished' || raw === 'private') return 'hidden';
  if (raw === 'draft' || raw === 'scheduled' || raw === 'comingsoon' || raw === 'upcoming') return 'coming_soon';
  if (['released', 'coming_soon', 'hidden'].includes(raw)) return raw;
  return null;
}

async function resolveTaxonomyIdFromValue(Model, value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && value?._id) return String(value._id);

  const raw = typeof value === 'string' ? value.trim() : String(value).trim();
  if (!raw) return null;

  if (isObjectIdLike(raw)) return raw;

  const existing = await findTaxonomyByNameOrSlug(Model, raw);
  if (existing?._id) return String(existing._id);

  const ensured = await ensureTaxonomy(Model, {
    name: raw,
    slug: raw
  });
  if (ensured.doc?._id) return String(ensured.doc._id);
  // In dry-run, we still want to count planned updates even if we didn't create a real _id.
  return DRY_RUN ? `DRY:${Model.collection.name}:${slugify(raw)}` : null;
}

async function normalizeRefArray(Model, input) {
  const values = Array.isArray(input) ? input : input !== undefined ? [input] : [];
  const out = [];
  const seen = new Set();

  for (const v of values) {
    const id = await resolveTaxonomyIdFromValue(Model, v);
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }

  return out;
}

async function main() {
  log('db_sync_start', { dryRun: DRY_RUN, mongoUri: config.mongoUri });

  await connectToDatabase(config.mongoUri);

  const settings = await settingService.getSettings();
  log('settings_ready', { key: settings?.key || 'default' });

  // Ensure baseline roles exist (idempotent).
  const roles = await rolePermissionService.listRolePermissions();
  log('role_permissions_ready', { roles: roles.map((r) => r.role) });

  // Optional: ensure an admin user exists for vben-admin login.
  const adminEmail = String(process.env.SEED_ADMIN_EMAIL || 'admin@streamvue.local').trim().toLowerCase();
  const adminPassword = String(process.env.SEED_ADMIN_PASSWORD || 'Admin@123456');
  if (ENSURE_ADMIN) {
    const adminExisting = await User.findOne({ email: adminEmail }).select('+passwordHash').lean();
    if (!adminExisting) {
      const passwordHash = DRY_RUN ? '(dry-run)' : await bcrypt.hash(adminPassword, 10);
      if (!DRY_RUN) {
        await User.create({
          name: 'Stream Admin',
          email: adminEmail,
          role: 'admin',
          plan: 'premium',
          passwordHash,
          watchedCount: 0
        });
      }
      log('admin_user_created', { email: adminEmail, dryRun: DRY_RUN });
    } else if (RESET_ADMIN_PASSWORD) {
      if (!DRY_RUN) {
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await User.updateOne({ _id: adminExisting._id }, { $set: { passwordHash, role: 'admin' } });
      }
      log('admin_user_password_reset', { email: adminEmail, dryRun: DRY_RUN });
    } else {
      log('admin_user_exists', { email: adminEmail });
    }
  }

  // Ensure baseline taxonomies exist.
  const defaultQualities = ['SD', 'HD', '4K'];
  const defaultFormats = ['movie', 'series'];

  const created = {
    qualities: 0,
    formats: 0,
    categories: 0,
    countries: 0
  };

  for (const q of defaultQualities) {
    const ensured = await ensureTaxonomy(Quality, { name: q, slug: q });
    if (ensured.created) created.qualities += 1;
  }

  for (const f of defaultFormats) {
    const ensured = await ensureTaxonomy(Format, { name: titleCase(f), slug: f });
    if (ensured.created) created.formats += 1;
  }

  let qualityById = new Map();
  let formatById = new Map();

  const movieMatch = PARTIAL_SCAN
    ? {
        $or: [
          { qualityRef: null },
          { qualityRef: { $exists: false } },
          { formatRef: null },
          { formatRef: { $exists: false } },
          { genres: { $elemMatch: { $type: 'string' } } },
          { countries: { $elemMatch: { $type: 'string' } } },
          { slug: { $exists: false } },
          { slug: '' },
          { title: { $exists: true, $ne: '' }, slug: null },
          { quality: { $exists: false } },
          { type: { $exists: false } }
        ]
      }
    : {};

  // Backfill & normalize movies to match vben-admin expectations.
  const movieCursor = Movie.find(movieMatch, {
      title: 1,
      slug: 1,
      quality: 1,
      type: 1,
      status: 1,
      deletedAt: 1,
      qualityRef: 1,
      formatRef: 1,
      genres: 1,
      countries: 1,
      overview: 1,
      posterUrl: 1,
      backdropUrl: 1,
      trailerUrl: 1,
      streamUrl: 1,
      director: 1,
      gallery: 1,
      tags: 1,
      writers: 1,
      cast: 1,
      isFeatured: 1,
      isTrending: 1,
      isNewRelease: 1,
      views: 1,
      trendingScore: 1,
      rating: 1,
      imdbRating: 1,
      durationMinutes: 1,
      audioLanguage: 1,
      ageRating: 1,
      releaseYear: 1,
      releaseDate: 1
    }).cursor();

  const bulkOps = [];
  const updatedCounters = {
    moviesUpdated: 0,
    moviesScanned: 0,
    moviesSlugFixed: 0,
    moviesDefaultsFixed: 0,
    moviesRefsFixed: 0
  };

  // Collect distinct values to ensure taxonomies exist (reduces per-movie lookups).
  const [distinctMovieQualities, distinctMovieTypes] = await Promise.all([
    Movie.distinct('quality', { quality: { $exists: true, $ne: '' } }),
    Movie.distinct('type', { type: { $exists: true, $ne: '' } })
  ]);

  for (const q of distinctMovieQualities.filter(Boolean)) {
    const ensured = await ensureTaxonomy(Quality, { name: String(q).trim(), slug: String(q).trim() });
    if (ensured.created) created.qualities += 1;
  }

  for (const t of distinctMovieTypes.filter(Boolean)) {
    const ensured = await ensureTaxonomy(Format, { name: titleCase(String(t).trim()), slug: String(t).trim() });
    if (ensured.created) created.formats += 1;
  }

  // Preload taxonomy lookup maps after ensuring baseline docs.
  const [allQualities, allFormats] = await Promise.all([
    Quality.find({}, { name: 1, slug: 1 }).lean(),
    Format.find({}, { name: 1, slug: 1 }).lean(),
  ]);

  qualityById = new Map(allQualities.map((q) => [String(q._id), q]));
  formatById = new Map(allFormats.map((f) => [String(f._id), f]));

  for await (const movie of movieCursor) {
    updatedCounters.moviesScanned += 1;

    const set = {};
    const unset = {};

    const title = typeof movie.title === 'string' ? movie.title.trim() : '';

    if (!movie.slug || typeof movie.slug !== 'string' || !movie.slug.trim()) {
      const baseSlug = slugify(title || String(movie._id));
      if (baseSlug) {
        const unique = await ensureUniqueSlug(Movie, baseSlug, movie._id);
        set.slug = unique;
        updatedCounters.moviesSlugFixed += 1;
      }
    }

    // Ensure safe defaults for optional fields used by the vben-admin UI.
    const defaults = {
      overview: '',
      posterUrl: '',
      backdropUrl: '',
      trailerUrl: '',
      streamUrl: '',
      director: '',
      gallery: [],
      tags: [],
      writers: [],
      cast: [],
      status: 'released',
      deletedAt: null,
    };

    for (const [key, fallback] of Object.entries(defaults)) {
      const value = movie[key];
      if (value === undefined) {
        set[key] = fallback;
        updatedCounters.moviesDefaultsFixed += 1;
        continue;
      }

      if (Array.isArray(fallback)) {
        if (!Array.isArray(value)) {
          set[key] = fallback;
          updatedCounters.moviesDefaultsFixed += 1;
        }
        continue;
      }

      if (fallback === null) {
        // deletedAt should exist as null (not undefined).
        continue;
      }

      if (typeof fallback === 'string' && typeof value !== 'string') {
        set[key] = String(value || '');
        updatedCounters.moviesDefaultsFixed += 1;
      }
    }

    const normalizedStatus = normalizeMovieStatus(movie.status) || 'released';
    if (movie.status !== normalizedStatus) {
      set.status = normalizedStatus;
      updatedCounters.moviesDefaultsFixed += 1;
    }

    // Normalize booleans/numbers (only write if changed).
    const isFeatured = toBooleanOrDefault(movie.isFeatured, false);
    if (movie.isFeatured !== isFeatured) set.isFeatured = isFeatured;

    const isTrending = toBooleanOrDefault(movie.isTrending, false);
    if (movie.isTrending !== isTrending) set.isTrending = isTrending;

    const isNewRelease = toBooleanOrDefault(movie.isNewRelease, false);
    if (movie.isNewRelease !== isNewRelease) set.isNewRelease = isNewRelease;

    const views = Math.max(0, Math.trunc(toNumberOrDefault(movie.views, 0)));
    if (movie.views !== views) set.views = views;

    const trendingScore = Math.max(0, Math.trunc(toNumberOrDefault(movie.trendingScore, 0)));
    if (movie.trendingScore !== trendingScore) set.trendingScore = trendingScore;

    const rating = Math.max(0, Math.min(10, toNumberOrDefault(movie.rating, 0)));
    if (movie.rating !== rating) set.rating = rating;

    const imdbRating = Math.max(0, Math.min(10, toNumberOrDefault(movie.imdbRating, rating)));
    if (movie.imdbRating !== imdbRating) set.imdbRating = imdbRating;

    const durationMinutes = Math.max(1, Math.trunc(toNumberOrDefault(movie.durationMinutes, 90)));
    if (movie.durationMinutes !== durationMinutes) set.durationMinutes = durationMinutes;

    const audioLanguage = toStringOrDefault(movie.audioLanguage || movie.language, 'English');
    if (movie.audioLanguage !== audioLanguage) set.audioLanguage = audioLanguage;

    const ageRating = toStringOrDefault(movie.ageRating, 'PG-13');
    if (movie.ageRating !== ageRating) set.ageRating = ageRating;

    if (!movie.qualityRef) {
      const qualityValue = typeof movie.quality === 'string' && movie.quality.trim() ? movie.quality.trim() : 'HD';
      const qualityId = await resolveTaxonomyIdFromValue(Quality, qualityValue);
      const qualityObjectId = toObjectId(qualityId);
      if (qualityObjectId) {
        set.qualityRef = qualityObjectId;
        const q = qualityById.get(String(qualityObjectId));
        set.quality = q?.name ? q.name : qualityValue;
        updatedCounters.moviesRefsFixed += 1;
      } else if (DRY_RUN && qualityId) {
        set.qualityRef = qualityId;
      }
    } else {
      const qid = toObjectId(movie.qualityRef);
      const q = qid ? qualityById.get(String(qid)) : null;
      if (q?.name && movie.quality !== q.name) {
        set.quality = q.name;
        updatedCounters.moviesRefsFixed += 1;
      }
    }

    if (!movie.formatRef) {
      const typeValue = typeof movie.type === 'string' && movie.type.trim() ? movie.type.trim() : 'movie';
      const formatId = await resolveTaxonomyIdFromValue(Format, typeValue);
      const formatObjectId = toObjectId(formatId);
      if (formatObjectId) {
        set.formatRef = formatObjectId;
        const f = formatById.get(String(formatObjectId));
        set.type = f?.slug ? f.slug : slugify(typeValue);
        updatedCounters.moviesRefsFixed += 1;
      } else if (DRY_RUN && formatId) {
        set.formatRef = formatId;
      }
    } else {
      const fid = toObjectId(movie.formatRef);
      const f = fid ? formatById.get(String(fid)) : null;
      if (f?.slug && typeof movie.type === 'string' && movie.type.trim().toLowerCase() !== f.slug) {
        set.type = f.slug;
        updatedCounters.moviesRefsFixed += 1;
      }
    }

    if (movie.genres && Array.isArray(movie.genres) && movie.genres.some((g) => typeof g === 'string' && !isObjectIdLike(g))) {
      const genreIds = await normalizeRefArray(Category, movie.genres);
      if (genreIds.length > 0) {
        const mapped = genreIds.map((id) => toObjectId(id) || (DRY_RUN ? id : null)).filter(Boolean);
        set.genres = mapped;
      } else {
        set.genres = [];
      }
      updatedCounters.moviesRefsFixed += 1;
    } else if (Array.isArray(movie.genres)) {
      const normalized = normalizeObjectIdArray(movie.genres);
      if (normalized.length !== movie.genres.length) {
        set.genres = normalized;
        updatedCounters.moviesRefsFixed += 1;
      }
    }

    if (movie.countries && Array.isArray(movie.countries) && movie.countries.some((c) => typeof c === 'string' && !isObjectIdLike(c))) {
      const countryIds = await normalizeRefArray(Country, movie.countries);
      if (countryIds.length > 0) {
        const mapped = countryIds.map((id) => toObjectId(id) || (DRY_RUN ? id : null)).filter(Boolean);
        set.countries = mapped;
      } else {
        set.countries = [];
      }
      updatedCounters.moviesRefsFixed += 1;
    } else if (Array.isArray(movie.countries)) {
      const normalized = normalizeObjectIdArray(movie.countries);
      if (normalized.length !== movie.countries.length) {
        set.countries = normalized;
        updatedCounters.moviesRefsFixed += 1;
      }
    }

    // Clean explicit undefined updates.
    for (const key of Object.keys(set)) {
      if (set[key] === undefined) delete set[key];
    }

    for (const key of Object.keys(unset)) {
      if (unset[key] === undefined) delete unset[key];
    }

    if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
      continue;
    }

    updatedCounters.moviesUpdated += 1;
    bulkOps.push({
      updateOne: {
        filter: { _id: movie._id },
        update: {
          ...(Object.keys(set).length > 0 ? { $set: set } : {}),
          ...(Object.keys(unset).length > 0 ? { $unset: unset } : {})
        }
      }
    });

    if (bulkOps.length >= 500) {
      if (!DRY_RUN) {
        await Movie.bulkWrite(bulkOps, { ordered: false });
      }
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0) {
    if (!DRY_RUN) {
      await Movie.bulkWrite(bulkOps, { ordered: false });
    }
  }

  // Normalize Settings.homeHeroMovieIds and related fields.
  const settingsDoc = await Setting.findOne({ key: 'default' }).lean();
  if (settingsDoc) {
    const idsRaw = Array.isArray(settingsDoc.homeHeroMovieIds) ? settingsDoc.homeHeroMovieIds : [];
    const ids = normalizeObjectIdArray(idsRaw).map((id) => id.toString());
    const existingIds = new Set(
      (await Movie.find({ _id: { $in: ids }, }, { _id: 1 }).lean()).map((m) => m._id.toString()),
    );
    const filtered = ids.filter((id) => existingIds.has(id)).slice(0, 30);

    const homeHeroLimit = Math.min(Math.max(Math.trunc(toNumberOrDefault(settingsDoc.homeHeroLimit, 6)), 1), 12);
    const homeHeroAutofill = toBooleanOrDefault(settingsDoc.homeHeroAutofill, true);

    const needsUpdate =
      filtered.length !== idsRaw.length ||
      homeHeroLimit !== settingsDoc.homeHeroLimit ||
      homeHeroAutofill !== settingsDoc.homeHeroAutofill;

    if (needsUpdate) {
      if (!DRY_RUN) {
        await Setting.updateOne(
          { _id: settingsDoc._id },
          {
            $set: {
              homeHeroMovieIds: filtered.map((id) => new mongoose.Types.ObjectId(id)),
              homeHeroLimit,
              homeHeroAutofill,
            },
          },
        );
      }
      log('settings_normalized', {
        dryRun: DRY_RUN,
        homeHeroMovieIds: filtered.length,
        homeHeroLimit,
        homeHeroAutofill,
      });
    }
  }

  // Create missing indexes (do not drop unknown indexes).
  const indexModels = [Movie, Category, Country, Quality, Format, Setting, User];
  for (const M of indexModels) {
    if (!DRY_RUN) {
      // eslint-disable-next-line no-await-in-loop
      await M.createIndexes();
    }
  }

  log('db_sync_summary', {
    dryRun: DRY_RUN,
    created,
    moviesScanned: updatedCounters.moviesScanned,
    moviesWithUpdates: updatedCounters.moviesUpdated,
    moviesSlugFixed: updatedCounters.moviesSlugFixed,
    moviesDefaultsFixed: updatedCounters.moviesDefaultsFixed,
    moviesRefsFixed: updatedCounters.moviesRefsFixed,
    ensureAdmin: ENSURE_ADMIN,
    partialScan: PARTIAL_SCAN
  });
}

if (require.main === module) {
  main()
    .catch((error) => {
      log('db_sync_failed', { error: { name: error?.name, message: error?.message, stack: error?.stack } });
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectFromDatabase();
    });
}
