<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { getApiErrorMessage } from '../services/api';
import { getMovieEpisodes, getMovieLanding } from '../services/discovery';
import { upsertWatchlist } from '../services/watchlist';
import { useAuthStore } from '../stores/auth';
import { formatRuntime } from '../utils/format';

const route = useRoute();
const authStore = useAuthStore();

const loading = ref(true);
const error = ref('');
const movieData = ref(null);
const progress = ref(0);
const statusMessage = ref('');
const episodes = ref([]);
const activeEpisodeId = ref('');
const videoRef = ref(null);
const activeServer = ref(1);

const slug = computed(() => route.params.slug);
const episodeId = computed(() => (typeof route.query.episodeId === 'string' ? route.query.episodeId : ''));

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

const videoSrc = computed(() => {
  let base = '';
  if (activeEpisodeId.value) {
    base = `${API_BASE}/episodes/${activeEpisodeId.value}/stream`;
  } else if (movieData.value) {
    base = `${API_BASE}/movies/${movieData.value.slug}/stream`;
  }
  if (!base) return '';
  return activeServer.value === 1 ? base : `${base}?server=${activeServer.value}`;
});

const activeEpisode = computed(() => {
  if (!activeEpisodeId.value) return null;
  return (episodes.value || []).find((e) => String(e?.id) === String(activeEpisodeId.value)) || null;
});

const qualityLabel = computed(() => {
  const raw = String(movieData.value?.quality || '').trim();
  return raw ? raw.toUpperCase() : 'HD';
});

let cleanupVideoListeners = null;
function syncProgressFromVideo() {
  const video = videoRef.value;
  if (!video) return;

  const duration = Number(video.duration);
  const currentTime = Number(video.currentTime);
  if (!Number.isFinite(duration) || duration <= 0) return;
  if (!Number.isFinite(currentTime) || currentTime < 0) return;

  progress.value = Math.max(0, Math.min(100, Math.round((currentTime / duration) * 100)));
}

async function attachVideoListeners() {
  if (cleanupVideoListeners) {
    cleanupVideoListeners();
    cleanupVideoListeners = null;
  }

  await nextTick();
  const video = videoRef.value;
  if (!video) return;

  const handler = () => syncProgressFromVideo();
  video.addEventListener('timeupdate', handler);
  video.addEventListener('loadedmetadata', handler);
  video.addEventListener('durationchange', handler);

  cleanupVideoListeners = () => {
    video.removeEventListener('timeupdate', handler);
    video.removeEventListener('loadedmetadata', handler);
    video.removeEventListener('durationchange', handler);
  };

  handler();
}

async function loadMovieForPlayer() {
  loading.value = true;
  error.value = '';
  episodes.value = [];
  activeEpisodeId.value = episodeId.value || '';

  try {
    const data = await getMovieLanding(slug.value);
    movieData.value = data.movie;
    progress.value = 0;

    // If this is a series and no episode was specified, default to the first published episode.
    if (!activeEpisodeId.value) {
      const res = await getMovieEpisodes(slug.value, { limit: 500 });
      episodes.value = Array.isArray(res.items) ? res.items : [];
      if (episodes.value.length > 0) {
        activeEpisodeId.value = episodes.value[0].id;
      }
    } else {
      // Still load episode list for potential UI usage.
      const res = await getMovieEpisodes(slug.value, { limit: 500 });
      episodes.value = Array.isArray(res.items) ? res.items : [];
    }
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Failed to load player data');
  } finally {
    loading.value = false;
  }
}

async function saveProgress() {
  if (!movieData.value) {
    return;
  }

  if (!authStore.isLoggedIn) {
    statusMessage.value = 'Sign in to save progress.';
    return;
  }

  try {
    const video = videoRef.value;
    const currentSeconds = Math.max(0, Math.floor(Number(video?.currentTime) || 0));
    const durationSeconds = Number(video?.duration);
    const totalSeconds = Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.floor(durationSeconds)
      : (movieData.value.durationMinutes || 1) * 60;
    const computedProgress = totalSeconds > 0 ? (currentSeconds / totalSeconds) * 100 : 0;
    await upsertWatchlist({
      movieSlug: movieData.value.slug,
      progressSeconds: currentSeconds,
      isCompleted: computedProgress >= 95
    });
    statusMessage.value = 'Progress saved to watchlist.';
  } catch (err) {
    statusMessage.value = getApiErrorMessage(err, 'Failed to save progress');
  }
}

watch(slug, loadMovieForPlayer, { immediate: true });
watch(episodeId, (next) => {
  if (typeof next === 'string') {
    activeEpisodeId.value = next;
  }
});
watch(videoSrc, attachVideoListeners, { immediate: true });
onBeforeUnmount(() => {
  if (cleanupVideoListeners) cleanupVideoListeners();
});
</script>

