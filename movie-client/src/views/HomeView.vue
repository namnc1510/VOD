<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

import MovieCard from '../components/MovieCard.vue';
import { getApiErrorMessage } from '../services/api';
import { getHomeFeed } from '../services/discovery';
import { formatRuntime } from '../utils/format';

const loading = ref(true);
const error = ref('');

function normalizeFeed(input) {
  // If the backend wraps it twice or differently, we try to handle it.
  const data = (input && typeof input === 'object') ? (input.data || input) : {};
  
  if (import.meta.env.DEV) {
    console.debug('[VOD] Raw Home Feed Data:', input);
    console.debug('[VOD] Normalized Home Feed Data:', data);
  }

  const result = {
    hero: data.hero ?? null,
    heroSlides: Array.isArray(data.heroSlides) ? data.heroSlides : [],
    genres: Array.isArray(data.genres) ? data.genres : [],
    trending: Array.isArray(data.trending) ? data.trending : [],
    newReleases: Array.isArray(data.newReleases) ? data.newReleases : [],
    recommended: Array.isArray(data.recommended) ? data.recommended : [],
    topImdb: Array.isArray(data.topImdb) ? data.topImdb : [],
    countries: Array.isArray(data.countries) ? data.countries : [],
    continueWatching: Array.isArray(data.continueWatching) ? data.continueWatching : []
  };

  // If hero is missing but heroSlides has data, pick the first one.
  if (!result.hero && result.heroSlides.length > 0) {
    result.hero = result.heroSlides[0];
  }

  return result;
}

function formatNameList(items, fallback = '') {
  if (!Array.isArray(items) || items.length === 0) return fallback;

  return items
    .map((item) => (typeof item === 'object' ? item?.name || item?.genre || item?.country : item))
    .filter(Boolean)
    .join(' / ') || fallback;
}

function getContinueWatchingPercent(entry) {
  const durationMinutes = Number(entry?.movie?.durationMinutes);
  const progressSeconds = Number(entry?.progressSeconds);
  const durationSeconds = durationMinutes * 60;

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  if (!Number.isFinite(progressSeconds) || progressSeconds <= 0) return 0;

  return Math.min(100, Math.round((progressSeconds / durationSeconds) * 100));
}

import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();

const feed = ref(normalizeFeed(null));

const heroSlides = computed(() => {
  if (Array.isArray(feed.value.heroSlides) && feed.value.heroSlides.length > 0) {
    return feed.value.heroSlides;
  }
  return feed.value.hero ? [feed.value.hero] : [];
});

const heroIndex = ref(0);
const activeHero = computed(() => heroSlides.value[heroIndex.value] || null);

const heroMetaParts = computed(() => {
  const hero = activeHero.value;
  if (!hero) return [];

  const parts = [];
  if (hero.releaseYear) parts.push(String(hero.releaseYear));
  if (hero.quality) parts.push(String(hero.quality).toUpperCase());

  const runtime = formatRuntime(hero.durationMinutes);
  if (runtime && runtime !== '-') parts.push(runtime);

  if (hero.type) parts.push(String(hero.type).toLowerCase() === 'series' ? 'Series' : 'Movie');

  const genres = formatNameList(hero.genres);
  if (genres) parts.push(genres);

  return parts;
});

