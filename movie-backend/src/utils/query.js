function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parsePagination(query, defaults) {
  const page = clamp(parseInteger(query.page, defaults.page), 1, 10_000);
  const limit = clamp(parseInteger(query.limit, defaults.limit), 1, defaults.maxLimit);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function parseSort(query, defaults) {
  const sort = typeof query.sort === 'string' ? query.sort.trim() : '';
  if (!sort) {
    return { [defaults.field]: defaults.order };
  }

  const order = sort.startsWith('-') ? -1 : 1;
  const field = sort.replace(/^-/, '');

  if (!defaults.allowedFields.includes(field)) {
    return { [defaults.field]: defaults.order };
  }

  return { [field]: order };
}

function parseSearch(query) {
  if (typeof query.search !== 'string') {
    return '';
  }

  return query.search.trim();
}

function parseBoolean(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  return null;
}

function parseCsvList(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumericFilter(query, key) {
  if (query[key] === undefined || query[key] === null || query[key] === '') {
    return null;
  }

  const parsed = parseNumber(query[key], NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  parsePagination,
  parseSort,
  parseSearch,
  parseBoolean,
  parseCsvList,
  parseNumericFilter,
  escapeRegExp
};