<template>
  <div class="flex flex-col flex-1 bg-black">
    <div v-if="loading" class="flex flex-col items-center justify-center py-40">
      <span class="material-symbols-outlined animate-spin text-primary text-4xl mb-4">progress_activity</span>
      <p class="text-white/70 font-medium">Loading player...</p>
    </div>
    
    <div v-else-if="error" class="bg-red-900/40 text-red-400 p-6 m-6 lg:mx-20 rounded-2xl border border-red-900/50 backdrop-blur-md">
      {{ error }}
    </div>

    <template v-else-if="movieData">
      <div class="w-full relative aspect-video lg:max-h-[75vh] flex items-center justify-center overflow-hidden bg-black shadow-2xl">
        <video 
          ref="videoRef"
          class="w-full h-full object-contain"
          :src="videoSrc"
          controls
          autoplay
          :poster="movieData.backdropUrl || movieData.posterUrl"
          controlsList="nodownload"
        >
          Your browser does not support HTML5 video streaming.
        </video>
      </div>

      <!-- Content Below Player (Desktop mainly) -->
      <div class="max-w-[1440px] mx-auto px-6 md:px-10 py-8 w-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <!-- Left Column: Details -->
          <div class="lg:col-span-8 space-y-8">
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
              <div>
                <h2 class="text-3xl font-bold text-slate-900 dark:text-white">{{ movieData.title }}</h2>
                <p v-if="activeEpisode" class="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  EP {{ String(activeEpisode.epNo).padStart(2, '0') }}: {{ activeEpisode.title }}
                </p>
                <div class="flex flex-wrap items-center gap-3 mt-3 text-slate-500 dark:text-slate-400 text-sm font-medium">
                  <span class="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold border border-primary/20">{{ qualityLabel }}</span>
                  <span>{{ movieData.releaseYear }}</span>
                  <span>•</span>
                  <span>{{ movieData.type === 'series' ? 'Series' : (movieData.genres || [])[0] || 'Movie' }}</span>
                  <span>•</span>
                  <span>{{ formatRuntime(movieData.durationMinutes) }}</span>
                  <span>•</span>
                  <span class="flex items-center gap-1 text-yellow-500"><span class="material-symbols-outlined text-sm fill-1">star</span> {{ movieData.imdbRating?.toFixed(1) || 'N/A' }}</span>
                </div>
              </div>
              
              <div class="flex flex-col sm:flex-row flex-wrap gap-3 mt-4 sm:mt-0 w-full md:w-auto">
                <button @click="saveProgress" class="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold text-sm hover:bg-primary hover:text-white transition-all shadow-sm w-full sm:w-auto">
                  <span class="material-symbols-outlined text-lg">{{ progress >= 95 ? 'done_all' : 'bookmark' }}</span>
                  Save
                </button>
                <button class="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold text-sm hover:bg-primary hover:text-white transition-all shadow-sm w-full sm:w-auto">
                  <span class="material-symbols-outlined text-lg">share</span>
                  Share
                </button>
              </div>
            </div>
            
            <div v-if="statusMessage" class="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-4 rounded-xl border border-blue-100 dark:border-blue-900 text-sm font-medium flex items-center gap-2">
               <span class="material-symbols-outlined">info</span>
               {{ statusMessage }}
            </div>

            <!-- Server Selector Component -->
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-xl">dns</span>
                Select Streaming Server
              </h3>
              <div class="flex flex-wrap gap-3">
                <button 
                  v-for="server in [{id: 1, name: 'Server 1 (Auto)'}, {id: 2, name: 'Server 2 (HD)'}, {id: 3, name: 'Server 3 (Backup)'}]"
                  :key="server.id"
                  @click="activeServer = server.id"
                  :class="activeServer === server.id ? 'px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900' : 'px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors'"
                >{{ server.name }}</button>
              </div>
            </div>
            
            <div class="space-y-4">
               <h3 class="text-xl font-bold text-slate-900 dark:text-white">Synopsis</h3>
               <p class="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">{{ movieData.overview }}</p>
            </div>
          </div>

          <!-- Right Column: Episodes / Up Next -->
          <div class="lg:col-span-4 space-y-6">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ episodes.length ? 'Episodes' : 'Up Next' }}</h3>
            </div>

            <div v-if="episodes.length" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div class="max-h-[520px] overflow-auto divide-y divide-slate-100 dark:divide-slate-800">
                <button
                  v-for="ep in episodes"
                  :key="ep.id"
                  type="button"
                  class="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-3"
                  :class="String(ep.id) === String(activeEpisodeId) ? 'bg-primary/5' : ''"
                  @click="$router.push({ name: 'player', params: { slug: movieData.slug }, query: { episodeId: ep.id } })"
                >
                  <div class="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span class="text-sm font-black">{{ String(ep.epNo).padStart(2, '0') }}</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-3">
                      <p class="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {{ ep.title || `Episode ${ep.epNo}` }}
                      </p>
                      <span v-if="String(ep.id) === String(activeEpisodeId)" class="text-xs font-bold text-primary">Playing</span>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">
                      {{ ep.durationSeconds ? `${Math.round(ep.durationSeconds / 60)} min` : 'Video' }}
                    </p>
                  </div>
                  <span class="material-symbols-outlined text-slate-400">play_circle</span>
                </button>
              </div>
            </div>

            <div v-else class="p-6 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
              <div class="size-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-2">
                <span class="material-symbols-outlined text-3xl">movie_filter</span>
              </div>
              <h4 class="font-bold text-slate-900 dark:text-white text-lg">Cinema Mode Active</h4>
              <p class="text-sm text-slate-500 max-w-[240px]">Sit back, relax, and enjoy the show in full quality.</p>
            </div>

            <!-- Promotional Banner -->
            <div class="mt-8 p-6 bg-primary rounded-2xl text-white relative overflow-hidden group shadow-xl shadow-primary/20">
              <div class="relative z-10">
                <p class="text-xs font-bold uppercase tracking-widest opacity-80">Premium Plan</p>
                <h4 class="text-xl font-bold mt-1">Upgrade to 4K Ultra HD</h4>
                <button class="mt-5 bg-white text-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:scale-105 transition-transform shadow-lg">Learn More</button>
              </div>
              <span class="material-symbols-outlined absolute -bottom-6 -right-6 text-9xl opacity-20 group-hover:scale-110 transition-transform duration-500 rotate-12">workspace_premium</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
