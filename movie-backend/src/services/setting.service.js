const Setting = require('../models/setting.model');
const mongoose = require('mongoose');
const { normalizeMongoTimezone } = require('../utils/timezone');

function normalizeKeywords(input) {
  const list = Array.isArray(input) ? input : [];
  const normalized = [];
  const seen = new Set();

  for (const item of list) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized.slice(0, 50);
}

function normalizeObjectIdList(input, maxItems = 20) {
  const list = Array.isArray(input) ? input : [];
  const normalized = [];
  const seen = new Set();

  for (const item of list) {
    const raw = typeof item === 'string' ? item.trim() : item;
    const value = String(raw || '');
    if (!value) continue;

    if (!mongoose.Types.ObjectId.isValid(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  return normalized.slice(0, maxItems);
}

function pickAllowedFields(payload) {
  const out = {};
  if (payload.siteName !== undefined) out.siteName = payload.siteName;
  if (payload.timezone !== undefined) out.timezone = normalizeMongoTimezone(payload.timezone, 'UTC');
  if (payload.description !== undefined) out.description = payload.description;

  if (payload.darkMode !== undefined) out.darkMode = payload.darkMode;
  if (payload.themeColor !== undefined) out.themeColor = payload.themeColor;
  if (payload.layout !== undefined) out.layout = payload.layout;
  if (payload.fontFamily !== undefined) out.fontFamily = payload.fontFamily;

  if (payload.metaTitle !== undefined) out.metaTitle = payload.metaTitle;
  if (payload.gaId !== undefined) out.gaId = payload.gaId;
  if (payload.keywords !== undefined) out.keywords = normalizeKeywords(payload.keywords);

  if (payload.logoUrl !== undefined) out.logoUrl = payload.logoUrl;
  if (payload.faviconUrl !== undefined) out.faviconUrl = payload.faviconUrl;

  if (payload.cdnBaseUrl !== undefined) out.cdnBaseUrl = payload.cdnBaseUrl;

  if (payload.homeHeroMovieIds !== undefined) out.homeHeroMovieIds = normalizeObjectIdList(payload.homeHeroMovieIds, 30);
  if (payload.homeHeroLimit !== undefined) out.homeHeroLimit = payload.homeHeroLimit;
  if (payload.homeHeroAutofill !== undefined) out.homeHeroAutofill = payload.homeHeroAutofill;
  if (payload.homeHeroAutoPlay !== undefined) out.homeHeroAutoPlay = payload.homeHeroAutoPlay;
  if (payload.homeHeroInterval !== undefined) out.homeHeroInterval = payload.homeHeroInterval;

  return out;
}

async function getSettings() {
  const existing = await Setting.findOne({ key: 'default' }).lean();
  if (existing) return existing;

  const created = await Setting.create({ key: 'default' });
  return created.toObject();
}

async function updateSettings(payload) {
  const update = pickAllowedFields(payload || {});

  const updated = await Setting.findOneAndUpdate(
    { key: 'default' },
    { $set: update, $setOnInsert: { key: 'default' } },
    { upsert: true, new: true }
  ).lean();

  return updated;
}

function toPublicSettings(settings) {
  const s = settings && typeof settings === 'object' ? settings : {};
  const homeHeroMovieIds = Array.isArray(s.homeHeroMovieIds) ? s.homeHeroMovieIds.map((v) => String(v)) : [];

  return {
    siteName: s.siteName || '',
    timezone: s.timezone || '',
    description: s.description || '',
    darkMode: Boolean(s.darkMode),
    themeColor: s.themeColor || '',
    layout: s.layout || 'side',
    fontFamily: s.fontFamily || '"Spline Sans", sans-serif',
    metaTitle: s.metaTitle || '',
    gaId: s.gaId || '',
    keywords: Array.isArray(s.keywords) ? s.keywords : [],
    logoUrl: s.logoUrl || '',
    faviconUrl: s.faviconUrl || '',
    cdnBaseUrl: s.cdnBaseUrl || '',
    homeHeroMovieIds,
    homeHeroLimit: typeof s.homeHeroLimit === 'number' ? s.homeHeroLimit : 6,
    homeHeroAutofill: s.homeHeroAutofill !== false,
    homeHeroAutoPlay: s.homeHeroAutoPlay !== false,
    homeHeroInterval: typeof s.homeHeroInterval === 'number' ? s.homeHeroInterval : 6.5,
    updatedAt: s.updatedAt || null,
  };
}

module.exports = {
  getSettings,
  updateSettings,
  toPublicSettings,
};
