<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import dayjs from 'dayjs';
import { message } from 'ant-design-vue';

import { requestClient } from '../../api/request';
import { $t } from '../../locales';

type CommentStatus = 'pending' | 'approved' | 'spam';
type CommentRow = {
  id: string;
  content: string;
  status: CommentStatus;
  hidden: boolean;
  deletedAt: null | string;
  likesCount: number;
  createdAt: string;
  user: null | {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
  };
  movie: null | {
    id: string;
    title: string;
    slug: string;
  };
};

type CommentsListBody = {
  success: boolean;
  data: CommentRow[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

type CommentStatsBody = {
  success: boolean;
  data: {
    total: number;
    pending: number;
    approved: number;
    spam: number;
  };
};

const comments = ref<CommentRow[]>([]);

const listLoading = ref(false);
const saving = ref(false);

const page = ref(1);
const limit = ref(10);
const total = ref(0);
const serverTotalPages = ref<number | null>(null);

const searchQuery = ref('');
const selectedStatus = ref<'' | CommentStatus>('');

const stats = ref({ total: 0, pending: 0, approved: 0, spam: 0 });

const totalPages = computed(() => {
  return serverTotalPages.value ?? Math.max(Math.ceil(total.value / limit.value), 1);
});

function formatDateTime(input?: string) {
  if (!input) return 'N/A';
  const d = dayjs(input);
  if (!d.isValid()) return 'N/A';
  return d.format('DD/MM/YYYY HH:mm');
}

function badgeClass(status: CommentStatus) {
  if (status === 'approved') return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
  if (status === 'pending') return 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400';
  return 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400';
}

function statusLabel(status: CommentStatus) {
  if (status === 'approved') return $t('views.comments.status.approved');
  if (status === 'pending') return $t('views.comments.status.pending');
  return $t('views.comments.status.spam');
}

async function fetchStats() {
  try {
    const body = (await requestClient.get('/comments/stats', { responseReturn: 'body' })) as CommentStatsBody;
    if (body?.success === true && body.data) {
      stats.value = {
        total: Number(body.data.total ?? 0) || 0,
        pending: Number(body.data.pending ?? 0) || 0,
        approved: Number(body.data.approved ?? 0) || 0,
        spam: Number(body.data.spam ?? 0) || 0,
      };
    }
  } catch (err) {
    console.error('Failed to fetch comment stats:', err);
  }
}

async function fetchComments(options?: { resetPage?: boolean }) {
  if (options?.resetPage) page.value = 1;

  listLoading.value = true;
  try {
    const body = (await requestClient.get('/comments', {
      params: {
        page: page.value,
        limit: limit.value,
        search: searchQuery.value || undefined,
        status: selectedStatus.value || undefined,
      },
      responseReturn: 'body',
    })) as CommentsListBody;

    if (!body || body.success !== true) {
      comments.value = [];
      total.value = 0;
      serverTotalPages.value = null;
      return;
    }

    comments.value = Array.isArray(body.data) ? body.data : [];
    total.value = Number(body.meta?.total ?? comments.value.length) || 0;
    serverTotalPages.value = typeof body.meta?.totalPages === 'number' ? body.meta.totalPages : null;

    if (typeof body.meta?.page === 'number') page.value = body.meta.page;
    if (typeof body.meta?.limit === 'number') limit.value = body.meta.limit;
  } catch (err) {
    console.error('Failed to fetch comments:', err);
    message.error($t('views.comments.messages.loadFailed'));
  } finally {
    listLoading.value = false;
  }
}

function applyFilters() {
  fetchComments({ resetPage: true });
}

function previousPage() {
  if (page.value <= 1) return;
  page.value -= 1;
  fetchComments();
}

function nextPage() {
  if (page.value >= totalPages.value) return;
  page.value += 1;
  fetchComments();
}

async function setStatus(item: CommentRow, status: CommentStatus) {
  if (saving.value) return;
  saving.value = true;
  try {
    await requestClient.put(`/comments/${item.id}`, { status });
    message.success($t('views.comments.messages.statusUpdated'));
    await Promise.all([fetchStats(), fetchComments()]);
  } catch (err) {
    console.error('Failed to update status:', err);
    message.error($t('views.comments.messages.statusUpdateFailed'));
  } finally {
    saving.value = false;
  }
}

async function toggleHidden(item: CommentRow) {
  if (saving.value) return;
  saving.value = true;
  try {
    await requestClient.put(`/comments/${item.id}`, { hidden: !item.hidden });
    message.success(item.hidden ? $t('views.comments.messages.shown') : $t('views.comments.messages.hidden'));
    await fetchComments();
  } catch (err) {
    console.error('Failed to toggle hidden:', err);
    message.error($t('views.comments.messages.toggleHiddenFailed'));
  } finally {
    saving.value = false;
  }
}

async function deleteComment(item: CommentRow, permanent?: boolean) {
  if (saving.value) return;
  const ok = confirm(
    permanent
      ? $t('views.comments.messages.deletePermanentConfirm')
      : $t('views.comments.messages.deleteConfirm'),
  );
  if (!ok) return;

  saving.value = true;
  try {
    await requestClient.delete(`/comments/${item.id}`, {
      params: permanent ? { permanent: true } : undefined,
    });
    message.success(permanent ? $t('views.comments.messages.deletedPermanent') : $t('views.comments.messages.deleted'));
    await Promise.all([fetchStats(), fetchComments()]);
  } catch (err) {
    console.error('Failed to delete comment:', err);
    message.error($t('views.comments.messages.deleteFailed'));
  } finally {
    saving.value = false;
  }
}

function reply() {
  message.info($t('views.comments.messages.replyNotSupported'));
}

onMounted(async () => {
  await Promise.all([fetchStats(), fetchComments()]);
});
</script>

<template>
  <div class="p-4 md:p-8 space-y-8 bg-slate-50 dark:bg-background-dark/50 flex-1 overflow-y-auto">
    <div class="flex items-center gap-4 mb-4">
      <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{{ $t('views.comments.title') }}</h2>
      <span class="bg-primary/20 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full">{{ $t('views.comments.badge') }}</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-slate-900 dark:text-white">
      <div class="p-6 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ $t('views.comments.stats.total') }}</span>
          <span class="material-symbols-outlined text-primary">forum</span>
        </div>
        <div class="flex items-end gap-2">
          <h4 class="text-2xl font-bold">{{ stats.total }}</h4>
        </div>
      </div>
      <div class="p-6 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ $t('views.comments.stats.pending') }}</span>
          <span class="material-symbols-outlined text-amber-500">pending_actions</span>
        </div>
        <div class="flex items-end gap-2">
          <h4 class="text-2xl font-bold">{{ stats.pending }}</h4>
        </div>
      </div>
      <div class="p-6 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ $t('views.comments.stats.approved') }}</span>
          <span class="material-symbols-outlined text-emerald-500">check_circle</span>
        </div>
        <div class="flex items-end gap-2">
          <h4 class="text-2xl font-bold">{{ stats.approved }}</h4>
        </div>
      </div>
      <div class="p-6 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ $t('views.comments.stats.spam') }}</span>
          <span class="material-symbols-outlined text-rose-500">report</span>
        </div>
        <div class="flex items-end gap-2">
          <h4 class="text-2xl font-bold">{{ stats.spam }}</h4>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div class="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center gap-3">
        <div class="flex-1">
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              v-model="searchQuery"
              @keyup.enter="applyFilters"
              class="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-slate-900 dark:text-slate-100"
              :placeholder="$t('views.comments.filters.searchPlaceholder')"
              type="text"
              :disabled="listLoading || saving"
            />
          </div>
        </div>
        <div class="w-full md:w-44">
          <select v-model="selectedStatus" @change="applyFilters" :disabled="listLoading || saving" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-slate-100 outline-none disabled:opacity-50">
            <option value="">{{ $t('views.comments.filters.all') }}</option>
            <option value="pending">{{ $t('views.comments.status.pending') }}</option>
            <option value="approved">{{ $t('views.comments.status.approved') }}</option>
            <option value="spam">{{ $t('views.comments.status.spam') }}</option>
          </select>
        </div>
        <div class="w-full md:w-44">
          <select v-model.number="limit" @change="applyFilters" :disabled="listLoading || saving" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-slate-100 outline-none disabled:opacity-50">
            <option :value="10">{{ $t('views.comments.filters.perPage', { count: 10 }) }}</option>
            <option :value="20">{{ $t('views.comments.filters.perPage', { count: 20 }) }}</option>
            <option :value="50">{{ $t('views.comments.filters.perPage', { count: 50 }) }}</option>
            <option :value="100">{{ $t('views.comments.filters.perPage', { count: 100 }) }}</option>
          </select>
        </div>
        <button @click="fetchComments({ resetPage: true }); fetchStats()" :disabled="listLoading || saving" class="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <span class="material-symbols-outlined text-slate-500">refresh</span>
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50 dark:bg-slate-900/60 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th class="px-6 py-4">{{ $t('views.comments.table.user') }}</th>
              <th class="px-6 py-4">{{ $t('views.comments.table.movie') }}</th>
              <th class="px-6 py-4">{{ $t('views.comments.table.content') }}</th>
              <th class="px-6 py-4">{{ $t('views.comments.table.time') }}</th>
              <th class="px-6 py-4">{{ $t('views.comments.table.status') }}</th>
              <th class="px-6 py-4 text-right">{{ $t('views.comments.table.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
            <tr v-if="listLoading">
              <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                <span class="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
              </td>
            </tr>
            <tr v-else-if="comments.length === 0">
              <td colspan="6" class="px-6 py-8 text-center text-slate-500">{{ $t('views.comments.table.empty') }}</td>
            </tr>
            <tr v-else v-for="item in comments" :key="item.id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs bg-slate-200 text-slate-500 overflow-hidden">
                    <img v-if="item.user?.avatarUrl" :src="item.user.avatarUrl" class="w-full h-full object-cover" />
                    <span v-else>{{ item.user?.name ? item.user.name.charAt(0).toUpperCase() : 'U' }}</span>
                  </div>
                  <div>
                    <p class="text-sm font-semibold">{{ item.user?.name || $t('views.comments.table.unknownUser') }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ item.user?.email || '' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="item.status === 'pending' ? 'bg-slate-400' : item.status === 'spam' ? 'bg-rose-400' : 'bg-primary'"></span>
	                  <span class="text-sm font-medium">{{ item.movie?.title || $t('views.comments.table.na') }}</span>
	                </div>
	                <p v-if="item.hidden" class="text-xs text-slate-500 mt-1 italic">{{ $t('views.comments.table.hiddenNote') }}</p>
	              </td>
              <td class="px-6 py-4 max-w-xs">
                <p class="text-sm text-slate-600 dark:text-slate-300 truncate" :class="{ italic: item.status === 'spam' }" :title="item.content">
                  {{ item.content }}
                </p>
              </td>
              <td class="px-6 py-4 text-sm text-slate-500">{{ formatDateTime(item.createdAt) }}</td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center whitespace-nowrap px-2.5 py-1 text-xs font-bold rounded-full" :class="badgeClass(item.status)">
                  {{ statusLabel(item.status) }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div v-if="item.status === 'pending'" class="flex items-center justify-end gap-1">
                  <button :disabled="saving" @click="setStatus(item, 'approved')" class="px-3 py-1 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-colors mr-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ $t('views.comments.actions.approve') }}
                  </button>
                  <button :disabled="saving" @click="setStatus(item, 'spam')" class="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg text-rose-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :title="$t('views.comments.actions.markSpam')">
                    <span class="material-symbols-outlined text-[20px]">report</span>
                  </button>
                  <button :disabled="saving" @click="reply()" class="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :title="$t('views.comments.actions.reply')">
                    <span class="material-symbols-outlined text-[20px]">reply</span>
                  </button>
                  <button :disabled="saving" @click="deleteComment(item)" class="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg text-rose-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :title="$t('views.comments.actions.delete')">
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
                <div v-else-if="item.status === 'spam'" class="flex items-center justify-end gap-1">
                  <button :disabled="saving" @click="setStatus(item, 'approved')" class="p-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg text-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :title="$t('views.comments.actions.notSpam')">
                    <span class="material-symbols-outlined text-[20px]">thumb_up</span>
                  </button>
                  <button :disabled="saving" @click="deleteComment(item, true)" class="p-1.5 bg-rose-500 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" :title="$t('views.comments.actions.deleteForever')">
                    <span class="material-symbols-outlined text-[20px]">delete_forever</span>
                  </button>
                </div>
                <div v-else class="flex items-center justify-end gap-1">
                  <button :disabled="saving" @click="reply()" class="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :title="$t('views.comments.actions.reply')">
                    <span class="material-symbols-outlined text-[20px]">reply</span>
                  </button>
                  <button :disabled="saving" @click="toggleHidden(item)" class="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :title="item.hidden ? $t('views.comments.actions.show') : $t('views.comments.actions.hide')">
                    <span class="material-symbols-outlined text-[20px]">{{ item.hidden ? 'visibility' : 'visibility_off' }}</span>
                  </button>
                  <button :disabled="saving" @click="deleteComment(item)" class="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg text-rose-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :title="$t('views.comments.actions.delete')">
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!listLoading && total > 0" class="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
        <div class="text-sm text-slate-500">
          {{
            $t('views.comments.pagination.showing', {
              from: (page - 1) * limit + 1,
              to: Math.min(page * limit, total),
              total,
            })
          }}
        </div>
        <div class="flex items-center gap-2">
          <button @click="previousPage" :disabled="page <= 1 || saving" class="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <span class="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <button class="w-8 h-8 rounded-lg bg-primary text-white text-sm font-bold">{{ page }}</button>
          <button @click="nextPage" :disabled="page >= totalPages || saving" class="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <span class="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
