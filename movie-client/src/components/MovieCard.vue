<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { formatNumber, formatRating } from '../utils/format';

const props = defineProps({
  movie: {
    type: Object,
    required: true
  },
  compact: {
    type: Boolean,
    default: false
  }
});

const genresLabel = computed(() => {
  const genres = Array.isArray(props.movie.genres) ? props.movie.genres : [];
  return genres.slice(0, 2).join(' • ') || props.movie.genre || 'Unknown';
});

const coverUrl = computed(() => props.movie.posterUrl || props.movie.backdropUrl || '');

const typeLabel = computed(() => {
  const raw = String(props.movie.type || '').trim().toLowerCase();
  if (!raw) return '';
  return raw === 'series' ? 'Series' : 'Movie';
});

const viewsLabel = computed(() => {
  const views = Number(props.movie.views);
  if (!Number.isFinite(views) || views <= 0) return '';
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  return String(views);
});
</script>

<template>
  <div class="flex flex-col gap-3 group cursor-pointer" :class="compact ? 'w-full' : 'w-[160px] md:w-[220px] shrink-0 snap-start'">
    <div class="relative w-full aspect-[2/3] overflow-hidden rounded-2xl shadow-lg transition-all duration-500 group-hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] dark:group-hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.1)] ring-1 ring-slate-900/5 dark:ring-white/10 group-hover:ring-primary/50 group-hover:ring-2">
      <!-- Image with Zoom and Saturate effect -->
      <img v-if="coverUrl" :src="coverUrl" loading="lazy" class="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:saturate-[1.15] group-hover:contrast-[1.05]" alt="Movie cover" />
      <div v-else class="absolute inset-0 bg-slate-800 flex items-center justify-center transition-all duration-500 group-hover:bg-slate-700">
        <span class="material-symbols-outlined text-white/50 text-5xl">movie</span>
      </div>
      
      <!-- Subtle vignette gradient for depth -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30 pointer-events-none opacity-60 group-hover:opacity-40 transition-opacity duration-500"></div>
      
      <!-- Hover Overlay -->
      <RouterLink :to="`/movies/${movie.slug}`" class="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-10 backdrop-blur-[1px]">
        <div class="relative flex items-center justify-center transform scale-50 group-hover:scale-100 transition-all duration-500 ease-out">
          <!-- Ping Effect -->
          <div class="absolute inset-0 rounded-full bg-primary animate-ping opacity-0 group-hover:opacity-40 duration-1000"></div>
          <!-- Play Button -->
          <div class="relative size-16 rounded-full bg-primary text-white flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]">
            <span class="material-symbols-outlined text-4xl ml-1">play_arrow</span>
          </div>
        </div>
      </RouterLink>

      <!-- Top Right: Rating -->
      <div class="absolute top-2.5 right-2.5 bg-amber-400 text-black px-2 py-1 rounded-full text-[11px] font-black tracking-wide flex items-center gap-1 z-20 shadow-[0_0_15px_rgba(251,191,36,0.6)]">
        <span class="material-symbols-outlined text-[14px] fill-current">star</span> {{ formatRating(movie.imdbRating ?? movie.rating) }}
      </div>
      
      <!-- Top Left: Badges -->
      <div class="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-20">
        <div class="bg-primary backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest flex items-center justify-center gap-1 text-white uppercase shadow-[0_0_15px_rgba(0,0,0,0.4)]">
          {{ movie.quality || 'HD' }}
        </div>
        <div v-if="typeLabel" class="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-black text-white/95 tracking-widest uppercase border border-white/20 shadow-sm text-center">
          {{ typeLabel }}
        </div>
      </div>
    </div>
    
    <!-- Content Below Image -->
    <div class="px-1 flex flex-col gap-1">
      <RouterLink :to="`/movies/${movie.slug}`" class="text-slate-900 dark:text-white text-[15px] font-extrabold line-clamp-2 block hover:text-primary transition-colors tracking-tight leading-tight" :title="movie.title">
        {{ movie.title }}
      </RouterLink>
      
      <p class="text-slate-500 dark:text-slate-400 text-[12px] font-medium truncate mt-0.5">
        {{ genresLabel }}
      </p>
      
      <div class="flex items-center gap-2 mt-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
        <span class="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-full">
           <span class="material-symbols-outlined text-[13px]">calendar_today</span> {{ movie.releaseYear || '-' }}
        </span>
        <span v-if="viewsLabel" class="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-full">
           <span class="material-symbols-outlined text-[13px]">visibility</span> {{ viewsLabel }}
        </span>
      </div>
    </div>
  </div>
</template>
