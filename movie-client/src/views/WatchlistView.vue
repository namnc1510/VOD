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
const completedItems = computed(() => items.value.filter((item) => item.isCompleted).length);
const inProgressItems = computed(() => items.value.filter((item) => !item.isCompleted && progressPercent(item) > 0).length);

function progressPercent(item) {
  const durationSeconds = Math.max(1, Number(item?.movie?.durationMinutes || 0) * 60);
  return Math.min(100, Math.max(0, Math.round((Number(item?.progressSeconds || 0) / durationSeconds) * 100)));
}

function movieLabel(item) {
  const type = String(item?.movie?.type || '').toLowerCase() === 'series' ? 'Series' : 'Movie';
  return [item?.movie?.releaseYear, (item?.movie?.genres || [])[0] || type, formatRuntime(item?.movie?.durationMinutes)].filter(Boolean).join(' • ');
}

async function loadWatchlist() {
  if (!authStore.isLoggedIn) {
    items.value = [];
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    const result = await getWatchlist();
    items.value = Array.isArray(result.items) ? result.items : [];
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Không thể tải danh sách xem sau');
  } finally {
    loading.value = false;
  }
}

async function removeItem(movieId) {
  try {
    await removeWatchlist(movieId);
    items.value = items.value.filter((item) => item.movie.id !== movieId);
    info.value = 'Đã xóa phim khỏi danh sách xem sau.';
  } catch (err) {
    info.value = getApiErrorMessage(err, 'Không thể xóa phim khỏi danh sách');
  }
}

async function markCompleted(item) {
  try {
    await upsertWatchlist({
      movieId: item.movie.id,
      progressSeconds: item.progressSeconds,
      isCompleted: true
    });
    await loadWatchlist();
    info.value = 'Đã đánh dấu phim là đã xem xong.';
  } catch (err) {
    info.value = getApiErrorMessage(err, 'Không thể cập nhật trạng thái');
  }
}

onMounted(loadWatchlist);
</script>