const hoverPalette = [
  { lightBg: '#93c5fd', darkBg: 'rgba(30, 58, 138, 0.72)', lightBorder: '#3b82f6', darkBorder: 'rgba(59, 130, 246, 0.82)' },
  { lightBg: '#67e8f9', darkBg: 'rgba(22, 78, 99, 0.72)', lightBorder: '#06b6d4', darkBorder: 'rgba(34, 211, 238, 0.82)' },
  { lightBg: '#6ee7b7', darkBg: 'rgba(6, 78, 59, 0.72)', lightBorder: '#10b981', darkBorder: 'rgba(52, 211, 153, 0.82)' },
  { lightBg: '#86efac', darkBg: 'rgba(20, 83, 45, 0.72)', lightBorder: '#22c55e', darkBorder: 'rgba(34, 197, 94, 0.82)' },
  { lightBg: '#bef264', darkBg: 'rgba(54, 83, 20, 0.72)', lightBorder: '#84cc16', darkBorder: 'rgba(163, 230, 53, 0.82)' },
  { lightBg: '#fcd34d', darkBg: 'rgba(120, 53, 15, 0.68)', lightBorder: '#f59e0b', darkBorder: 'rgba(245, 158, 11, 0.78)' },
  { lightBg: '#fdba74', darkBg: 'rgba(124, 45, 18, 0.68)', lightBorder: '#f97316', darkBorder: 'rgba(251, 146, 60, 0.78)' },
  { lightBg: '#fca5a5', darkBg: 'rgba(127, 29, 29, 0.68)', lightBorder: '#ef4444', darkBorder: 'rgba(248, 113, 113, 0.78)' },
  { lightBg: '#fda4af', darkBg: 'rgba(131, 24, 67, 0.68)', lightBorder: '#f43f5e', darkBorder: 'rgba(244, 63, 94, 0.78)' },
  { lightBg: '#f9a8d4', darkBg: 'rgba(112, 26, 117, 0.68)', lightBorder: '#ec4899', darkBorder: 'rgba(236, 72, 153, 0.78)' },
  { lightBg: '#c4b5fd', darkBg: 'rgba(88, 28, 135, 0.68)', lightBorder: '#a855f7', darkBorder: 'rgba(168, 85, 247, 0.78)' },
  { lightBg: '#a5b4fc', darkBg: 'rgba(49, 46, 129, 0.68)', lightBorder: '#6366f1', darkBorder: 'rgba(129, 140, 248, 0.78)' }
];

function getHoverCardVars(index) {
  const palette = hoverPalette[index % hoverPalette.length];
  return {
    '--hover-bg': palette.lightBg,
    '--hover-bg-dark': palette.darkBg,
    '--hover-border': palette.lightBorder,
    '--hover-border-dark': palette.darkBorder
  };
}

const sections = computed(() => [
  {
    key: 'trending',
    title: 'Trending Today',
    description: 'Fresh picks based on what viewers are opening right now.',
    items: feed.value.trending
  },
  {
    key: 'new',
    title: 'New Releases',
    description: 'Recently added titles surfaced in a cleaner scrolling rail.',
    items: feed.value.newReleases
  },
  {
    key: 'recommended',
    title: 'Recommended For You',
    description: 'Personalized picks arranged so the list stays readable.',
    items: feed.value.recommended
  },
  {
    key: 'top',
    title: 'Top IMDB',
    description: 'Highest-rated movies grouped in the same layout rhythm.',
    items: feed.value.topImdb
  }
].filter(section => Array.isArray(section.items) && section.items.length > 0));

function setHeroIndex(next) {
  const total = heroSlides.value.length;
  if (total <= 0) {
    heroIndex.value = 0;
    return;
  }
  const normalized = ((next % total) + total) % total;
  heroIndex.value = normalized;
}

function nextHero() {
  setHeroIndex(heroIndex.value + 1);
}

function prevHero() {
  setHeroIndex(heroIndex.value - 1);
}

let heroTimer = null;
function startHeroAutoplay() {
  stopHeroAutoplay();
  if (heroSlides.value.length <= 1) return;
  if (settingsStore.homeHeroAutoPlay === false) return; // Bỏ qua nếu tắt chế độ tự cuộn

  const delayMs = Math.max(1000, Number(settingsStore.homeHeroInterval || 6.5) * 1000);
  heroTimer = window.setInterval(() => {
    nextHero();
  }, delayMs);
}

function stopHeroAutoplay() {
  if (heroTimer) {
    clearInterval(heroTimer);
    heroTimer = null;
  }
}

