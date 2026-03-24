const Category = require('../models/category.model');
const Country = require('../models/country.model');
const Person = require('../models/person.model');
const Episode = require('../models/episode.model');
const movieService = require('./movie.service');
const slugify = require('../utils/slug');
const { escapeRegExp } = require('../utils/query');

function normalizeHeaderKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, '')
    .replace(/_/g, '');
}

function getCell(row, candidates) {
  for (const key of Object.keys(row || {})) {
    const nk = normalizeHeaderKey(key);
    if (candidates.includes(nk)) return row[key];
  }
  return undefined;
}

function toStringValue(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function toNumberOrUndefined(v) {
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : undefined;
}

function splitList(v) {
  const s = toStringValue(v);
  if (!s) return [];
  // Allow comma / semicolon / pipe / newline separated lists.
  return s
    .split(/[,;|\n]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeMovieStatus(input) {
  const raw = toStringValue(input).toLowerCase();
  if (!raw) return '';

  if (raw === 'published') return 'released';
  if (raw === 'unpublished' || raw === 'private') return 'hidden';
  if (raw === 'draft' || raw === 'scheduled' || raw === 'comingsoon' || raw === 'upcoming') return 'coming_soon';

  if (['released', 'coming_soon', 'hidden'].includes(raw)) return raw;
  return '';
}

function isObjectIdLike(value) {
  return /^[a-f\d]{24}$/i.test(value);
}

async function findOrCreateByName(Model, name) {
  const trimmed = toStringValue(name);
  if (!trimmed) return null;

  // Case-insensitive exact match
  const existing = await Model.findOne({
    name: new RegExp(`^${escapeRegExp(trimmed)}$`, 'i'),
  }).lean();
  if (existing) return existing;

  const baseSlug = slugify(trimmed);
  let slug = baseSlug;
  let counter = 1;
  // Ensure unique slug
  // eslint-disable-next-line no-await-in-loop
  while (await Model.exists({ slug })) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  const created = await Model.create({ name: trimmed, slug });
  return created.toObject ? created.toObject() : created;
}

async function resolveTaxonomyIds(list, Model) {
  const values = Array.isArray(list) ? list : splitList(list);
  const out = [];

  for (const v of values) {
    const s = toStringValue(v);
    if (!s) continue;
    if (isObjectIdLike(s)) {
      out.push(s);
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const doc = await findOrCreateByName(Model, s);
    if (doc?._id) out.push(String(doc._id));
  }

  return out;
}

async function importRows(rows) {
  const results = {
    created: 0,
    failed: 0,
    errors: [],
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return results;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const rowIndex = i + 2; // assuming row 1 is header

    try {
      const title = toStringValue(
        getCell(row, ['title', 'tenphim', 'ten', 'name']),
      );
      if (!title) {
        throw new Error('Missing title');
      }

      const payload = {};

      payload.title = title;
      payload.slug = toStringValue(getCell(row, ['slug'])) || undefined;
      payload.overview = toStringValue(getCell(row, ['overview', 'tomtat'])) || '';
      payload.director = toStringValue(getCell(row, ['director', 'daodien'])) || '';

      const releaseYear = toNumberOrUndefined(getCell(row, ['releaseyear', 'year', 'nam']));
      if (releaseYear !== undefined) payload.releaseYear = releaseYear;

      const totalEpisodes = toNumberOrUndefined(getCell(row, ['totalepisodes', 'sotap']));
      if (totalEpisodes !== undefined) payload.totalEpisodes = totalEpisodes;

      const quality = toStringValue(getCell(row, ['quality', 'chatluong']));
      if (quality) payload.quality = quality;

      const type = toStringValue(getCell(row, ['type', 'format', 'dinhdang']));
      if (type) payload.type = type;

      const status = toStringValue(getCell(row, ['status', 'trangthai']));
      const normalizedStatus = normalizeMovieStatus(status);
      if (normalizedStatus) payload.status = normalizedStatus;

      payload.posterUrl = toStringValue(getCell(row, ['posterurl', 'poster'])) || '';
      payload.backdropUrl = toStringValue(getCell(row, ['backdropurl', 'backdrop'])) || '';
      payload.trailerUrl = toStringValue(getCell(row, ['trailerurl', 'trailer'])) || '';
      payload.streamUrl = toStringValue(getCell(row, ['streamurl', 'stream', 'videourl'])) || '';

      const tags = splitList(getCell(row, ['tags', 'tag']));
      if (tags.length > 0) payload.tags = tags;

      payload.genres = await resolveTaxonomyIds(getCell(row, ['genres', 'genre', 'theloai']), Category);
      payload.countries = await resolveTaxonomyIds(getCell(row, ['countries', 'country', 'quocgia']), Country);
      payload.actors = await resolveTaxonomyIds(getCell(row, ['actors', 'cast', 'dienvien']), Person);
      payload.directors = await resolveTaxonomyIds(getCell(row, ['directors', 'director', 'daodien', 'daodiens']), Person);

      // Create using existing business rules (slug uniqueness, etc.)
      const movie = await movieService.createMovie(payload);

      const episodesText = toStringValue(getCell(row, ['episodes', 'tapphim', 'danhsachtap']));
      if (episodesText && movie && movie.id) {
        const lines = episodesText.split(/\r?\n/).filter((line) => line.trim());
        let epNo = 1;
        for (const line of lines) {
          const parts = line.split('|').map((p) => p.trim());
          if (parts.length >= 2) {
            const title = parts[0];
            const streamUrl = parts.slice(1).join('|');
            // eslint-disable-next-line no-await-in-loop
            await Episode.create({
              movie: movie.id,
              epNo: epNo++,
              title: title,
              streamUrl: streamUrl,
              status: 'published'
            });
          }
        }
      }

      results.created += 1;
    } catch (err) {
      results.failed += 1;
      results.errors.push({
        row: rowIndex,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

module.exports = {
  importRows,
};
