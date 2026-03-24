import { defineStore } from 'pinia';
import * as settingsApi from '../services/settings';

const CACHE_KEY = 'movie_public_settings';
const CACHE_AT_KEY = 'movie_public_settings_at';

let pollerId = null;

function readCache() {
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function writeCache(value) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
    localStorage.setItem(CACHE_AT_KEY, String(Date.now()));
  } catch (err) {
    // ignore storage errors (private mode, quota, etc.)
  }
}

function resolveAssetUrl(url, cdnBaseUrl) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value;
  const base = String(cdnBaseUrl || '').trim().replace(/\/+$/, '');
  if (!base) return value;
  return `${base}/${value.replace(/^\/+/, '')}`;
}

function upsertMeta(name, content) {
  const value = String(content || '').trim();
  if (!value) return;

  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function upsertFavicon(href) {
  const value = String(href || '').trim();
  if (!value) return;

  let link = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'icon');
    document.head.appendChild(link);
  }
  link.setAttribute('href', value);
}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: null,
    loading: false,
    error: '',
  }),
  getters: {
    siteName: (state) => state.settings?.siteName || 'MovieStream',
    description: (state) => state.settings?.description || '',
    logoUrl: (state) => state.settings?.logoUrl || '',
    faviconUrl: (state) => state.settings?.faviconUrl || '',
    themeColor: (state) => state.settings?.themeColor || '',
    fontFamily: (state) => Boolean(state.settings?.fontFamily) ? state.settings.fontFamily : '"Spline Sans", sans-serif',
    darkMode: (state) => Boolean(state.settings?.darkMode),
    layout: (state) => state.settings?.layout || 'side',
    updatedAt: (state) => state.settings?.updatedAt || null,
    cdnBaseUrl: (state) => state.settings?.cdnBaseUrl || '',
    facebookUrl: (state) => state.settings?.facebookUrl || '',
    twitterUrl: (state) => state.settings?.twitterUrl || '',
    instagramUrl: (state) => state.settings?.instagramUrl || '',
    youtubeUrl: (state) => state.settings?.youtubeUrl || '',
    homeHeroAutoPlay: (state) => typeof state.settings?.homeHeroAutoPlay === 'boolean' ? state.settings.homeHeroAutoPlay : true,
    homeHeroInterval: (state) => typeof state.settings?.homeHeroInterval === 'number' ? state.settings.homeHeroInterval : 6.5,
  },
  actions: {
    applyToDocument() {
      const s = this.settings;
      if (!s) return;

      const root = document.documentElement;
      const themeColor = String(s.themeColor || '').trim();
      if (themeColor) {
        root.style.setProperty('--app-primary', themeColor);
        upsertMeta('theme-color', themeColor);
      }

      if (s.darkMode) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      const fontFamily = String(s.fontFamily || '').trim();
      if (fontFamily && !fontFamily.includes('Spline') && fontFamily !== 'System') {
        const fontName = fontFamily.split(',')[0].replace(/['"]/g, '');
        const fontId = `google-font-${fontName.replace(/\s+/g, '-')}`;
        if (!document.getElementById(fontId)) {
          const l = document.createElement('link');
          l.id = fontId;
          l.rel = 'stylesheet';
          l.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap`;
          document.head.appendChild(l);
        }
      }
      if (fontFamily) {
        root.style.setProperty('--app-font', fontFamily);
      }

      const title = String(s.metaTitle || '').trim() || String(s.siteName || '').trim();
      if (title) document.title = title;

      upsertMeta('description', s.description);
      if (Array.isArray(s.keywords) && s.keywords.length > 0) {
        upsertMeta('keywords', s.keywords.join(', '));
      }

      const faviconHref = resolveAssetUrl(s.faviconUrl, s.cdnBaseUrl);
      if (faviconHref) upsertFavicon(faviconHref);
    },

    async fetchPublicSettings({ force = false } = {}) {
      if (this.loading) return this.settings;

      // Fast path: hydrate from cache for instant UI, then revalidate in background.
      if (!force && !this.settings) {
        const cached = readCache();
        if (cached) {
          this.settings = cached;
          this.applyToDocument();
        }
      }

      this.loading = true;
      this.error = '';
      try {
        const next = await settingsApi.getPublicSettings();
        if (!next || typeof next !== 'object') return this.settings;

        if (this.settings?.updatedAt && next.updatedAt && String(this.settings.updatedAt) === String(next.updatedAt)) {
          return this.settings;
        }

        this.settings = next;
        writeCache(next);
        this.applyToDocument();
        return next;
      } catch (err) {
        this.error = 'Failed to load settings';
        return this.settings;
      } finally {
        this.loading = false;
      }
    },

    async init() {
      await this.fetchPublicSettings({ force: true });

      if (pollerId) return;
      pollerId = window.setInterval(() => {
        this.fetchPublicSettings({ force: true });
      }, 60_000);

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            this.fetchPublicSettings({ force: true });
          }
        });
      }
    },

    stop() {
      if (pollerId) {
        clearInterval(pollerId);
        pollerId = null;
      }
    },

    resolveAssetUrl(url) {
      return resolveAssetUrl(url, this.cdnBaseUrl);
    },
  },
});

