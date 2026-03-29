<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { message } from 'ant-design-vue';
import { useRoute } from 'vue-router';

import { requestClient } from '../../api/request';
import { $t } from '../../locales';

type MovieOption = {
  id: string;
  title: string;
  slug?: string;
  status?: string;
};

type EpisodeItem = {
  id: string;
  movieId: string | null;
  movieTitle?: string;
  epNo: number;
  title: string;
  overview?: string;
  durationSeconds?: number;
  status: 'published' | 'draft' | 'scheduled' | 'hidden' | string;
  streamUrl?: string;
  airDate?: string | null;
  createdAt?: string;
  deletedAt?: string | null;
};

type ListBody<T> = {
  success?: boolean;
  data?: T[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
  error?: any;
};

const movies = ref<MovieOption[]>([]);
const route = useRoute();
const selectedMovieId = ref<string>('');
const selectedStatus = ref<string>('');
const searchQuery = ref('');
const includeDeleted = ref(false);

const episodes = ref<EpisodeItem[]>([]);
const listLoading = ref(false);
const saving = ref(false);
const uploading = ref(false);

const page = ref(1);
const limit = ref(10);
const total = ref(0);
const serverTotalPages = ref<number | null>(null);

const showModal = ref(false);
const editingEpisode = ref<EpisodeItem | null>(null);
const ready = ref(false);

const lastDeleted = ref<null | { id: string; title: string }>(null);
let lastDeletedTimer: null | ReturnType<typeof setTimeout> = null;

const formData = ref({
  movieId: '',
  epNo: 1,
  title: '',
  overview: '',
  durationSeconds: 0,
  status: 'draft' as EpisodeItem['status'],
  streamUrl: '',
  airDate: '' as string,
});

function isObjectIdLike(value: string) {
  return /^[a-f\\d]{24}$/i.test(value);
}

function resetForm() {
  formData.value = {
    movieId: selectedMovieId.value || '',
    epNo: 1,
    title: '',
    overview: '',
    durationSeconds: 0,
    status: 'draft',
    streamUrl: '',
    airDate: '',
  };
}

function openCreateModal() {
  editingEpisode.value = null;
  resetForm();
  showModal.value = true;
}

function openEditModal(ep: EpisodeItem) {
  editingEpisode.value = ep;
  formData.value = {
    movieId: ep.movieId || selectedMovieId.value || '',
    epNo: Number(ep.epNo) || 1,
    title: ep.title || '',
    overview: ep.overview || '',
    durationSeconds: Number(ep.durationSeconds) || 0,
    status: (ep.status || 'draft') as EpisodeItem['status'],
    streamUrl: ep.streamUrl || '',
    airDate: ep.airDate ? String(ep.airDate) : '',
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

function formatDuration(seconds?: number) {
  const s = Math.max(Number(seconds) || 0, 0);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${mm}m ${ss.toString().padStart(2, '0')}s`;
}

function statusLabel(status: string) {
  if (status === 'published') return $t('views.episodes.status.published');
  if (status === 'draft') return $t('views.episodes.status.draft');
  if (status === 'scheduled') return $t('views.episodes.status.scheduled');
  if (status === 'hidden') return $t('views.episodes.status.hidden');
  return status || $t('views.episodes.status.unknown');
}

function getStatusBadgeClass(status: string) {
  if (status === 'published') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
  }
  if (status === 'draft') {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
  }
  if (status === 'scheduled') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
  }
  if (status === 'hidden') {
    return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700';
  }
  return 'bg-slate-100 text-slate-800 border-slate-200';
}

function getStatusDotClass(status: string) {
  if (status === 'published') return 'bg-emerald-500';
  if (status === 'draft') return 'bg-amber-500';
  if (status === 'scheduled') return 'bg-blue-500';
  if (status === 'hidden') return 'bg-slate-500';
  return 'bg-slate-500';
}

const selectedMovieName = computed(() => {
  const id = selectedMovieId.value;
  if (!id) return '';
  return movies.value.find((m) => m.id === id)?.title || '';
});

const pageTitle = computed(() => {
  return selectedMovieName.value || $t('views.episodes.title');
});

const totalPages = computed(() => {
  if (typeof serverTotalPages.value === 'number') return serverTotalPages.value;
  return Math.max(Math.ceil(total.value / limit.value), 1);
});

async function fetchMovies() {
  try {
    const body = (await requestClient.get('/movies', {
      params: {
        page: 1,
        limit: 200,
        includeHidden: true,
        includeDeleted: false,
        sort: 'title',
      },
      responseReturn: 'body',
    })) as ListBody<any>;

    if (!body || body.success !== true) {
      movies.value = [];
      return;
    }

    const list = Array.isArray(body.data) ? body.data : [];
    movies.value = list
      .map((m: any) => ({
        id: String(m?.id ?? m?._id ?? ''),
        title: String(m?.title ?? ''),
        slug: m?.slug ? String(m.slug) : undefined,
        status: m?.status ? String(m.status) : undefined,
      }))
      .filter((m: any) => isObjectIdLike(m.id) && m.title);

    if (!selectedMovieId.value && movies.value.length > 0) {
      selectedMovieId.value = movies.value[0]!.id;
    }
  } catch (err) {
    console.error('Failed to fetch movies:', err);
    movies.value = [];
  }
}

async function fetchEpisodes(options?: { resetPage?: boolean }) {
  if (options?.resetPage) page.value = 1;

  listLoading.value = true;
  try {
    const body = (await requestClient.get('/episodes', {
      params: {
        page: page.value,
        limit: limit.value,
        movieId: selectedMovieId.value || undefined,
        status: selectedStatus.value || undefined,
        search: searchQuery.value || undefined,
        includeHidden: true,
        includeDeleted: includeDeleted.value ? true : undefined,
        sort: 'epNo',
      },
      responseReturn: 'body',
    })) as ListBody<EpisodeItem>;

    if (!body || body.success !== true) {
      episodes.value = [];
      total.value = 0;
      serverTotalPages.value = null;
      return;
    }

    episodes.value = Array.isArray(body.data) ? body.data : [];
    total.value = Number(body.meta?.total ?? episodes.value.length) || 0;
    serverTotalPages.value =
      typeof body.meta?.totalPages === 'number' ? body.meta.totalPages : null;

    if (typeof body.meta?.page === 'number') page.value = body.meta.page;
    if (typeof body.meta?.limit === 'number') limit.value = body.meta.limit;
  } catch (err) {
    console.error('Failed to fetch episodes:', err);
    episodes.value = [];
  } finally {
    listLoading.value = false;
  }
}

function applyFilters() {
  fetchEpisodes({ resetPage: true });
}

function previousPage() {
  if (page.value > 1) {
    page.value -= 1;
    fetchEpisodes();
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value += 1;
    fetchEpisodes();
  }
}

async function uploadToServer(file: File) {
  const data = await requestClient.upload(
    '/upload',
    { file },
    { timeout: 30 * 60 * 1000 },
  );
  const url = (data as any)?.url || (data as any)?.path;
  if (!url || typeof url !== 'string') {
    throw new Error('Upload failed: missing url');
  }
  return url;
}

async function handleVideoUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  uploading.value = true;
  try {
    const url = await uploadToServer(file);
    formData.value.streamUrl = url;
    message.success($t('views.episodes.messages.videoUploadSuccess'));
  } catch (err) {
    console.error('Upload failed:', err);
    message.error($t('views.episodes.messages.videoUploadFailed'));
  } finally {
    uploading.value = false;
    target.value = '';
  }
}

function triggerUpload(refName: string) {
  const fileInput = document.getElementById(refName) as HTMLInputElement;
  if (fileInput) fileInput.click();
}

function previewVideo(url?: string) {
  if (!url) return;
  window.open(url, '_blank');
}

async function saveEpisode() {
  const payload = {
    movieId: formData.value.movieId || selectedMovieId.value,
    epNo: Number(formData.value.epNo),
    title: String(formData.value.title || '').trim(),
    overview: String(formData.value.overview || ''),
    durationSeconds: Number(formData.value.durationSeconds) || 0,
    status: formData.value.status,
    streamUrl: String(formData.value.streamUrl || ''),
    airDate: formData.value.airDate
      ? new Date(formData.value.airDate).toISOString()
      : undefined,
  };

  if (!payload.movieId || !isObjectIdLike(payload.movieId)) {
    message.error($t('views.episodes.messages.movieRequired'));
    return;
  }
  if (!payload.title) {
    message.error($t('views.episodes.messages.titleRequired'));
    return;
  }
  if (!Number.isFinite(payload.epNo) || payload.epNo < 1) {
    message.error($t('views.episodes.messages.epNoInvalid'));
    return;
  }

  saving.value = true;
  try {
    if (editingEpisode.value?.id) {
      await requestClient.put(`/episodes/${editingEpisode.value.id}`, payload);
      message.success($t('views.episodes.messages.updated'));
    } else {
      await requestClient.post('/episodes', payload);
      message.success($t('views.episodes.messages.created'));
    }
    showModal.value = false;
    await fetchEpisodes();
  } catch (err: any) {
    console.error('Save episode failed:', err);
    message.error(err?.message || $t('views.episodes.messages.saveFailed'));
  } finally {
    saving.value = false;
  }
}

async function deleteEpisode(ep: EpisodeItem) {
  if (!ep?.id) return;
  if (!confirm($t('views.episodes.messages.deleteConfirm', { title: ep.title }))) return;

  try {
    await requestClient.delete(`/episodes/${ep.id}`);
    lastDeleted.value = { id: ep.id, title: ep.title };
    if (lastDeletedTimer) clearTimeout(lastDeletedTimer);
    lastDeletedTimer = setTimeout(() => {
      lastDeleted.value = null;
      lastDeletedTimer = null;
	    }, 12_000);
	    message.success($t('views.episodes.messages.deletedUndo'));
	    await fetchEpisodes();
	  } catch (err) {
	    console.error('Delete failed:', err);
	    message.error($t('views.episodes.messages.deleteFailed'));
	  }
	}

async function undoDelete() {
  const item = lastDeleted.value;
  if (!item) return;

	  try {
	    await requestClient.post(`/episodes/${item.id}/restore`);
	    message.success($t('views.episodes.messages.undoSuccess'));
	    lastDeleted.value = null;
    if (lastDeletedTimer) {
      clearTimeout(lastDeletedTimer);
      lastDeletedTimer = null;
    }
    await fetchEpisodes();
	  } catch (err) {
	    console.error('Restore failed:', err);
	    message.error($t('views.episodes.messages.undoFailed'));
	  }
	}

async function restoreEpisode(ep: EpisodeItem) {
  if (!ep?.id) return;
  try {
    await requestClient.post(`/episodes/${ep.id}/restore`);
    message.success($t('views.episodes.messages.restored'));
    await fetchEpisodes();
  } catch (err) {
    console.error('Restore failed:', err);
    message.error($t('views.episodes.messages.restoreFailed'));
  }
}

async function quickToggleHidden(ep: EpisodeItem) {
  try {
    const nextStatus = ep.status === 'hidden' ? 'published' : 'hidden';
    await requestClient.put(`/episodes/${ep.id}`, { status: nextStatus });
    await fetchEpisodes();
  } catch (err) {
    console.error('Toggle hidden failed:', err);
    message.error($t('views.episodes.messages.toggleFailed'));
  }
}

watch([selectedMovieId], () => {
  if (!ready.value) return;
  fetchEpisodes({ resetPage: true });
});

onMounted(async () => {
  const qMovieId = typeof route.query.movieId === 'string' ? route.query.movieId : '';
  if (qMovieId && isObjectIdLike(qMovieId)) {
    selectedMovieId.value = qMovieId;
  }
  await fetchMovies();
  await fetchEpisodes();
  ready.value = true;
});
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-background-dark/50 min-h-full">
    <!-- Page Header -->
    <div class="px-6 py-8 border-b border-slate-200 dark:border-slate-800">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{ pageTitle }}</h1>
          <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {{ $t('views.episodes.subtitle') }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:brightness-110 shadow-lg shadow-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="listLoading"
            @click="openCreateModal"
          >
            <span class="material-symbols-outlined text-lg">add</span>
            {{ $t('views.episodes.actions.add') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Filters & Mobile Selection -->
    <div class="px-6 py-4 flex flex-wrap items-center gap-4">
      <label class="flex flex-col w-full md:w-64">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{{ $t('views.episodes.filters.currentMovie') }}</span>
        <select
          v-model="selectedMovieId"
          class="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-primary focus:border-primary"
        >
          <option value="">{{ $t('views.episodes.filters.allMovies') }}</option>
          <option v-for="m in movies" :key="m.id" :value="m.id">{{ m.title }}</option>
        </select>
      </label>

      <label class="flex flex-col w-full md:w-56">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{{ $t('views.episodes.filters.status') }}</span>
        <select
          v-model="selectedStatus"
          class="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-primary focus:border-primary"
        >
          <option value="">{{ $t('views.episodes.filters.allStatus') }}</option>
          <option value="published">{{ $t('views.episodes.status.published') }}</option>
          <option value="draft">{{ $t('views.episodes.status.draft') }}</option>
          <option value="scheduled">{{ $t('views.episodes.status.scheduled') }}</option>
          <option value="hidden">{{ $t('views.episodes.status.hidden') }}</option>
        </select>
      </label>

      <label class="flex flex-col w-full md:w-72">
        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{{ $t('views.episodes.filters.search') }}</span>
        <input
          v-model="searchQuery"
          class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm focus:ring-primary focus:border-primary"
          :placeholder="$t('views.episodes.filters.searchPlaceholder')"
          @keyup.enter="applyFilters"
        />
      </label>

      <div class="flex items-end gap-3">
        <button
          class="px-4 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          @click="applyFilters"
          :disabled="listLoading"
        >
          {{ $t('views.episodes.actions.filter') }}
        </button>
        <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 select-none">
          <input type="checkbox" v-model="includeDeleted" @change="applyFilters" />
          {{ $t('views.episodes.actions.showDeleted') }}
        </label>
      </div>
    </div>

    <!-- Table Content -->
    <div class="flex-1 overflow-auto p-6 pt-2">
      <div
        v-if="lastDeleted"
        class="mb-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 flex items-center justify-between gap-4"
      >
        <div class="text-sm font-semibold truncate">
          {{ $t('views.episodes.messages.deletedPrefix') }} <span class="font-black">{{ lastDeleted.title }}</span>
        </div>
        <button
          class="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-sm hover:opacity-90 transition-opacity"
          @click="undoDelete"
        >
          {{ $t('views.episodes.actions.undo') }}
        </button>
      </div>
      <div class="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.episodes.table.id') }}</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{{ $t('views.episodes.table.epNo') }}</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.episodes.table.title') }}</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.episodes.table.duration') }}</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.episodes.table.status') }}</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.episodes.table.videoUrl') }}</th>
              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{{ $t('views.episodes.table.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            <tr
              v-for="ep in episodes"
              :key="ep.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              :class="ep.deletedAt ? 'opacity-60' : ''"
            >
              <td class="px-6 py-4 text-sm font-mono text-slate-400">{{ ep.id }}</td>
              <td class="px-6 py-4 text-sm font-semibold text-center text-slate-900 dark:text-slate-100">
                {{ String(ep.epNo).padStart(2, '0') }}
              </td>
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-slate-900 dark:text-white">{{ ep.title }}</div>
                <div class="text-xs text-slate-500 dark:text-slate-500">
                  <span v-if="ep.movieTitle">{{ ep.movieTitle }}</span>
                  <span v-if="ep.airDate"> • {{ new Date(ep.airDate).toLocaleDateString() }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{{ formatDuration(ep.durationSeconds) }}</td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getStatusBadgeClass(ep.status)">
                  <span class="w-1.5 h-1.5 rounded-full mr-1.5" :class="getStatusDotClass(ep.status)"></span>
                  {{ statusLabel(ep.status) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div v-if="ep.streamUrl" class="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
                  <span class="material-symbols-outlined text-sm">link</span>
                  {{ ep.streamUrl }}
                </div>
                <div v-else class="text-sm text-slate-500 italic">{{ $t('views.episodes.table.notSet') }}</div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    class="p-2 transition-colors"
                    :class="ep.streamUrl ? 'text-primary hover:brightness-125' : 'text-slate-600 dark:text-slate-700 cursor-not-allowed'"
                    :disabled="!ep.streamUrl"
                    :title="$t('views.episodes.actions.preview')"
                    @click="previewVideo(ep.streamUrl)"
                  >
                    <span class="material-symbols-outlined">play_circle</span>
                  </button>
                  <button
                    v-if="ep.deletedAt"
                    class="p-2 text-emerald-600 hover:brightness-125 transition-colors"
                    :title="$t('views.episodes.actions.restore')"
                    @click="restoreEpisode(ep)"
                  >
                    <span class="material-symbols-outlined">restore</span>
                  </button>
                  <button
                    class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    :title="$t('views.episodes.actions.toggleHidden')"
                    @click="quickToggleHidden(ep)"
                    :disabled="!!ep.deletedAt"
                  >
                    <span class="material-symbols-outlined">{{ ep.status === 'hidden' ? 'visibility' : 'visibility_off' }}</span>
                  </button>
                  <button
                    class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    @click="openEditModal(ep)"
                    :disabled="!!ep.deletedAt"
                    :title="$t('views.episodes.actions.edit')"
                  >
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    class="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    @click="deleteEpisode(ep)"
                    :disabled="!!ep.deletedAt"
                    :title="$t('views.episodes.actions.delete')"
                  >
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="episodes.length === 0">
              <td colspan="7" class="px-6 py-10 text-center text-slate-500 text-sm">
                {{ listLoading ? $t('views.episodes.table.loading') : $t('views.episodes.table.empty') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="mt-6 flex items-center justify-between">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          {{ $t('views.episodes.pagination.summary', { total: total.toLocaleString(), page, pages: totalPages }) }}
        </p>
        <div class="flex items-center gap-2">
          <button
            class="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            :disabled="page <= 1 || listLoading"
            @click="previousPage"
          >
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <button class="h-9 px-3 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-sm" disabled>
            {{ page }}
          </button>
          <button
            class="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            :disabled="page >= totalPages || listLoading"
            @click="nextPage"
          >
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit modal -->
    <div
      v-if="showModal"
    class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
    @click.self="closeModal"
  >
    <div class="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
      <div class="px-5 pt-5 flex items-start justify-between gap-4">
        <div>
          <h3 class="text-base font-black text-slate-900 dark:text-white">
            {{ editingEpisode ? $t('views.episodes.modal.editTitle') : $t('views.episodes.modal.createTitle') }}
          </h3>
          <p class="text-xs text-slate-500 mt-1">{{ $t('views.episodes.modal.uploadHint') }}</p>
        </div>
        <button
          type="button"
          class="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          @click="closeModal"
        >
          <span class="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      <div class="px-5 pb-5 pt-4 space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ $t('views.episodes.modal.movieLabel') }}</span>
            <select v-model="formData.movieId" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm">
              <option value="">{{ $t('views.episodes.modal.moviePlaceholder') }}</option>
              <option v-for="m in movies" :key="m.id" :value="m.id">{{ m.title }}</option>
            </select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ $t('views.episodes.modal.epNoLabel') }}</span>
            <input
              v-model.number="formData.epNo"
              type="number"
              min="1"
              class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
            />
          </label>

          <label class="flex flex-col gap-1 md:col-span-2">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ $t('views.episodes.modal.titleLabel') }}</span>
            <input
              v-model="formData.title"
              class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
              :placeholder="$t('views.episodes.modal.titlePlaceholder')"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ $t('views.episodes.modal.durationLabel') }}</span>
            <input
              v-model.number="formData.durationSeconds"
              type="number"
              min="0"
              class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ $t('views.episodes.modal.statusLabel') }}</span>
            <select v-model="formData.status" class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm">
              <option value="published">{{ $t('views.episodes.status.published') }}</option>
              <option value="draft">{{ $t('views.episodes.status.draft') }}</option>
              <option value="scheduled">{{ $t('views.episodes.status.scheduled') }}</option>
              <option value="hidden">{{ $t('views.episodes.status.hidden') }}</option>
            </select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ $t('views.episodes.modal.airDateLabel') }}</span>
            <input
              v-model="formData.airDate"
              type="date"
              class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
            />
          </label>

          <label class="flex flex-col gap-1 md:col-span-2">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ $t('views.episodes.modal.videoUrlLabel') }}</span>
            <div class="flex gap-2">
              <input
                v-model="formData.streamUrl"
                class="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                :placeholder="$t('views.episodes.modal.videoUrlPlaceholder')"
              />
              <button
                type="button"
                class="px-3 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="uploading"
                @click="triggerUpload('episodeVideoUpload')"
              >
                {{ uploading ? $t('views.episodes.modal.uploading') : $t('views.episodes.modal.uploadMp4') }}
              </button>
              <input
                id="episodeVideoUpload"
                type="file"
                accept="video/mp4,video/*"
                class="hidden"
                @change="handleVideoUpload"
              />
            </div>
          </label>

          <label class="flex flex-col gap-1 md:col-span-2">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">{{ $t('views.episodes.modal.overviewLabel') }}</span>
            <textarea
              v-model="formData.overview"
              rows="3"
              class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm"
            ></textarea>
          </label>
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button
            type="button"
            class="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            @click="closeModal"
            :disabled="saving"
          >
            {{ $t('views.episodes.modal.cancel') }}
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            @click="saveEpisode"
            :disabled="saving || uploading"
          >
            {{ saving ? $t('views.episodes.modal.saving') : $t('views.episodes.modal.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>