<template>
  <div class="page-shell">
    <section class="page-hero overflow-hidden">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] lg:items-end">
        <div class="space-y-6">
          <span class="page-kicker">
            <span class="material-symbols-outlined text-base">bookmark</span>
            My Watchlist
          </span>
          <div class="space-y-4">
            <h1 class="page-title">Danh sách xem sau được cá nhân hóa cho tài khoản của bạn.</h1>
            <p class="page-copy">
              Lưu lại các phim muốn xem, tiếp tục những phim đang dở và quản lý tiến độ ngay trong một không gian thống nhất.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <RouterLink to="/explore" class="action-primary">
              <span class="material-symbols-outlined text-[18px]">travel_explore</span>
              Khám phá thêm phim
            </RouterLink>
            <RouterLink v-if="authStore.isLoggedIn" to="/profile" class="action-secondary">
              <span class="material-symbols-outlined text-[18px]">account_circle</span>
              Hồ sơ tài khoản
            </RouterLink>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <article class="panel-muted p-5">
            <p class="control-label">Tổng tiêu đề</p>
            <p class="text-3xl font-black text-slate-900 dark:text-white">{{ totalItems }}</p>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Tất cả phim đã lưu trong watchlist.</p>
          </article>
          <article class="panel-muted p-5">
            <p class="control-label">Đang xem</p>
            <p class="text-3xl font-black text-slate-900 dark:text-white">{{ inProgressItems }}</p>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Các phim có tiến độ nhưng chưa hoàn tất.</p>
          </article>
          <article class="panel-muted p-5">
            <p class="control-label">Đã hoàn tất</p>
            <p class="text-3xl font-black text-slate-900 dark:text-white">{{ completedItems }}</p>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Số phim đã đánh dấu xem xong.</p>
          </article>
        </div>
      </div>
    </section>

    <section v-if="!authStore.isLoggedIn" class="empty-state">
      <div class="flex size-18 items-center justify-center rounded-full bg-primary/12 text-primary">
        <span class="material-symbols-outlined text-4xl">lock</span>
      </div>
      <h2 class="section-title">Bạn cần đăng nhập để xem watchlist.</h2>
      <p class="page-copy text-center">
        Đăng nhập để đồng bộ tiến độ xem và quản lý danh sách phim trên mọi thiết bị.
      </p>
      <RouterLink to="/login" class="action-primary">
        <span class="material-symbols-outlined text-[18px]">login</span>
        Đăng nhập ngay
      </RouterLink>
    </section>

    <template v-else>
      <div v-if="info" class="status-card status-info">
        <span class="material-symbols-outlined text-[20px]">info</span>
        <span>{{ info }}</span>
      </div>

      <div v-if="error" class="status-card status-error">
        <span class="material-symbols-outlined text-[20px]">error</span>
        <span>{{ error }}</span>
      </div>

      <section v-if="loading" class="panel-surface flex min-h-[360px] flex-col items-center justify-center gap-3 p-10 text-center">
        <span class="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        <p class="text-base font-semibold text-slate-600 dark:text-slate-300">Đang tải watchlist của bạn...</p>
      </section>

      <section v-else-if="!items.length" class="empty-state">
        <div class="flex size-18 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <span class="material-symbols-outlined text-4xl">bookmark_remove</span>
        </div>
        <h2 class="section-title">Watchlist hiện chưa có phim nào.</h2>
        <p class="page-copy text-center">
          Hãy thêm các phim bạn muốn xem sau để tạo hàng đợi cá nhân hóa và quay lại bất kỳ lúc nào.
        </p>
        <RouterLink to="/explore" class="action-primary">
          <span class="material-symbols-outlined text-[18px]">theaters</span>
          Đi tới thư viện phim
        </RouterLink>
      </section>

      <section v-else class="space-y-6">
        <div class="section-head">
          <div>
            <h2 class="section-title">Phim đã lưu</h2>
            <p class="section-copy">Tất cả tiêu đề trong watchlist, kèm tiến độ hiện tại và thao tác nhanh để tiếp tục xem.</p>
          </div>
          <RouterLink to="/explore" class="action-secondary">
            <span class="material-symbols-outlined text-[18px]">add</span>
            Thêm phim mới
          </RouterLink>
        </div>

        <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="item in items"
            :key="item.id"
            class="panel-surface group overflow-hidden"
          >
            <div class="relative aspect-[16/10] overflow-hidden bg-slate-200 dark:bg-slate-800">
              <img
                :src="item.movie.backdropUrl || item.movie.posterUrl"
                :alt="item.movie.title"
                loading="lazy"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent"></div>
              <div class="absolute left-4 top-4 flex flex-wrap gap-2">
                <span class="rounded-full bg-primary/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white">
                  {{ item.movie.quality || 'HD' }}
                </span>
                <span
                  v-if="item.isCompleted"
                  class="rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white"
                >
                  Đã xem xong
                </span>
              </div>
              <div class="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="truncate text-lg font-black text-white">{{ item.movie.title }}</h3>
                  <p class="mt-1 truncate text-sm text-white/72">{{ movieLabel(item) }}</p>
                </div>
                <RouterLink
                  :to="`/watch/${item.movie.slug}`"
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/14 text-white backdrop-blur hover:bg-primary"
                  :title="`Xem ${item.movie.title}`"
                >
                  <span class="material-symbols-outlined">play_arrow</span>
                </RouterLink>
              </div>
            </div>

            <div class="space-y-5 p-5">
              <div class="rounded-2xl border border-slate-200/90 bg-slate-50/85 p-4 dark:border-slate-800 dark:bg-slate-900/75">
                <div class="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <span>Tiến độ</span>
                  <span>{{ progressPercent(item) }}%</span>
                </div>
                <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    class="h-full rounded-full bg-primary transition-all duration-500"
                    :style="{ width: `${progressPercent(item)}%` }"
                  ></div>
                </div>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <RouterLink :to="`/movies/${item.movie.slug}`" class="action-secondary">
                  <span class="material-symbols-outlined text-[18px]">info</span>
                  Chi tiết
                </RouterLink>
                <button type="button" class="action-secondary" @click="markCompleted(item)">
                  <span class="material-symbols-outlined text-[18px]">done_all</span>
                  Hoàn tất
                </button>
              </div>

              <button type="button" class="action-danger w-full" @click="removeItem(item.movie.id)">
                <span class="material-symbols-outlined text-[18px]">delete</span>
                Xóa khỏi watchlist
              </button>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>
