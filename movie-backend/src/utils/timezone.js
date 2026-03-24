const WINDOWS_TIMEZONE_TO_IANA = Object.freeze({
  // Common Windows time zone display names -> IANA identifiers (MongoDB expects IANA).
  'Greenwich Mean Time': 'Etc/UTC',
  UTC: 'UTC',
  'Vietnam Standard Time': 'Asia/Ho_Chi_Minh',
  'SE Asia Standard Time': 'Asia/Ho_Chi_Minh',
  'China Standard Time': 'Asia/Shanghai',
  'Tokyo Standard Time': 'Asia/Tokyo',
  'Korea Standard Time': 'Asia/Seoul',
  'Eastern Standard Time': 'America/New_York',
  'Central Standard Time': 'America/Chicago',
  'Mountain Standard Time': 'America/Denver',
  'Pacific Standard Time': 'America/Los_Angeles',
});

function extractLastParenthesesValue(input) {
  if (typeof input !== 'string') return null;
  const str = input.trim();
  if (!str) return null;

  // Grab the content of the last "(...)" occurrence.
  const re = /\(([^)]+)\)/g;
  let match;
  let last = null;
  // eslint-disable-next-line no-cond-assign
  while ((match = re.exec(str))) {
    last = match[1] ? match[1].trim() : null;
  }
  return last;
}

function isIanaTimezone(timezone) {
  if (timezone === 'UTC') return true;
  if (typeof timezone !== 'string') return false;
  const tz = timezone.trim();
  if (!tz) return false;
  // Rough validation (keeps false-positives low): Region/City[/Subcity], allows + - _ . and digits.
  return /^[A-Za-z_]+\/[A-Za-z0-9_+.-]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(tz);
}

function parseUtcOffsetToEtcGmt(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const m = /^UTC\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec(trimmed);
  if (!m) return null;

  const sign = m[1];
  const hours = Number(m[2]);
  const minutes = m[3] ? Number(m[3]) : 0;
  if (!Number.isFinite(hours) || hours > 14) return null;
  // "Etc/GMT" zones only support whole-hour offsets.
  if (minutes !== 0) return null;

  // Note: Etc/GMT sign is inverted: UTC+7 => Etc/GMT-7
  const inverted = sign === '+' ? '-' : '+';
  return `Etc/GMT${inverted}${hours}`;
}

function normalizeMongoTimezone(input, fallback = 'UTC') {
  if (typeof input !== 'string') return fallback;
  const raw = input.trim();
  if (!raw) return fallback;

  // Support values like "UTC (Greenwich Mean Time)" or "(UTC+07:00) ..." by extracting the last "(...)".
  const extracted = extractLastParenthesesValue(raw);

  const candidates = [raw, extracted].filter(
    (v) => typeof v === 'string' && v.trim().length > 0,
  );

  for (const candidate of candidates) {
    const value = String(candidate).trim();
    if (!value) continue;

    if (isIanaTimezone(value)) return value;

    const mapped = WINDOWS_TIMEZONE_TO_IANA[value];
    if (mapped && isIanaTimezone(mapped)) return mapped;

    const etcGmt = parseUtcOffsetToEtcGmt(value);
    if (etcGmt && isIanaTimezone(etcGmt)) return etcGmt;
  }

  return fallback;
}

module.exports = {
  normalizeMongoTimezone,
};

