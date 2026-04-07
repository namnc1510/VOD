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
const movie = computed(() => landing.value?.movie || null);
const commentsState = computed(() => landing.value?.comments || { items: [], total: 0 });
const relatedMovies = computed(() => (Array.isArray(landing.value?.related) ? landing.value.related : []));

const headData = computed(() => {
  if (!movie.value) return { title: 'Loading...', meta: [] };

  return {
    title: `${movie.value.title} - StreamVue`,
    meta: [
      { property: 'og:title', content: movie.value.title },
      { property: 'og:image', content: movie.value.posterUrl || movie.value.backdropUrl },
      { property: 'og:description', content: movie.value.overview || '' }
    ]
  };
});
useHead(headData);

const canComment = computed(() => authStore.isLoggedIn);

const trailerLink = computed(() => {
  if (!movie.value) return '';

  const raw = String(movie.value.trailerUrl || '').trim();
  if (!raw) return '';

  if (raw.includes('example.com/trailers/')) {
    const title = String(movie.value.title || '').trim();
    return title ? `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} trailer`)}` : '';
  }

  return raw;
});

const metaBadges = computed(() => {
  if (!movie.value) return [];

  const badges = [];
  if (movie.value.quality) badges.push({ key: 'quality', label: String(movie.value.quality).toUpperCase(), tone: 'primary' });
  if (movie.value.type) {
    badges.push({
      key: 'type',
      label: String(movie.value.type).toLowerCase() === 'series' ? 'Series' : 'Movie',
      tone: 'slate'
    });
  }
  if (movie.value.status && movie.value.status !== 'released') {
    badges.push({
      key: 'status',
      label: movie.value.status === 'coming_soon' ? 'Coming Soon' : String(movie.value.status),
      tone: 'amber'
    });
  }
  if (typeof movie.value.views === 'number') {
    badges.push({ key: 'views', label: `${formatNumber(movie.value.views)} views`, tone: 'slate' });
  }
  return badges;
});

const watchNowTo = computed(() => {
  const movieSlug = movie.value?.slug;
  if (!movieSlug) return '';
  if (Array.isArray(episodes.value) && episodes.value.length > 0) {
    return { path: `/watch/${movieSlug}`, query: { episodeId: episodes.value[0].id } };
  }
  return `/watch/${movieSlug}`;
});

const movieFacts = computed(() => {
  if (!movie.value) return [];

  return [
    { label: 'Năm phát hành', value: movie.value.releaseYear || 'N/A' },
    { label: 'Thời lượng', value: formatRuntime(movie.value.durationMinutes) },
    { label: 'Ngôn ngữ', value: movie.value.audioLanguage || '-' },
    { label: 'Độ tuổi', value: movie.value.ageRating || '-' },
    {
      label: 'Quốc gia',
      value: (movie.value.countries || []).map((country) => country.name || country).join(', ') || '-'
    }
  ];
});

function resolvePersonLink(person) {
  const value = typeof person === 'object' ? person : { name: String(person || '') };
  return `/person/${value.slug || toSlug(value.name)}`;
}

async function loadMovie() {
  loading.value = true;
  error.value = '';
  actionMessage.value = '';
  episodes.value = [];

  try {
    landing.value = await getMovieLanding(slug.value);
    if (!landing.value.comments) {
      landing.value.comments = { items: [], total: 0 };
    }

    episodesLoading.value = true;
    try {
      const response = await getMovieEpisodes(slug.value, { limit: 500 });
      episodes.value = Array.isArray(response.items) ? response.items : [];
    } finally {
      episodesLoading.value = false;
    }
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Không thể tải chi tiết phim');
  } finally {
    loading.value = false;
  }
}

async function addToWatchlist() {
  if (!movie.value) return;

  if (!authStore.isLoggedIn) {
    actionMessage.value = 'Đăng nhập để lưu phim vào watchlist.';
    return;
  }

  try {
    await upsertWatchlist({
      movieSlug: movie.value.slug,
      progressSeconds: 0,
      isCompleted: false
    });
    actionMessage.value = 'Đã thêm phim vào watchlist.';
  } catch (err) {
    actionMessage.value = getApiErrorMessage(err, 'Không thể thêm vào watchlist');
  }
}

async function submitComment() {
  const content = commentText.value.trim();
  if (!content) return;

  if (!authStore.isLoggedIn) {
    actionMessage.value = 'Đăng nhập để gửi bình luận.';
    return;
  }

  submittingComment.value = true;

  try {
    const comment = await postMovieComment(slug.value, { content });
    if (!landing.value.comments) {
      landing.value.comments = { items: [], total: 0 };
    }
    landing.value.comments.items.unshift(comment);
    landing.value.comments.total += 1;
    commentText.value = '';
    actionMessage.value = 'Đã gửi bình luận.';
  } catch (err) {
    actionMessage.value = getApiErrorMessage(err, 'Không thể gửi bình luận');
  } finally {
    submittingComment.value = false;
  }
}

function toSlug(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

watch(slug, loadMovie, { immediate: true });
</script>

<template>
  <div class="page-shell">
    <section v-if="loading" class="panel-surface flex min-h-[460px] flex-col items-center justify-center gap-3 p-10 text-center">
      <span class="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      <p class="text-base font-semibold text-slate-600 dark:text-slate-300">Đang tải trang chi tiết phim...</p>
    </section>

    <div v-else-if="error" class="status-card status-error">
      <span class="material-symbols-outlined text-[18px]">error</span>
      <span>{{ error }}</span>
    </div>

    <template v-else-if="movie">
      <section class="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-slate-950 shadow-[0_28px_90px_-44px_rgba(15,23,42,0.8)] dark:border-white/10">
        <div class="absolute inset-0">
          <div class="absolute inset-0 bg-cover bg-center blur-sm opacity-55" :style="{ backgroundImage: `url(${movie.backdropUrl || movie.posterUrl})` }"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/82 to-slate-950/24"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent"></div>
        </div>

        <div class="relative z-10 grid gap-8 p-6 sm:p-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:p-10 xl:p-12">
          <div class="overflow-hidden rounded-[28px] bg-slate-900/60 shadow-2xl">
            <img :src="movie.posterUrl || movie.backdropUrl" :alt="movie.title" class="h-full w-full object-cover" loading="lazy" />
          </div>

          <div class="flex flex-col justify-end gap-6 text-white">
            <nav class="flex flex-wrap items-center gap-2 text-sm font-medium text-white/70">
              <RouterLink to="/" class="hover:text-white">Home</RouterLink>
              <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              <RouterLink to="/explore" class="hover:text-white">Explore</RouterLink>
              <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              <span class="text-white">{{ movie.title }}</span>
            </nav>

            <div>
              <h1 class="text-4xl font-black leading-[0.94] tracking-tight sm:text-5xl xl:text-6xl">{{ movie.title }}</h1>
              <div class="mt-5 flex flex-wrap gap-2.5">
                <span
                  v-for="badge in metaBadges"
                  :key="badge.key"
                  class="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em]"
                  :class="
                    badge.tone === 'primary'
                      ? 'border-primary/35 bg-primary/16 text-primary'
                      : badge.tone === 'amber'
                        ? 'border-amber-400/30 bg-amber-400/15 text-amber-300'
                        : 'border-white/12 bg-white/8 text-white/85'
                  "
                >
                  {{ badge.label }}
                </span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3 text-sm font-semibold text-white/72 sm:text-base">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1">
                <span class="material-symbols-outlined text-[18px] text-amber-300">star</span>
                {{ movie.imdbRating?.toFixed(1) || 'N/A' }} IMDb
              </span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1">{{ movie.releaseYear || 'N/A' }}</span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1">{{ formatRuntime(movie.durationMinutes) }}</span>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1">
                {{ (movie.genres || []).map((genre) => genre.name || genre).join(' / ') || 'Various' }}
              </span>
            </div>

            <p class="max-w-3xl text-base leading-8 text-white/78 sm:text-lg">
              {{ movie.overview || 'Chưa có mô tả cho phim này.' }}
            </p>

            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <RouterLink
                v-if="!movie.isPremiumLocked"
                :to="watchNowTo"
                class="action-primary min-w-[180px]"
              >
                <span class="material-symbols-outlined text-[18px]">play_arrow</span>
                Xem ngay
              </RouterLink>
              <RouterLink
                v-else
                to="/pricing"
                class="action-primary min-w-[220px] bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
              >
                <span class="material-symbols-outlined text-[18px]">workspace_premium</span>
                Nâng cấp để xem
              </RouterLink>

              <a
                v-if="trailerLink"
                :href="trailerLink"
                target="_blank"
                rel="noreferrer"
                class="action-secondary min-w-[160px] border-white/16 bg-white/8 text-white hover:bg-white/12 dark:border-white/16 dark:bg-white/8 dark:text-white"
              >
                <span class="material-symbols-outlined text-[18px]">smart_display</span>
                Trailer
              </a>

              <button type="button" class="action-secondary min-w-[180px] border-white/16 bg-white/8 text-white hover:bg-white/12 dark:border-white/16 dark:bg-white/8 dark:text-white" @click="addToWatchlist">
                <span class="material-symbols-outlined text-[18px]">bookmark_add</span>
                Thêm vào watchlist
              </button>
            </div>

            <div v-if="actionMessage" class="status-card status-info max-w-2xl border-white/10 bg-white/10 text-white">
              <span class="material-symbols-outlined text-[18px]">info</span>
              <span>{{ actionMessage }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <div class="space-y-6">
          <div class="panel-surface overflow-hidden">
            <div class="flex gap-2 overflow-x-auto border-b border-slate-200/80 px-4 py-4 dark:border-slate-800">
              <button
                type="button"
                class="rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.16em] transition-colors"
                :class="activeTab === 'info' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
                @click="activeTab = 'info'"
              >
                Tổng quan
              </button>
              <button
                type="button"
                class="rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.16em] transition-colors"
                :class="activeTab === 'episodes' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
                @click="activeTab = 'episodes'"
              >
                Tập phim
              </button>
              <button
                type="button"
                class="rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.16em] transition-colors"
                :class="activeTab === 'comments' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'"
                @click="activeTab = 'comments'"
              >
                Bình luận ({{ commentsState.total }})
              </button>
            </div>

            <div v-show="activeTab === 'info'" class="p-6 sm:p-7">
              <div class="section-head">
                <div>
                  <h2 class="section-title">Thông tin phim</h2>
                  <p class="section-copy">Tổng hợp nội dung, credit và metadata theo cùng hệ panel với các trang khác.</p>
                </div>
              </div>

              <div class="mt-6 grid gap-4 sm:grid-cols-2">
                <article v-for="fact in movieFacts" :key="fact.label" class="panel-muted p-5">
                  <p class="control-label">{{ fact.label }}</p>
                  <p class="text-base font-bold text-slate-900 dark:text-white">{{ fact.value }}</p>
                </article>
              </div>

              <div
                v-if="(movie.directors && movie.directors.length) || (movie.actors && movie.actors.length)"
                class="mt-8 grid gap-6 xl:grid-cols-2"
              >
                <div v-if="movie.directors && movie.directors.length" class="space-y-4">
                  <h3 class="text-xl font-black text-slate-900 dark:text-white">Đạo diễn</h3>
                  <div class="grid gap-3 sm:grid-cols-2">
                    <RouterLink
                      v-for="director in movie.directors"
                      :key="director._id || director.slug || director.name"
                      :to="resolvePersonLink(director)"
                      class="panel-muted flex items-center gap-3 p-4 transition-colors hover:border-primary/25 hover:bg-white dark:hover:bg-slate-900"
                    >
                      <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800">
                        <img v-if="director.avatarUrl" :src="director.avatarUrl" :alt="director.name" class="h-full w-full object-cover" loading="lazy" />
                        <span v-else class="material-symbols-outlined text-slate-400">person</span>
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-black text-slate-900 dark:text-white">{{ director.name }}</p>
                        <p class="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Director</p>
                      </div>
                    </RouterLink>
                  </div>
                </div>

                <div v-if="movie.actors && movie.actors.length" class="space-y-4">
                  <h3 class="text-xl font-black text-slate-900 dark:text-white">Diễn viên</h3>
                  <div class="grid gap-3 sm:grid-cols-2">
                    <RouterLink
                      v-for="actor in movie.actors"
                      :key="actor._id || actor.slug || actor.name"
                      :to="resolvePersonLink(actor)"
                      class="panel-muted flex items-center gap-3 p-4 transition-colors hover:border-primary/25 hover:bg-white dark:hover:bg-slate-900"
                    >
                      <div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800">
                        <img v-if="actor.avatarUrl" :src="actor.avatarUrl" :alt="actor.name" class="h-full w-full object-cover" loading="lazy" />
                        <span v-else class="material-symbols-outlined text-slate-400">person</span>
                      </div>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-black text-slate-900 dark:text-white">{{ actor.name }}</p>
                        <p class="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Actor</p>
                      </div>
                    </RouterLink>
                  </div>
                </div>
              </div>

              <div v-if="movie.tags && movie.tags.length" class="mt-8 space-y-4">
                <h3 class="text-xl font-black text-slate-900 dark:text-white">Tags</h3>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in movie.tags"
                    :key="tag"
                    class="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <div v-if="movie.gallery && movie.gallery.length" class="mt-8 space-y-4">
                <div class="section-head">
                  <div>
                    <h3 class="text-xl font-black text-slate-900 dark:text-white">Gallery</h3>
                    <p class="section-copy mt-1 text-sm">Ảnh hậu trường và ảnh quảng bá đã được gom vào cùng một grid.</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <a
                    v-for="(image, index) in movie.gallery.slice(0, 12)"
                    :key="`${image}-${index}`"
                    :href="image"
                    target="_blank"
                    rel="noreferrer"
                    class="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div class="aspect-video">
                      <img :src="image" alt="" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                    </div>
                  </a>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'episodes'" class="p-6 sm:p-7">
              <div class="section-head">
                <div>
                  <h2 class="section-title">Danh sách tập / server</h2>
                  <p class="section-copy">Đi thẳng tới tập đầu tiên hoặc chuyển sang màn player với episode được chọn.</p>
                </div>
              </div>

              <div v-if="episodesLoading" class="status-card status-info mt-6">
                <span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                <span>Đang tải danh sách tập...</span>
              </div>

              <div v-else-if="episodes.length" class="mt-6 grid gap-3 sm:grid-cols-2">
                <RouterLink
                  v-for="episode in episodes"
                  :key="episode.id"
                  :to="movie.isPremiumLocked ? '/pricing' : { path: `/watch/${movie.slug}`, query: { episodeId: episode.id } }"
                  class="rounded-2xl border p-4 transition-colors"
                  :class="
                    movie.isPremiumLocked
                      ? 'border-amber-500/18 bg-amber-500/8 text-slate-700 dark:text-slate-200'
                      : 'border-slate-200 bg-slate-50 hover:border-primary/28 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900'
                  "
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-black text-slate-900 dark:text-white">
                        Tập {{ String(episode.epNo).padStart(2, '0') }}: {{ episode.title }}
                      </p>
                      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {{ episode.durationSeconds ? `${Math.round(episode.durationSeconds / 60)} phút` : 'Video stream' }}
                      </p>
                    </div>
                    <span class="material-symbols-outlined text-primary">{{ movie.isPremiumLocked ? 'lock' : 'play_circle' }}</span>
                  </div>
                </RouterLink>
              </div>

              <div v-else class="empty-state mt-6">
                <div class="flex size-18 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <span class="material-symbols-outlined text-4xl">movie</span>
                </div>
                <h3 class="section-title">Đây là phim lẻ.</h3>
                <p class="page-copy text-center">Không có danh sách tập riêng cho nội dung này, bạn có thể xem trực tiếp bằng nút “Xem ngay”.</p>
              </div>
            </div>

            <div v-show="activeTab === 'comments'" class="p-6 sm:p-7">
              <div class="section-head">
                <div>
                  <h2 class="section-title">Bình luận</h2>
                  <p class="section-copy">Trao đổi cảm nhận trực tiếp dưới trang chi tiết phim.</p>
                </div>
              </div>

              <div class="panel-muted mt-6 p-5">
                <textarea
                  v-model="commentText"
                  class="control-field min-h-[120px] resize-none"
                  placeholder="Chia sẻ cảm nhận của bạn về bộ phim này..."
                ></textarea>
                <div class="mt-4 flex justify-end">
                  <button type="button" class="action-primary" :disabled="submittingComment || !canComment" @click="submitComment">
                    <span v-if="submittingComment" class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span v-else>{{ canComment ? 'Gửi bình luận' : 'Đăng nhập để bình luận' }}</span>
                  </button>
                </div>
              </div>

              <div v-if="commentsState.items.length" class="mt-6 space-y-4">
                <article
                  v-for="comment in commentsState.items"
                  :key="comment.id"
                  class="panel-muted p-5"
                >
                  <div class="flex items-start gap-4">
                    <div class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <img
                        v-if="comment.user && comment.user.avatarUrl"
                        :src="comment.user.avatarUrl"
                        :alt="comment.user.name || 'User'"
                        class="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <span v-else class="material-symbols-outlined text-slate-400">person</span>
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="text-sm font-black text-slate-900 dark:text-white">
                          {{ comment.user?.name || 'Deleted user' }}
                        </p>
                        <span class="text-xs text-slate-500 dark:text-slate-400">{{ relativeFromNow(comment.createdAt) }}</span>
                      </div>
                      <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ comment.content }}</p>
                    </div>
                  </div>
                </article>
              </div>

              <div v-else class="empty-state mt-6">
                <div class="flex size-18 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  <span class="material-symbols-outlined text-4xl">chat</span>
                </div>
                <h3 class="section-title">Chưa có bình luận nào.</h3>
                <p class="page-copy text-center">Hãy là người đầu tiên để lại cảm nhận cho bộ phim này.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <article class="panel-surface p-6">
            <div class="section-head">
              <div>
                <h2 class="section-title">Phim liên quan</h2>
                <p class="section-copy">Các đề xuất gần nhất dựa trên title hiện tại.</p>
              </div>
              <RouterLink to="/explore" class="text-sm font-bold text-primary hover:underline">Mở thư viện</RouterLink>
            </div>

            <div v-if="relatedMovies.length" class="mt-6 space-y-4">
              <RouterLink
                v-for="related in relatedMovies.slice(0, 5)"
                :key="related.id"
                :to="`/movies/${related.slug}`"
                class="group flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-primary/25 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900"
              >
                <div class="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800">
                  <img :src="related.posterUrl || related.backdropUrl" :alt="related.title" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                </div>
                <div class="min-w-0 py-1">
                  <h3 class="line-clamp-2 text-sm font-black text-slate-900 dark:text-white">{{ related.title }}</h3>
                  <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {{ related.releaseYear || 'N/A' }} • {{ related.imdbRating?.toFixed(1) || 'N/A' }} IMDb
                  </p>
                  <p class="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">Open detail</p>
                </div>
              </RouterLink>
            </div>

            <div v-else class="empty-state mt-6">
              <div class="flex size-18 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <span class="material-symbols-outlined text-4xl">video_search</span>
              </div>
              <h3 class="section-title">Chưa có phim liên quan.</h3>
              <p class="page-copy text-center">Hệ thống hiện chưa trả về danh sách đề xuất cho phim này.</p>
            </div>
          </article>

          <article class="panel-surface p-6">
            <div class="section-head">
              <div>
                <h2 class="section-title">Hành động nhanh</h2>
                <p class="section-copy">Các bước phổ biến được gom lại thành một cụm phụ trợ.</p>
              </div>
            </div>
            <div class="mt-6 space-y-3">
              <RouterLink :to="watchNowTo" class="action-primary w-full justify-start">
                <span class="material-symbols-outlined text-[18px]">play_arrow</span>
                Phát ngay
              </RouterLink>
              <button type="button" class="action-secondary w-full justify-start" @click="addToWatchlist">
                <span class="material-symbols-outlined text-[18px]">bookmark_add</span>
                Lưu vào watchlist
              </button>
              <RouterLink to="/pricing" class="action-secondary w-full justify-start">
                <span class="material-symbols-outlined text-[18px]">workspace_premium</span>
                Xem các gói VIP
              </RouterLink>
            </div>
          </article>
        </div>
      </section>

      <section v-if="relatedMovies.length" class="space-y-5">
        <div class="section-head">
          <div>
            <h2 class="section-title">Có thể bạn cũng thích</h2>
            <p class="section-copy">Grid phim liên quan theo cùng nhịp trình bày với explore và home.</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <MovieCard v-for="related in relatedMovies.slice(0, 8)" :key="`grid-${related.id}`" :movie="related" :compact="true" />
        </div>
      </section>
    </template>
  </div>
</template>