const sectionRefs = ref({});
function scroll(key, direction) {
  const el = sectionRefs.value[key];
  if (!el) return;
  const scrollAmount = Math.max(320, el.clientWidth * 0.72);
  el.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
}

async function loadFeed() {
  loading.value = true;
  error.value = '';

  try {
    const data = await getHomeFeed();
    feed.value = normalizeFeed(data);
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Failed to load homepage feed');
  } finally {
    loading.value = false;
  }
}

onMounted(loadFeed);

watch(
  () => heroSlides.value.length,
  () => {
    setHeroIndex(0);
    startHeroAutoplay();
  },
  { immediate: true }
);

watch(
  () => [settingsStore.homeHeroAutoPlay, settingsStore.homeHeroInterval],
  () => {
    startHeroAutoplay();
  }
);

onBeforeUnmount(() => {
  stopHeroAutoplay();
});
</script>

<template>
  <div class="flex flex-col gap-14 lg:gap-16">
    <div v-if="loading" class="rounded-[28px] border border-slate-200 bg-white px-8 py-14 text-center text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Loading homepage...</div>
    <div v-else-if="error" class="rounded-[28px] border border-red-200 bg-red-50 px-8 py-14 text-center text-red-500 shadow-sm dark:border-red-900/30 dark:bg-red-900/20">{{ error }}</div>

    <template v-else>
      <section v-if="activeHero">
        <div
          class="group relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-slate-950 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.85)] dark:border-white/10"
          @mouseenter="stopHeroAutoplay"
          @mouseleave="startHeroAutoplay"
        >
          <div class="absolute inset-0">
            <div class="absolute inset-0 scale-105 bg-cover bg-center blur-[2px] transition-transform duration-700 group-hover:scale-[1.08]" :style="{ backgroundImage: `url(${activeHero.backdropUrl || activeHero.posterUrl})` }"></div>
            <div class="absolute inset-0" style="background-image: linear-gradient(90deg, rgba(2, 6, 23, 0.94) 0%, rgba(2, 6, 23, 0.78) 34%, rgba(2, 6, 23, 0.3) 70%, rgba(2, 6, 23, 0.14) 100%);"></div>
            <div class="absolute inset-0" style="background-image: linear-gradient(180deg, rgba(15, 23, 42, 0.12) 0%, rgba(15, 23, 42, 0) 32%, rgba(2, 6, 23, 0.66) 100%);"></div>
          </div>
          <div class="relative z-10 grid min-h-[480px] lg:min-h-[560px] lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
            <div class="flex flex-col justify-end px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12 xl:px-12">
              <div class="max-w-[640px]">
            <div class="flex flex-col gap-5">
              <div class="mb-1 flex flex-wrap items-center gap-2.5">
                <span class="rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-primary backdrop-blur-md">
                  {{ activeHero.isFeatured ? 'Featured' : 'Most Watched' }}
                </span>
                <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md">IMDB {{ activeHero.imdbRating?.toFixed(1) || 'N/A' }}</span>
              </div>
              <h1 class="max-w-[11ch] text-4xl font-black leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                {{ activeHero.title }}
              </h1>
              <p class="max-w-[36rem] text-sm leading-relaxed text-slate-200 sm:text-base lg:text-lg xl:text-xl">
                {{ activeHero.overview || 'Discover what everyone is watching on the platform right now.' }}
              </p>
              <div class="flex flex-wrap gap-2.5">
                <span v-for="(part, idx) in heroMetaParts" :key="`${part}-${idx}`" class="hero-meta-pill rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-sm font-medium text-slate-200 backdrop-blur-md">
                  {{ part }}
                  <span v-if="idx < heroMetaParts.length - 1">•</span>
                </span>
              </div>
            </div>
            <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <RouterLink :to="`/watch/${activeHero.slug}`" class="flex h-14 min-w-[168px] items-center justify-center gap-2 rounded-2xl bg-primary px-8 text-lg font-bold text-white shadow-xl shadow-primary/30 transition-transform hover:scale-[1.02]">
                <span class="material-symbols-outlined">play_arrow</span>
                <span>Watch Now</span>
              </RouterLink>
              <RouterLink :to="`/movies/${activeHero.slug}`" class="flex h-14 min-w-[168px] items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-8 text-lg font-bold text-white backdrop-blur-md transition-all hover:bg-white/16">
                <span class="material-symbols-outlined">info</span>
                <span>Details</span>
              </RouterLink>
            </div>
              </div>
            </div>
            <div class="hidden items-end justify-end p-8 lg:flex xl:p-10">
              <div class="w-full max-w-[280px] rounded-[28px] border border-white/12 bg-white/10 p-3 text-white shadow-2xl backdrop-blur-xl">
                <div class="aspect-[3/4] overflow-hidden rounded-[22px] bg-slate-900/50">
                  <img :src="activeHero.posterUrl || activeHero.backdropUrl" :alt="activeHero.title" loading="lazy" class="h-full w-full object-cover object-top" />
                </div>
                <div class="px-1 pb-2 pt-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">Spotlight</p>
                  <p class="mt-2 text-2xl font-bold leading-tight">{{ activeHero.title }}</p>
                  <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-200/80">{{ activeHero.overview || 'Watch the featured title from a cleaner hero layout.' }}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            v-if="heroSlides.length > 1"
            @click="prevHero"
            class="absolute left-4 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/50 md:flex"
            aria-label="Previous hero"
          >
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            v-if="heroSlides.length > 1"
            @click="nextHero"
            class="absolute right-4 top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/50 md:flex"
            aria-label="Next hero"
          >
            <span class="material-symbols-outlined">chevron_right</span>
          </button>

          <div v-if="heroSlides.length > 1" class="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            <button
              v-for="(_, idx) in heroSlides"
              :key="idx"
              @click="setHeroIndex(idx)"
              class="h-2.5 rounded-full transition-all"
              :class="idx === heroIndex ? 'w-8 bg-primary' : 'w-2.5 bg-white/40 hover:bg-white/60'"
              :aria-label="`Go to slide ${idx + 1}`"
            ></button>
          </div>
        </div>
      </section>

      <!-- Continue Watching Section -->
      <section v-if="feed.continueWatching?.length" class="space-y-5">
        <div class="flex items-center justify-between gap-4 px-1">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Continue Watching</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Resume unfinished titles without losing your progress markers.</p>
          </div>
          <RouterLink to="/watchlist" class="shrink-0 text-sm font-semibold text-primary hover:underline">My Watchlist</RouterLink>
        </div>
        <div class="grid grid-cols-1 gap-5 rounded-[28px] border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/55 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <article v-for="entry in feed.continueWatching" :key="entry.movie.id" class="flex gap-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white px-3 py-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950/70">
            <div class="w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-900/60">
               <img :src="entry.movie.backdropUrl || entry.movie.posterUrl" :alt="entry.movie.title" loading="lazy" class="h-full w-full object-cover" />
            </div>
            <div class="flex w-full flex-col justify-between py-1 pr-1">
               <div>
                  <h3 class="text-slate-900 dark:text-white font-bold text-sm line-clamp-1">{{ entry.movie.title }}</h3>
                  <p class="text-slate-500 dark:text-slate-400 text-xs mt-1">{{ (entry.movie.genres || []).join(' • ') }}</p>
               </div>
              <div class="mt-3">
                <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div class="bg-primary h-1.5 rounded-full" :style="{ width: `${getContinueWatchingPercent(entry)}%` }"></div>
                </div>
                <RouterLink :to="`/watch/${entry.movie.slug}`" class="text-primary text-xs font-bold hover:underline">Resume</RouterLink>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section v-for="section in sections" :key="section.key" class="group/section space-y-5">
        <div class="flex items-center justify-between gap-4 px-1">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{{ section.title }}</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ section.description }}</p>
          </div>
          <RouterLink to="/explore" class="shrink-0 text-sm font-semibold text-primary hover:underline">View All</RouterLink>
        </div>
        
        <div class="relative">
          <button 
            @click="scroll(section.key, -1)"
            class="absolute left-4 top-1/2 z-30 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 opacity-0 shadow-xl transition-all hover:scale-105 hover:text-primary group-hover/section:opacity-100 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300 md:flex"
            aria-label="Scroll left"
          >
            <span class="material-symbols-outlined font-bold">chevron_left</span>
          </button>

          <div class="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/70 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/55">
            <div 
              :ref="el => { if (el) sectionRefs[section.key] = el }"
              class="flex snap-x gap-4 overflow-x-auto px-4 py-5 scrollbar-hide scroll-smooth sm:px-5 lg:gap-6 lg:px-6 lg:py-6"
            >
              <MovieCard v-for="(movie, idx) in section.items" :key="movie.id || idx" :movie="movie" />
            </div>
          </div>

          <button 
            @click="scroll(section.key, 1)"
            class="absolute right-4 top-1/2 z-30 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 opacity-0 shadow-xl transition-all hover:scale-105 hover:text-primary group-hover/section:opacity-100 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300 md:flex"
            aria-label="Scroll right"
          >
            <span class="material-symbols-outlined font-bold">chevron_right</span>
          </button>
        </div>
      </section>

      <!-- Genre Browse Section -->
      <section v-if="feed.genres?.length" class="space-y-5">
        <div class="flex items-center justify-between gap-4 px-1">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Browse by Genre</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Jump into a mood quickly without leaving the homepage rhythm.</p>
          </div>
          <RouterLink to="/explore" class="shrink-0 text-sm font-semibold text-primary hover:underline">Open Explore</RouterLink>
        </div>
        <div class="grid grid-cols-2 gap-4 rounded-[28px] border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/55 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <RouterLink
            v-for="(genre, idx) in feed.genres.slice(0, 12)"
            :key="genre.slug || genre.genre"
            :to="`/explore?genre=${encodeURIComponent(genre.genre)}`"
            :style="getHoverCardVars(idx)"
            class="hover-tint-card flex min-h-[118px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-center transition-colors dark:border-slate-800 dark:bg-slate-950/70"
          >
            <h3 class="text-lg font-bold leading-tight text-slate-900 dark:text-white">{{ genre.genre }}</h3>
            <p class="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{{ genre.titles }} titles</p>
          </RouterLink>
        </div>
      </section>

      <section v-if="feed.countries?.length" class="space-y-5">
        <div class="flex items-center justify-between gap-4 px-1">
          <div>
            <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Browse by Country</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Keep region browsing aligned with the rest of the homepage cards.</p>
          </div>
          <RouterLink to="/categories" class="shrink-0 text-sm font-semibold text-primary hover:underline">Open Categories</RouterLink>
        </div>
        <div class="grid grid-cols-2 gap-4 rounded-[28px] border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/55 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <RouterLink
            v-for="(country, idx) in feed.countries.slice(0, 12)"
            :key="country.country"
            :to="`/explore?country=${encodeURIComponent(country.country)}`"
            :style="getHoverCardVars(idx)"
            class="hover-tint-card flex min-h-[118px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-center transition-colors dark:border-slate-800 dark:bg-slate-950/70"
          >
            <h3 class="text-lg font-bold leading-tight text-slate-900 dark:text-white">{{ country.country }}</h3>
            <p class="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{{ country.titles }} titles</p>
          </RouterLink>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.hover-tint-card {
  transition: background-color 180ms ease, border-color 180ms ease, transform 180ms ease;
}

.hover-tint-card:hover {
  background-color: var(--hover-bg);
  border-color: var(--hover-border);
  transform: translateY(-1px);
}

.hero-meta-pill > span {
  display: none;
}

:global(.dark) .hover-tint-card:hover {
  background-color: var(--hover-bg-dark);
  border-color: var(--hover-border-dark);
}
</style>
