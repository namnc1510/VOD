<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';

import MovieCard from '../components/MovieCard.vue';
import { getApiErrorMessage } from '../services/api';
import { getMovieEpisodes, getMovieLanding, postMovieComment } from '../services/discovery';
import { upsertWatchlist } from '../services/watchlist';
import { useAuthStore } from '../stores/auth';
import { formatNumber, formatRuntime, relativeFromNow } from '../utils/format';

const route = useRoute();
const authStore = useAuthStore();

const loading = ref(true);
const error = ref('');
const landing = ref(null);
const episodesLoading = ref(false);
const episodes = ref([]);
const commentText = ref('');
const submittingComment = ref(false);
const actionMessage = ref('');
const activeTab = ref('info');

const slug = computed(() => route.params.slug);

const headData = computed(() => {
  if (!landing.value?.movie) return { title: 'Loading...', meta: [] };
  return {
    title: `${landing.value.movie.title} - StreamVue`,
    meta: [
      { property: 'og:title', content: landing.value.movie.title },
      { property: 'og:image', content: landing.value.movie.posterUrl || landing.value.movie.backdropUrl },
      { property: 'og:description', content: landing.value.movie.overview || '' }
    ]
  };
});
useHead(headData);

const canComment = computed(() => authStore.isLoggedIn);

const trailerLink = computed(() => {
  const movie = landing.value?.movie;
  if (!movie) return '';

  const raw = String(movie.trailerUrl || '').trim();
  if (!raw) return '';

  if (raw.includes('example.com/trailers/')) {
    const title = String(movie.title || '').trim();
    if (!title) return '';
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer`)}`;
  }

  return raw;
});

const metaBadges = computed(() => {
  const movie = landing.value?.movie;
  if (!movie) return [];

  const badges = [];
  if (movie.quality) badges.push({ key: 'quality', label: String(movie.quality).toUpperCase(), tone: 'primary' });
  if (movie.type) {
    const label = String(movie.type).toLowerCase() === 'series' ? 'Series' : 'Movie';
    badges.push({ key: 'type', label, tone: 'slate' });
  }
  if (movie.status && movie.status !== 'released') {
    const label = movie.status === 'coming_soon' ? 'Coming Soon' : String(movie.status);
    badges.push({ key: 'status', label, tone: 'amber' });
  }
  if (typeof movie.views === 'number') badges.push({ key: 'views', label: `${formatNumber(movie.views)} views`, tone: 'slate' });
  return badges;
});

const watchNowTo = computed(() => {
  const slugValue = landing.value?.movie?.slug;
  if (!slugValue) return '';

  if (Array.isArray(episodes.value) && episodes.value.length > 0) {
    return { path: `/watch/${slugValue}`, query: { episodeId: episodes.value[0].id } };
  }

  return `/watch/${slugValue}`;
});

async function loadMovie() {
  loading.value = true;
  error.value = '';
  actionMessage.value = '';
  episodes.value = [];

  try {
    landing.value = await getMovieLanding(slug.value);

    // Load episodes if this title is a series (or if backend already has episodes).
    episodesLoading.value = true;
    try {
      const res = await getMovieEpisodes(slug.value, { limit: 500 });
      episodes.value = Array.isArray(res.items) ? res.items : [];
    } finally {
      episodesLoading.value = false;
    }
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Failed to load movie details');
  } finally {
    loading.value = false;
  }
}

async function addToWatchlist() {
  if (!landing.value?.movie) {
    return;
  }

  if (!authStore.isLoggedIn) {
    actionMessage.value = 'Sign in first to save watchlist.';
    return;
  }

  try {
    await upsertWatchlist({
      movieSlug: landing.value.movie.slug,
      progressSeconds: 0,
      isCompleted: false
    });
    actionMessage.value = 'Added to watchlist.';
  } catch (err) {
    actionMessage.value = getApiErrorMessage(err, 'Failed to add watchlist');
  }
}

async function submitComment() {
  const content = commentText.value.trim();
  if (!content) {
    return;
  }

  if (!authStore.isLoggedIn) {
    actionMessage.value = 'Sign in first to post comments.';
    return;
  }

  submittingComment.value = true;
  try {
    const comment = await postMovieComment(slug.value, { content });
    landing.value.comments.items.unshift(comment);
    landing.value.comments.total += 1;
    commentText.value = '';
    actionMessage.value = 'Comment posted.';
  } catch (err) {
    actionMessage.value = getApiErrorMessage(err, 'Failed to post comment');
  } finally {
    submittingComment.value = false;
  }
}

