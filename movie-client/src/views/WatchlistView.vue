<script setup>
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import { getApiErrorMessage } from '../services/api';
import { getWatchlist, removeWatchlist, upsertWatchlist } from '../services/watchlist';
import { useAuthStore } from '../stores/auth';
import { formatRuntime } from '../utils/format';

const authStore = useAuthStore();

const loading = ref(false);
const error = ref('');
const items = ref([]);
const info = ref('');

const totalItems = computed(() => items.value.length);

async function loadWatchlist() {
  if (!authStore.isLoggedIn) {
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const result = await getWatchlist();
    items.value = result.items;
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Failed to load watchlist');
  } finally {
    loading.value = false;
  }
}

async function removeItem(movieId) {
  try {
    await removeWatchlist(movieId);
    items.value = items.value.filter((item) => item.movie.id !== movieId);
    info.value = 'Removed from watchlist.';
  } catch (err) {
    info.value = getApiErrorMessage(err, 'Failed to remove item');
  }
}

async function markCompleted(item) {
  try {
    await upsertWatchlist({ movieId: item.movie.id, progressSeconds: item.progressSeconds, isCompleted: true });
    await loadWatchlist();
    info.value = 'Marked as completed.';
  } catch (err) {
    info.value = getApiErrorMessage(err, 'Failed to update watchlist');
  }
}

onMounted(loadWatchlist);
</script>

<template>
  <div class="flex flex-col flex-1">
    <!-- User Profile Header Section (mocked for visual consistency) -->
    <div class="px-6 md:px-10 py-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 -mx-6 md:-mx-10 -mt-8 mb-8">
      <div class="max-w-[1280px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-center gap-6">
          <div class="size-20 md:size-24 bg-slate-200 dark:bg-slate-800 rounded-full ring-4 ring-primary/10 overflow-hidden shrink-0 flex items-center justify-center">
             <span class="material-symbols-outlined text-4xl text-slate-400">person</span>
          </div>
          <div class="space-y-1">
            <h1 class="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{{ authStore.user?.name || 'My Profile' }}</h1>
            <div class="flex flex-wrap items-center gap-4 text-slate-500 text-sm">
              <span class="flex items-center gap-1"><span class="material-symbols-outlined text-lg">movie</span> {{ totalItems }} Movies in Watchlist</span>
              <span v-if="authStore.isLoggedIn" class="bg-primary/10 text-primary px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">Member</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tabs -->
      <div class="flex mt-8 gap-8 max-w-[1280px] mx-auto overflow-x-auto">
        <div class="pb-4 text-sm font-bold border-b-2 border-primary text-primary flex items-center gap-2 whitespace-nowrap">
          <span class="material-symbols-outlined text-lg">bookmark</span> Watchlist
        </div>
      </div>
    </div>

    <div class="max-w-[1280px] mx-auto w-full">
      <div v-if="!authStore.isLoggedIn" class="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center px-4">
        <span class="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">lock</span>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Authentication Required</h3>
        <p class="text-slate-500 mb-6 max-w-md">You need to sign in to your account to view and manage your watchlist.</p>
        <RouterLink to="/login" class="bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
          Sign In
        </RouterLink>
      </div>

      <template v-else>
        <div v-if="loading" class="flex flex-col items-center justify-center py-20">
          <span class="material-symbols-outlined animate-spin text-primary text-4xl mb-4">progress_activity</span>
          <p class="text-slate-500 font-medium">Loading your watchlist...</p>
        </div>
        
        <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 text-red-500 p-6 rounded-2xl border border-red-100 dark:border-red-900 mb-8">
          {{ error }}
        </div>
        
        <div v-else-if="!items.length" class="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center px-4">
          <span class="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">bookmark_border</span>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Your watchlist is empty</h3>
          <p class="text-slate-500 mb-6 max-w-md">Explore our catalog and add movies you want to watch later.</p>
          <RouterLink to="/explore" class="bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-primary/90 transition-colors">
            Explore Movies
          </RouterLink>
        </div>

        <div v-else class="space-y-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">My Watchlist <span class="text-slate-400 font-normal ml-2">({{ totalItems }} titles)</span></h2>
          </div>

          <div v-if="info" class="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-4 rounded-xl border border-blue-100 dark:border-blue-900 text-sm font-medium flex items-center gap-2">
            <span class="material-symbols-outlined">info</span>
            {{ info }}
          </div>

          <!-- Movie Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              <div v-for="item in items" :key="item.id" class="group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300">
                <div class="relative flex-shrink-0 aspect-[2/3] overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <img :src="item.movie.posterUrl || item.movie.backdropUrl" :alt="item.movie.title" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />

                  <div class="absolute top-3 right-3 flex flex-col gap-2 items-end">
                    <div class="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-white">
                      {{ item.movie.quality || 'HD' }}
                    </div>
                    <div v-if="item.movie.type" class="bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-[11px] font-bold text-white/95 tracking-wide uppercase">
                      {{ String(item.movie.type).toLowerCase() === 'series' ? 'Series' : 'Movie' }}
                    </div>
                  </div>
                 
                 <!-- Overlay Actions -->
                 <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                   <RouterLink :to="`/watch/${item.movie.slug}`" class="w-full bg-primary text-white py-2 rounded-xl text-sm font-bold text-center hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                     <span class="material-symbols-outlined text-lg">play_arrow</span> Resume
                  </RouterLink>
                  <RouterLink :to="`/movies/${item.movie.slug}`" class="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white py-2 rounded-xl text-sm font-bold text-center transition-colors">
                    Details
                  </RouterLink>
                </div>
                
                <div v-if="item.isCompleted" class="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                   <span class="material-symbols-outlined text-sm">check_circle</span> Watched
                </div>
              </div>
              
              <div class="p-4 flex flex-col flex-1">
                <h3 class="font-bold text-slate-900 dark:text-white line-clamp-1 mb-1" :title="item.movie.title">{{ item.movie.title }}</h3>
                <p class="text-xs text-slate-500 mb-3">{{ item.movie.releaseYear }} • {{ (item.movie.genres || [])[0] || 'Movie' }} • {{ formatRuntime(item.movie.durationMinutes) }}</p>
                
                <!-- Progress Bar -->
                <div class="mt-auto space-y-2">
                   <div class="flex justify-between text-xs font-medium text-slate-500">
                      <span>Progress</span>
                      <span>{{ Math.round((item.progressSeconds / Math.max(1, item.movie.durationMinutes * 60)) * 100) }}%</span>
                   </div>
                   <div class="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div class="h-full bg-primary rounded-full transition-all duration-500" :style="`width: ${Math.min(100, (item.progressSeconds / Math.max(1, item.movie.durationMinutes * 60)) * 100)}%`"></div>
                   </div>
                   
                   <div class="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                      <button @click="markCompleted(item)" class="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-green-500 dark:hover:text-green-400 flex items-center justify-center gap-1 py-1 transition-colors">
                         <span class="material-symbols-outlined text-sm">done_all</span> Finish
                      </button>
                      <button @click="removeItem(item.movie.id)" class="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center gap-1 py-1 transition-colors">
                         <span class="material-symbols-outlined text-sm">delete</span> Remove
                      </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
