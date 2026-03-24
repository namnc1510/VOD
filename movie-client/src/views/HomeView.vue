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
  const data = input && typeof input === 'object' ? input : {};
  return {
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

  const genres = (hero.genres || []).map(g => typeof g === 'object' ? g.name : g).filter(Boolean).join(', ');
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
  { key: 'trending', title: 'Trending Today', items: feed.value.trending },
  { key: 'new', title: 'New Releases', items: feed.value.newReleases },
  { key: 'recommended', title: 'Recommended For You', items: feed.value.recommended },
  { key: 'top', title: 'Top IMDB', items: feed.value.topImdb }
]);

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
  <div class="flex flex-col">
    <!-- Hero Section -->
    <div v-if="loading" class="panel p-8 text-center bg-white dark:bg-slate-800 rounded-xl mb-8">Loading homepage...</div>
    <div v-else-if="error" class="panel error text-red-500 p-8 bg-red-50 dark:bg-red-900/20 rounded-xl mb-8">{{ error }}</div>

    <template v-else>
      <div v-if="activeHero" class="@container mb-12">
        <div
          class="relative min-h-[520px] overflow-hidden rounded-xl bg-slate-900 shadow-2xl group"
          @mouseenter="stopHeroAutoplay"
          @mouseleave="startHeroAutoplay"
        >
          <div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" :style="{ backgroundImage: `linear-gradient(to right, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.1) 100%), linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 40%), url(${activeHero.backdropUrl || activeHero.posterUrl})` }"></div>
          <div class="relative flex h-full min-h-[460px] md:min-h-[520px] flex-col justify-center px-6 md:px-16 pt-8 pb-16 md:pb-8 gap-4 md:gap-6 max-w-3xl z-10">
            <div class="flex flex-col gap-4">
              <div class="flex gap-2 items-center">
                <span class="px-3 py-1 bg-primary/20 backdrop-blur-md text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                  {{ activeHero.isFeatured ? 'Featured' : 'Most Watched' }}
                </span>
                <span class="px-3 py-1 bg-white/10 backdrop-blur-md text-white text-xs font-bold rounded-full uppercase tracking-wider">IMDB {{ activeHero.imdbRating?.toFixed(1) }}</span>
              </div>
              <h1 class="text-white text-3xl sm:text-5xl md:text-7xl font-black leading-tight tracking-tight">
                {{ activeHero.title }}
              </h1>
              <p class="text-slate-300 text-sm md:text-xl font-normal leading-relaxed line-clamp-3 md:line-clamp-4">
                {{ activeHero.overview }}
              </p>
              <p class="hero-meta text-slate-400 font-medium flex flex-wrap items-center gap-2">
                <span v-for="(part, idx) in heroMetaParts" :key="`${part}-${idx}`" class="contents">
                  <span>{{ part }}</span>
                  <span v-if="idx < heroMetaParts.length - 1">•</span>
                </span>
              </p>
            </div>
            <div class="flex flex-col sm:flex-row flex-wrap gap-4 mt-4 w-full sm:w-auto">
              <RouterLink :to="`/watch/${activeHero.slug}`" class="flex w-full sm:w-auto min-w-[140px] items-center justify-center gap-2 rounded-xl h-14 px-8 bg-primary text-white text-lg font-bold shadow-xl shadow-primary/30 hover:scale-105 transition-transform">
                <span class="material-symbols-outlined">play_arrow</span>
                <span>Watch Now</span>
              </RouterLink>
              <RouterLink :to="`/movies/${activeHero.slug}`" class="flex w-full sm:w-auto min-w-[140px] items-center justify-center gap-2 rounded-xl h-14 px-8 bg-white/10 backdrop-blur-md text-white text-lg font-bold hover:bg-white/20 transition-all">
                <span class="material-symbols-outlined">info</span>
                <span>Details</span>
              </RouterLink>
            </div>
          </div>

          <button
            v-if="heroSlides.length > 1"
            @click="prevHero"
            class="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-black/40 backdrop-blur text-white items-center justify-center hover:bg-black/55 transition-colors z-20"
            aria-label="Previous hero"
          >
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            v-if="heroSlides.length > 1"
            @click="nextHero"
            class="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 size-11 rounded-full bg-black/40 backdrop-blur text-white items-center justify-center hover:bg-black/55 transition-colors z-20"
            aria-label="Next hero"
          >
            <span class="material-symbols-outlined">chevron_right</span>
          </button>

          <div v-if="heroSlides.length > 1" class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
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
      </div>

      <!-- Continue Watching Section -->
      <section v-if="feed.continueWatching?.length" class="mb-12">
        <div class="flex items-center justify-between px-2 pb-6">
          <h2 class="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">Continue Watching</h2>
          <RouterLink to="/watchlist" class="text-primary text-sm font-semibold hover:underline">My Watchlist</RouterLink>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <article v-for="entry in feed.continueWatching" :key="entry.movie.id" class="flex gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div class="w-32 shrink-0">
               <img :src="entry.movie.backdropUrl || entry.movie.posterUrl" :alt="entry.movie.title" loading="lazy" class="w-full h-full object-cover" />
            </div>
            <div class="flex py-3 pr-3 flex-col justify-between w-full">
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

      <!-- Movie Scrolling Sections -->
      <section v-for="section in sections" :key="section.key" class="mb-12">
        <div class="flex items-center justify-between px-2 pb-6">
          <h2 class="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">{{ section.title }}</h2>
          <RouterLink to="/explore" class="text-primary text-sm font-semibold hover:underline">View All</RouterLink>
        </div>
        <div class="flex overflow-x-auto pb-6 pt-2 gap-4 md:gap-6 scrollbar-hide snap-x px-6 md:px-20 -mx-6 md:-mx-20 relative">
          <MovieCard v-for="movie in section.items" :key="movie.id" :movie="movie" />
        </div>
      </section>

      <!-- Genre Browse Section -->
      <section v-if="feed.genres?.length" class="mb-12">
        <div class="flex items-center justify-between px-2 pb-6">
          <h2 class="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">Browse by Genre</h2>
          <RouterLink to="/explore" class="text-primary text-sm font-semibold hover:underline">Open Explore</RouterLink>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <RouterLink
            v-for="(genre, idx) in feed.genres.slice(0, 12)"
            :key="genre.slug || genre.genre"
            :to="`/explore?genre=${encodeURIComponent(genre.genre)}`"
            :style="getHoverCardVars(idx)"
            class="hover-tint-card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors cursor-pointer min-h-[110px]"
          >
            <h3 class="text-slate-900 dark:text-white font-bold text-lg leading-tight">{{ genre.genre }}</h3>
            <p class="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">{{ genre.titles }} titles</p>
          </RouterLink>
        </div>
      </section>

      <!-- Country Browse Section -->
      <section class="mb-12">
        <div class="flex items-center justify-between px-2 pb-6">
          <h2 class="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">Browse by Country</h2>
          <RouterLink to="/countries" class="text-primary text-sm font-semibold hover:underline">Open Countries</RouterLink>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <RouterLink
            v-for="(country, idx) in feed.countries.slice(0, 12)"
            :key="country.country"
            :to="`/explore?country=${encodeURIComponent(country.country)}`"
            :style="getHoverCardVars(idx)"
            class="hover-tint-card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors cursor-pointer min-h-[110px]"
          >
            <h3 class="text-slate-900 dark:text-white font-bold text-lg leading-tight">{{ country.country }}</h3>
            <p class="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">{{ country.titles }} titles</p>
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

:global(.dark) .hover-tint-card:hover {
  background-color: var(--hover-bg-dark);
  border-color: var(--hover-border-dark);
}
</style>