const toSlug = (text) => {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

watch(slug, loadMovie, { immediate: true });
</script>

<template>
  <div class="flex flex-col flex-1">
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 mx-6 lg:mx-20 mt-10 rounded-2xl border border-slate-100 dark:border-slate-800">
        <span class="material-symbols-outlined animate-spin text-primary text-4xl mb-4">progress_activity</span>
        <p class="text-slate-500 dark:text-slate-400 font-medium">Loading movie details...</p>
    </div>
    
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 text-red-500 p-6 mx-6 lg:mx-20 mt-10 rounded-2xl border border-red-100 dark:border-red-900">
        {{ error }}
    </div>

    <template v-else-if="landing">
      <!-- Hero Section -->
      <div class="relative w-full overflow-hidden -mt-8 -mx-6 md:-mx-20">
        <!-- Blurred Background Backdrop -->
        <div class="absolute inset-0 z-0">
          <div class="absolute inset-0 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/60 dark:via-background-dark/60 to-transparent z-10"></div>
          <div class="w-full h-full bg-cover bg-center scale-110 blur-3xl opacity-40 dark:opacity-20" :style="`background-image: url('${landing.movie.backdropUrl || landing.movie.posterUrl}')`"></div>
        </div>
        
        <!-- Hero Content -->
        <div class="relative z-20 px-6 md:px-20 pt-10 pb-12">
          <div class="flex flex-col md:flex-row gap-10 max-w-[1280px] mx-auto">
            <!-- Poster -->
            <div class="w-full max-w-[240px] md:max-w-none md:w-[320px] mx-auto md:mx-0 flex-shrink-0 shadow-2xl rounded-xl overflow-hidden aspect-[2/3] bg-slate-200 dark:bg-slate-800">
              <img :alt="landing.movie.title" loading="lazy" class="w-full h-full object-cover" :src="landing.movie.posterUrl || landing.movie.backdropUrl" />
            </div>
            
            <!-- Metadata -->
            <div class="flex flex-col justify-end gap-6 flex-1">
              <nav class="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                <RouterLink to="/" class="hover:text-primary">Home</RouterLink>
                <span class="material-symbols-outlined text-xs">chevron_right</span>
                <RouterLink to="/explore" class="hover:text-primary">Movies</RouterLink>
                <span class="material-symbols-outlined text-xs">chevron_right</span>
                <span class="text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-none">{{ landing.movie.title }}</span>
              </nav>
              
              <div class="space-y-4">
                <h1 class="text-slate-900 dark:text-white text-4xl md:text-6xl font-black tracking-tight leading-tight">{{ landing.movie.title }}</h1>
                <div v-if="metaBadges.length" class="flex flex-wrap gap-2">
                  <span
                    v-for="badge in metaBadges"
                    :key="badge.key"
                    class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border"
                    :class="badge.tone === 'primary'
                      ? 'bg-primary/15 text-primary border-primary/25'
                      : badge.tone === 'amber'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25'
                        : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20'"
                  >
                    {{ badge.label }}
                  </span>
                </div>
                <div class="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400 font-medium text-sm sm:text-base">
                  <span class="flex items-center gap-1">
                    <span class="material-symbols-outlined text-yellow-500 fill-1">star</span>
                    <span class="text-slate-900 dark:text-white">{{ landing.movie.imdbRating?.toFixed(1) || 'N/A' }}</span> IMDB
                  </span>
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span>{{ landing.movie.releaseYear || 'Unknown' }}</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span>{{ formatRuntime(landing.movie.durationMinutes) }}</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span>{{ (landing.movie.genres || []).map(g => g.name || g).join(', ') || 'Various' }}</span>
                </div>
              </div>
              
              <div class="flex flex-col sm:flex-row flex-wrap gap-4 pt-4 w-full">
                 <RouterLink v-if="!landing.movie.isPremiumLocked" :to="watchNowTo" class="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-bold hover:scale-105 transition-transform w-full sm:w-auto flex-1 sm:flex-none">
                   <span class="material-symbols-outlined">play_arrow</span>
                   Watch Now
                 </RouterLink>
                 <RouterLink v-else to="/pricing" class="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-900 rounded-xl font-black hover:scale-105 transition-transform w-full sm:w-auto flex-1 sm:flex-none shadow-lg shadow-amber-500/30 uppercase tracking-widest text-sm text-center">
                   <span class="material-symbols-outlined">workspace_premium</span>
                   Upgrade to {{ landing.movie.accessMode?.toUpperCase() || 'PREMIUM' }}
                 </RouterLink>
                <a
                  v-if="trailerLink"
                  :href="trailerLink"
                  target="_blank"
                  rel="noreferrer"
                  class="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 w-full sm:w-auto transition-colors flex-1 sm:flex-none"
                >
                  <span class="material-symbols-outlined">smart_display</span>
                  Trailer
                </a>
                <button @click="addToWatchlist" class="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 w-full sm:w-auto transition-colors flex-1 sm:flex-none">
                  <span class="material-symbols-outlined">add</span>
                  Add to Watchlist
                </button>
              </div>

               <div v-if="actionMessage" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-medium mt-2">
                  <span class="material-symbols-outlined text-lg">info</span>
                  {{ actionMessage }}
               </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Section -->
      <div class="py-12 max-w-[1280px] mx-auto w-full">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <!-- Left Column: Tabs and Info -->
          <div class="lg:col-span-8 space-y-8">
            <!-- Custom Tab Interface -->
            <div class="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
              <div class="flex gap-10 min-w-max">
                <button @click="activeTab = 'info'" :class="['pb-4 font-bold text-sm tracking-wide transition-colors', activeTab === 'info' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700']">DESCRIPTION & INFO</button>
                <button @click="activeTab = 'episodes'" :class="['pb-4 font-bold text-sm tracking-wide transition-colors', activeTab === 'episodes' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700']">EPISODES / SERVERS</button>
                <button @click="activeTab = 'comments'" :class="['pb-4 font-bold text-sm tracking-wide transition-colors', activeTab === 'comments' ? 'text-primary border-b-2 border-primary' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700']">COMMENTS ({{ landing.comments.total }})</button>
              </div>
            </div>
            
            <!-- Description Content -->
            <div v-show="activeTab === 'info'" class="space-y-6">
              <p class="text-lg leading-relaxed text-slate-700 dark:text-slate-300 pt-4">
                {{ landing.movie.overview || 'No description available for this movie.' }}
              </p>
              
              <!-- Cast & Crew Gallery Row -->
              <div v-if="(landing.movie.actors && landing.movie.actors.length) || (landing.movie.directors && landing.movie.directors.length)" class="py-8 border-y border-slate-200 dark:border-slate-800 space-y-8 overflow-hidden">
                
                <div v-if="landing.movie.directors && landing.movie.directors.length">
                  <h4 class="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-amber-500">movie_creation</span> Directors</h4>
                  <div class="flex gap-4 overflow-x-auto pb-4 snap-x hide-scroll">
                    <RouterLink v-for="director in landing.movie.directors" :key="director._id" :to="`/person/${director.slug}`" class="snap-start shrink-0 w-[140px] group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                       <div class="w-full aspect-square bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden relative">
                         <img v-if="director.avatarUrl" :src="director.avatarUrl" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                         <span v-else class="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">person</span>
                         <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       </div>
                       <div class="p-3 text-center">
                         <span class="block text-slate-900 dark:text-white font-bold group-hover:text-primary transition-colors text-sm line-clamp-1">{{ director.name }}</span>
                         <span class="block text-[11px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Director</span>
                       </div>
                    </RouterLink>
                  </div>
                </div>

                <div v-if="landing.movie.actors && landing.movie.actors.length">
                  <h4 class="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-amber-500">recent_actors</span> Top Cast</h4>
                  <div class="flex gap-4 overflow-x-auto pb-4 snap-x hide-scroll">
                    <RouterLink v-for="actor in landing.movie.actors" :key="actor._id" :to="`/person/${actor.slug}`" class="snap-start shrink-0 w-[140px] group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                       <div class="w-full aspect-[2/2.5] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden relative">
                         <img v-if="actor.avatarUrl" :src="actor.avatarUrl" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                         <span v-else class="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">person</span>
                         <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       </div>
                       <div class="p-3">
                         <span class="block text-slate-900 dark:text-white font-bold group-hover:text-primary transition-colors text-sm line-clamp-1 truncate" :title="actor.name">{{ actor.name }}</span>
                         <span class="block text-[11px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Actor</span>
                       </div>
                    </RouterLink>
                  </div>
                </div>
              </div>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6">
                <div>
                  <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Countries</h4>
                  <p class="text-slate-900 dark:text-white font-medium">{{ (landing.movie.countries || []).map(c => c.name || c).join(', ') || '-' }}</p>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Audio</h4>
                  <p class="text-slate-900 dark:text-white font-medium">{{ landing.movie.audioLanguage || '-' }}</p>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Age Rating</h4>
                  <p class="text-slate-900 dark:text-white font-medium">{{ landing.movie.ageRating || '-' }}</p>
                </div>
                <div v-if="landing.movie.director && (!landing.movie.directors || !landing.movie.directors.length)">
                  <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Director</h4>
                  <p class="text-slate-900 dark:text-white font-medium flex flex-wrap gap-1">
                    <RouterLink :to="`/person/${toSlug(landing.movie.director)}`" class="hover:text-primary transition-colors">{{ landing.movie.director }}</RouterLink>
                  </p>
                </div>
                <div class="sm:col-span-2" v-if="landing.movie.cast && landing.movie.cast.length && (!landing.movie.actors || !landing.movie.actors.length)">
                  <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Cast</h4>
                  <p class="text-slate-900 dark:text-white font-medium flex flex-wrap gap-1">
                    <span v-for="(actorName, index) in landing.movie.cast" :key="actorName">
                      <RouterLink :to="`/person/${toSlug(actorName)}`" class="hover:text-primary transition-colors">{{ actorName }}</RouterLink><span v-if="index < landing.movie.cast.length - 1" class="text-slate-400">, </span>
                    </span>
                  </p>
                </div>
              </div>

              <div v-if="landing.movie.tags && landing.movie.tags.length" class="space-y-3">
                <h3 class="text-xl font-bold text-slate-900 dark:text-white">Tags</h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in landing.movie.tags"
                    :key="tag"
                    class="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <div v-if="landing.movie.gallery && landing.movie.gallery.length" class="space-y-3">
                <div class="flex items-center justify-between">
                  <h3 class="text-xl font-bold text-slate-900 dark:text-white">Gallery</h3>
                  <span class="text-xs font-bold text-slate-500">{{ landing.movie.gallery.length }} photos</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <a
                    v-for="(img, idx) in landing.movie.gallery.slice(0, 12)"
                    :key="`${img}-${idx}`"
                    :href="img"
                    target="_blank"
                    rel="noreferrer"
                    class="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 aspect-video"
                    :title="`Open image ${idx + 1}`"
                  >
                    <img :src="img" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" />
                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                  </a>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'episodes'" class="pt-4 space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-xl font-bold text-slate-900 dark:text-white">Episodes</h3>
                  <span v-if="episodes && episodes.length" class="text-xs font-bold text-slate-500">{{ episodes.length }} eps</span>
                </div>

                <div
                  v-if="episodesLoading"
                  class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
                >
                  <span class="material-symbols-outlined animate-spin text-primary text-base">progress_activity</span>
                  Loading episodes...
                </div>

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <template v-if="!landing.movie.isPremiumLocked">
                    <RouterLink
                      v-for="ep in episodes"
                      :key="ep.id"
                      :to="{ path: `/watch/${landing.movie.slug}`, query: { episodeId: ep.id } }"
                      class="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-primary/60 hover:shadow-sm transition-all"
                    >
                      <div class="min-w-0">
                        <p class="text-sm font-black text-slate-900 dark:text-white truncate">
                          EP {{ String(ep.epNo).padStart(2, '0') }}: {{ ep.title }}
                        </p>
                        <p class="text-xs text-slate-500 mt-1">
                          {{ ep.durationSeconds ? `${Math.round(ep.durationSeconds / 60)} min` : 'Video' }}
                        </p>
                      </div>
                      <span class="material-symbols-outlined text-primary group-hover:translate-x-0.5 transition-transform">play_circle</span>
                    </RouterLink>
                  </template>
                  <template v-else>
                    <RouterLink
                      v-for="ep in episodes"
                      :key="`locked-${ep.id}`"
                      to="/pricing"
                      class="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4 hover:border-amber-500/60 hover:shadow-sm transition-all grayscale-[50%]"
                    >
                      <div class="min-w-0">
                        <p class="text-sm font-black text-slate-500 dark:text-slate-400 truncate flex items-center gap-2">
                          <span class="material-symbols-outlined text-sm text-amber-500">lock</span>
                          EP {{ String(ep.epNo).padStart(2, '0') }}: {{ ep.title }}
                        </p>
                        <p class="text-xs text-slate-400 mt-1 font-bold tracking-widest uppercase">Premium Only</p>
                      </div>
                    </RouterLink>
                  </template>
                </div>
              </div>

            <!-- Comments Section -->
            <div v-show="activeTab === 'comments'" class="pt-4 space-y-8">
               <h3 class="text-2xl font-bold text-slate-900 dark:text-white">Comments ({{ landing.comments.total }})</h3>
               
               <div class="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800/50">
                  <div class="flex gap-4">
                     <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0 overflow-hidden">
                        <span class="material-symbols-outlined w-full h-full flex items-center justify-center text-slate-400">person</span>
                     </div>
                     <div class="flex-1 space-y-3">
                        <textarea v-model="commentText" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:text-white resize-none" rows="3" placeholder="Share your thoughts about this movie..."></textarea>
                        <div class="flex justify-end">
                           <button class="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2" :disabled="submittingComment || !canComment" @click="submitComment">
                              <span v-if="submittingComment" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                              {{ submittingComment ? 'Posting...' : canComment ? 'Post Comment' : 'Sign In To Comment' }}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               <div class="space-y-6">
                  <div v-for="comment in landing.comments.items" :key="comment.id" class="flex gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
                     <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0 overflow-hidden">
                        <img v-if="comment.user && comment.user.avatarUrl" :src="comment.user.avatarUrl" :alt="comment.user.name || 'User'" loading="lazy" class="w-full h-full object-cover">
                        <span v-else class="material-symbols-outlined w-full h-full flex items-center justify-center text-slate-400">person</span>
                     </div>
                     <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                           <h4 class="font-bold text-slate-900 dark:text-white text-sm">{{ (comment.user && comment.user.name) ? comment.user.name : 'Deleted user' }}</h4>
                           <span class="text-xs text-slate-500">{{ relativeFromNow(comment.createdAt) }}</span>
                        </div>
                        <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{{ comment.content }}</p>
                     </div>
                  </div>
                  
                  <div v-if="!landing.comments.items.length" class="text-center py-8 text-slate-500 dark:text-slate-400">
                     No comments yet. Be the first to share your thoughts!
                  </div>
               </div>
            </div>

          </div>
          
          <!-- Right Column: Related Movies Sidebar -->
          <div class="lg:col-span-4 space-y-6">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold text-slate-900 dark:text-white">Related Movies</h3>
              <RouterLink to="/explore" class="text-primary text-sm font-bold hover:underline">View All</RouterLink>
            </div>
            
            <div class="space-y-4">
               <template v-if="landing.related && landing.related.length">
                   <RouterLink v-for="movie in landing.related.slice(0, 5)" :key="movie.id" :to="`/movies/${movie.slug}`" class="flex gap-4 group block">
                       <div class="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-800">
                         <img loading="lazy" class="w-full h-full object-cover group-hover:scale-110 transition-transform" :alt="movie.title" :src="movie.posterUrl || movie.backdropUrl" />
                       </div>
                      <div class="flex flex-col justify-center py-1">
                         <h4 class="font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2">{{ movie.title }}</h4>
                         <p class="text-xs text-slate-500 mt-1">{{ movie.releaseYear }} • {{ movie.genres?.[0] || 'Movie' }} • {{ movie.imdbRating?.toFixed(1) || 'N/A' }}</p>
                         <div class="mt-auto text-xs font-bold text-primary flex items-center gap-1">
                            <span class="material-symbols-outlined text-sm">play_circle</span> WATCH
                         </div>
                      </div>
                   </RouterLink>
               </template>
               <div v-else class="text-sm text-slate-500 dark:text-slate-400 text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  No related movies found.
               </div>
            </div>
            
            <!-- Ad/Promo Card -->
            <div class="mt-8 p-6 rounded-2xl bg-primary/10 border border-primary/20">
              <h4 class="font-bold text-primary text-sm mb-2">STREAMVUE PREMIUM</h4>
              <p class="text-xs text-slate-600 dark:text-slate-400 mb-4">Ad-free streaming, 4K UHD quality, and offline downloads.</p>
              <button class="w-full py-3 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors">UPGRADE NOW</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
