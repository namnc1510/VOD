<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { buildCommentShowcase, buildEpisodeShowcase } from '../data/showcase';
import { getApiErrorMessage } from '../services/api';
import { getMovieEpisodes, getMovieLanding } from '../services/discovery';
import { upsertWatchlist } from '../services/watchlist';
import { useAuthStore } from '../stores/auth';
import { formatRuntime } from '../utils/format';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const loading = ref(true);
const error = ref('');
const movieData = ref(null);
const progress = ref(0);
const statusMessage = ref('');
const episodes = ref([]);
const communityComments = ref({ items: [], total: 0 });
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
  return (episodes.value || []).find((episode) => String(episode?.id) === String(activeEpisodeId.value)) || null;
});
const episodeShowcase = computed(() => buildEpisodeShowcase(movieData.value, episodes.value));
const displayedEpisodes = computed(() => episodeShowcase.value.items || []);
const commentShowcase = computed(() => buildCommentShowcase(movieData.value, communityComments.value));
const highlightComments = computed(() => (commentShowcase.value.items || []).slice(0, 2));

const qualityLabel = computed(() => {
  const raw = String(movieData.value?.quality || '').trim();
  return raw ? raw.toUpperCase() : 'HD';
});

const detailChips = computed(() => {
  if (!movieData.value) return [];

  const chips = [];
  if (movieData.value.releaseYear) chips.push(String(movieData.value.releaseYear));
  if (movieData.value.type) chips.push(String(movieData.value.type).toLowerCase() === 'series' ? 'Series' : 'Movie');

  const runtime = formatRuntime(movieData.value.durationMinutes);
  if (runtime && runtime !== '-') chips.push(runtime);

  if (Array.isArray(movieData.value.genres) && movieData.value.genres.length) {
    chips.push(movieData.value.genres[0]?.name || movieData.value.genres[0]);
  }

  return chips;
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
  statusMessage.value = '';
  episodes.value = [];
  activeEpisodeId.value = episodeId.value || '';

  try {
    const data = await getMovieLanding(slug.value);
    movieData.value = data.movie;
    communityComments.value = data.comments || { items: [], total: 0 };
    progress.value = 0;

    const res = await getMovieEpisodes(slug.value, { limit: 500 });
    episodes.value = Array.isArray(res.items) ? res.items : [];

    if (!activeEpisodeId.value && episodes.value.length > 0) {
      activeEpisodeId.value = episodes.value[0].id;
    }
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Không thể tải trình phát');
  } finally {
    loading.value = false;
  }
}

async function saveProgress() {
  if (!movieData.value) return;

  if (!authStore.isLoggedIn) {
    statusMessage.value = 'Đăng nhập để lưu tiến độ xem.';
    return;
  }

  try {
    const video = videoRef.value;
    const currentSeconds = Math.max(0, Math.floor(Number(video?.currentTime) || 0));
    const durationSeconds = Number(video?.duration);
    const totalSeconds =
      Number.isFinite(durationSeconds) && durationSeconds > 0
        ? Math.floor(durationSeconds)
        : (movieData.value.durationMinutes || 1) * 60;
    const computedProgress = totalSeconds > 0 ? (currentSeconds / totalSeconds) * 100 : 0;

    await upsertWatchlist({
      movieSlug: movieData.value.slug,
      progressSeconds: currentSeconds,
      isCompleted: computedProgress >= 95
    });

    statusMessage.value = 'Đã lưu tiến độ xem vào watchlist.';
  } catch (err) {
    statusMessage.value = getApiErrorMessage(err, 'Không thể lưu tiến độ');
  }
}

function openEpisode(episode) {
  if (!movieData.value) return;
  if (episode?.preview) {
    router.push({ name: 'player', params: { slug: movieData.value.slug } });
    return;
  }
  router.push({ name: 'player', params: { slug: movieData.value.slug }, query: { episodeId: episode.id } });
}

watch(slug, loadMovieForPlayer, { immediate: true });
watch(episodeId, (next) => {
  if (typeof next === 'string') activeEpisodeId.value = next;
});
watch(videoSrc, attachVideoListeners, { immediate: true });

onBeforeUnmount(() => {
  if (cleanupVideoListeners) cleanupVideoListeners();
});
</script>

<template>
  <div class="page-shell">
    <section v-if="loading" class="panel-surface flex min-h-[420px] flex-col items-center justify-center gap-3 p-10 text-center">
      <span class="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      <p class="text-base font-semibold text-slate-600 dark:text-slate-300">Đang tải trình phát...</p>
    </section>

    <div v-else-if="error" class="status-card status-error">
      <span class="material-symbols-outlined text-[18px]">error</span>
      <span>{{ error }}</span>
    </div>

    <template v-else-if="movieData">
      <section class="overflow-hidden rounded-[32px] border border-slate-200/70 bg-slate-950 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.72)] dark:border-white/10">
        <div class="relative aspect-video bg-black">
          <video
            ref="videoRef"
            class="h-full w-full object-contain"
            :src="videoSrc"
            controls
            autoplay
            :poster="movieData.backdropUrl || movieData.posterUrl"
            controlsList="nodownload"
          >
            Your browser does not support HTML5 video streaming.
          </video>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_380px]">
        <div class="space-y-6">
          <article class="page-hero">
            <div class="flex flex-col gap-6">
              <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div class="space-y-4">
                  <span class="page-kicker">
                    <span class="material-symbols-outlined text-base">play_circle</span>
                    Now Playing
                  </span>
                  <div>
                    <h1 class="page-title max-w-[12ch]">{{ movieData.title }}</h1>
                    <p v-if="activeEpisode" class="mt-3 text-base font-semibold text-slate-600 dark:text-slate-300">
                      Tập {{ String(activeEpisode.epNo).padStart(2, '0') }}: {{ activeEpisode.title }}
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2.5">
                    <span class="rounded-full bg-primary/12 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-primary">{{ qualityLabel }}</span>
                    <span
                      v-for="(chip, idx) in detailChips"
                      :key="`${chip}-${idx}`"
                      class="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {{ chip }}
                    </span>
                  </div>
                </div>

                <div class="flex flex-wrap gap-3">
                  <button type="button" class="action-primary" @click="saveProgress">
                    <span class="material-symbols-outlined text-[18px]">{{ progress >= 95 ? 'done_all' : 'bookmark' }}</span>
                    Lưu tiến độ
                  </button>
                  <RouterLink :to="`/movies/${movieData.slug}`" class="action-secondary">
                    <span class="material-symbols-outlined text-[18px]">info</span>
                    Chi tiết phim
                  </RouterLink>
                </div>
              </div>

              <div v-if="statusMessage" class="status-card status-info">
                <span class="material-symbols-outlined text-[18px]">info</span>
                <span>{{ statusMessage }}</span>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <article class="panel-muted p-5">
                  <p class="control-label">Tiến độ</p>
                  <p class="text-3xl font-black text-slate-900 dark:text-white">{{ progress }}%</p>
                  <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div class="h-full rounded-full bg-primary transition-all duration-300" :style="{ width: `${progress}%` }"></div>
                  </div>
                </article>
                <article class="panel-muted p-5">
                  <p class="control-label">IMDb</p>
                  <p class="text-3xl font-black text-slate-900 dark:text-white">{{ movieData.imdbRating?.toFixed(1) || 'N/A' }}</p>
                  <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Điểm đánh giá hiện tại của phim.</p>
                </article>
                <article class="panel-muted p-5">
                  <p class="control-label">Thời lượng</p>
                  <p class="text-3xl font-black text-slate-900 dark:text-white">{{ formatRuntime(movieData.durationMinutes) }}</p>
                  <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Tính theo metadata phim hoặc episode.</p>
                </article>
              </div>
            </div>
          </article>

          <article class="panel-surface p-6 sm:p-7">
            <div class="section-head">
              <div>
                <h2 class="section-title">Máy chủ phát</h2>
                <p class="section-copy">Chuyển nhanh giữa các nguồn stream nếu cần chất lượng hoặc kết nối khác.</p>
              </div>
            </div>

            <div class="mt-6 flex flex-wrap gap-3">
              <button
                v-for="server in [{ id: 1, name: 'Server Auto' }, { id: 2, name: 'Server HD' }, { id: 3, name: 'Server Backup' }]"
                :key="server.id"
                type="button"
                class="rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.12em] transition-colors"
                :class="
                  activeServer === server.id
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                "
                @click="activeServer = server.id"
              >
                {{ server.name }}
              </button>
            </div>
          </article>

          <article class="panel-surface p-6 sm:p-7">
            <div class="section-head">
              <div>
                <h2 class="section-title">Tóm tắt nội dung</h2>
                <p class="section-copy">Thông tin mô tả nhanh để người xem không cần rời khỏi trình phát.</p>
              </div>
            </div>
            <p class="mt-6 text-base leading-8 text-slate-600 dark:text-slate-300">
              {{ movieData.overview || 'Chưa có mô tả cho nội dung này.' }}
            </p>
          </article>
        </div>

        <div class="space-y-6">
          <article class="panel-surface p-6">
            <div class="section-head">
              <div>
                <h2 class="section-title">{{ displayedEpisodes.length ? 'Danh sách tập' : 'Cinema Mode' }}</h2>
                <p class="section-copy">
                  {{ displayedEpisodes.length ? 'Chọn tập muốn phát ngay trong panel bên phải.' : 'Phim lẻ đang phát trực tiếp với chế độ trình chiếu tập trung.' }}
                </p>
              </div>
            </div>

            <div v-if="episodeShowcase.isFallback" class="status-card status-info mt-6">
              <span class="material-symbols-outlined text-[18px]">preview</span>
              <span>{{ episodeShowcase.description }}</span>
            </div>

            <div v-if="displayedEpisodes.length" class="mt-6 space-y-3">
              <button
                v-for="episode in displayedEpisodes"
                :key="episode.id"
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left transition-colors"
                :class="
                  !episode.preview && String(episode.id) === String(activeEpisodeId)
                    ? 'border-primary/35 bg-primary/8'
                    : 'border-slate-200 bg-slate-50 hover:border-primary/25 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:hover:bg-slate-900'
                "
                @click="openEpisode(episode)"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-black text-slate-900 dark:text-white">
                    Tập {{ String(episode.epNo).padStart(2, '0') }}: {{ episode.title || `Episode ${episode.epNo}` }}
                  </p>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {{ episode.durationMinutes ? `${episode.durationMinutes} phút` : 'Video stream' }}
                  </p>
                  <div class="mt-2 flex flex-wrap gap-2">
                    <span class="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {{ episode.streamLabel }}
                    </span>
                    <span class="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                      {{ episode.availability }}
                    </span>
                  </div>
                </div>
                <span
                  class="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em]"
                  :class="
                    !episode.preview && String(episode.id) === String(activeEpisodeId)
                      ? 'bg-primary text-white'
                      : episode.preview
                        ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  "
                >
                  {{ !episode.preview && String(episode.id) === String(activeEpisodeId) ? 'Đang phát' : episode.preview ? 'Preview' : 'Chọn' }}
                </span>
              </button>
            </div>

            <div v-else class="empty-state mt-6">
              <div class="flex size-18 items-center justify-center rounded-full bg-primary/12 text-primary">
                <span class="material-symbols-outlined text-4xl">movie</span>
              </div>
              <h3 class="section-title">Cinema mode đang hoạt động.</h3>
              <p class="page-copy text-center">
                Nội dung hiện tại là phim lẻ, bạn chỉ cần bấm play và tiếp tục thưởng thức.
              </p>
            </div>
          </article>

          <article class="panel-surface p-6">
            <div class="section-head">
              <div>
                <h2 class="section-title">Thông tin nhanh</h2>
                <p class="section-copy">Các hành động liên quan ngay trong lúc xem.</p>
              </div>
            </div>

            <div class="mt-6 space-y-4">
              <RouterLink :to="`/movies/${movieData.slug}`" class="action-secondary w-full justify-start">
                <span class="material-symbols-outlined text-[18px]">movie_info</span>
                Xem trang chi tiết phim
              </RouterLink>
              <RouterLink to="/pricing" class="action-secondary w-full justify-start">
                <span class="material-symbols-outlined text-[18px]">workspace_premium</span>
                Nâng cấp để mở thêm nội dung VIP
              </RouterLink>
            </div>
          </article>

          <article class="panel-surface p-6">
            <div class="section-head">
              <div>
                <h2 class="section-title">Nhịp cộng đồng</h2>
                <p class="section-copy">Lấy từ bình luận thật nếu có, nếu chưa có sẽ hiển thị preview để panel không bị trống.</p>
              </div>
            </div>

            <div class="mt-6 flex flex-wrap gap-2">
              <span
                v-for="chip in commentShowcase.chips"
                :key="chip"
                class="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {{ chip }}
              </span>
            </div>

            <div class="mt-6 space-y-3">
              <article
                v-for="comment in highlightComments"
                :key="comment.id"
                class="panel-muted p-4"
              >
                <div class="flex items-center justify-between gap-3">
                  <p class="text-sm font-black text-slate-900 dark:text-white">{{ comment.user?.name || 'Viewer' }}</p>
                  <span class="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                    {{ comment.badge || 'Community' }}
                  </span>
                </div>
                <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{{ comment.content }}</p>
              </article>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>
