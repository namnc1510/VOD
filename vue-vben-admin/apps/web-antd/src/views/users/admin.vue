<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { requestClient } from '../../api/request';
import dayjs from 'dayjs';
import { message } from 'ant-design-vue';
import { $t } from '../../locales';

type UserRow = {
  _id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  role?: string;
  plan?: string;
  planExpiresAt?: string;
  createdAt?: string;
};

type UsersListBody = {
  success: boolean;
  data: UserRow[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

const users = ref<UserRow[]>([]);
const listLoading = ref(false);
const saving = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const serverTotalPages = ref<number | null>(null);
const searchQuery = ref('');
const selectedRole = ref<string>('admin');

// Form State
const showModal = ref(false);
const editingUser = ref<UserRow | null>(null);
const formData = ref({ name: '', email: '', role: 'user', plan: 'free' });

function openCreateModal() {
  if (saving.value) return;
  editingUser.value = null;
  formData.value = { name: '', email: '', role: 'user', plan: 'free' };
  showModal.value = true;
}

function openEditModal(user: UserRow) {
  if (saving.value) return;
  editingUser.value = user;
  formData.value = { name: user.name || '', email: user.email, role: user.role || 'user', plan: user.plan || 'free' };
  showModal.value = true;
}

async function saveUser() {
  if (!formData.value.name || !formData.value.email) return;
  saving.value = true;
  try {
    const payload = {
      name: formData.value.name,
      email: formData.value.email,
      role: formData.value.role,
      plan: formData.value.plan,
    };

    if (editingUser.value) {
      await requestClient.put(`/users/${editingUser.value._id}`, payload);
    } else {
      await requestClient.post('/users', payload);
    }
    showModal.value = false;
    await fetchUsers();
    message.success($t('views.users.messages.saved'));
  } catch (error) {
    console.error('Error saving user:', error);
    message.error($t('views.users.messages.saveFailed'));
  } finally {
    saving.value = false;
  }
}

async function deleteUser(id: string) {
  if (saving.value) return;
  if (confirm($t('views.users.messages.deleteConfirm'))) {
    saving.value = true;
    try {
      await requestClient.delete(`/users/${id}`);
      await fetchUsers();
      message.success($t('views.users.messages.deleted'));
    } catch (error) {
      console.error('Error deleting user:', error);
      message.error($t('views.users.messages.deleteFailed'));
    } finally {
      saving.value = false;
    }
  }
}

async function fetchUsers(options?: { resetPage?: boolean }) {
  if (options?.resetPage) page.value = 1;

  listLoading.value = true;
  try {
    const body = (await requestClient.get('/users', {
      params: {
        page: page.value,
        limit: limit.value,
        search: searchQuery.value || undefined,
        role: selectedRole.value || undefined,
      },
      responseReturn: 'body',
    })) as UsersListBody;

    if (!body || body.success !== true) {
      users.value = [];
      total.value = 0;
      serverTotalPages.value = null;
      return;
    }

    users.value = Array.isArray(body.data) ? body.data : [];
    total.value = Number(body.meta?.total ?? users.value.length) || 0;
    serverTotalPages.value =
      typeof body.meta?.totalPages === 'number' ? body.meta.totalPages : null;

    if (typeof body.meta?.page === 'number') page.value = body.meta.page;
    if (typeof body.meta?.limit === 'number') limit.value = body.meta.limit;
  } catch (error) {
    console.error('Error fetching users:', error);
    message.error($t('views.users.messages.loadFailed'));
  } finally {
    listLoading.value = false;
  }
}

onMounted(() => {
  fetchUsers();
});

function previousPage() {
  if (page.value > 1) {
    page.value--;
    fetchUsers();
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value++;
    fetchUsers();
  }
}

const totalPages = computed(() => {
  return (
    serverTotalPages.value ?? Math.max(Math.ceil(total.value / limit.value), 1)
  );
});

function applySearch() {
  fetchUsers({ resetPage: true });
}

function refresh() {
  fetchUsers();
}

function getRoleBadgeColor(role?: string) {
  if (role === 'super' || role === 'admin') return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400';
  if (role === 'editor') return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
  if (role === 'moderator') return 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400';
}

function getPlanBadgeColor(plan?: string) {
  if (plan === 'ultimate') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
  if (plan === 'premium') return 'bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-400';
  if (plan === 'standard') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50 dark:bg-background-dark/50">
    <!-- Title & Action -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ $t('views.users.adminTitle') || 'Quản lý Vben Admin' }}</h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">{{ $t('views.users.subtitle') }}</p>
      </div>
      <button @click="openCreateModal()" class="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all shadow-lg shadow-primary/20">
        <span class="material-symbols-outlined text-lg">add</span>
        <span>{{ $t('views.users.actions.create') }}</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 shadow-sm">
      <div class="flex-1 min-w-[280px]">
        <div class="relative">
	          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
	          <input v-model="searchQuery" @keyup.enter="applySearch" class="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-slate-900 dark:text-slate-100" :placeholder="$t('views.users.filters.searchPlaceholder')" type="text"/>
	        </div>

	        <select v-model.number="limit" @change="applySearch" :disabled="listLoading || saving" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-slate-100 outline-none disabled:opacity-50">
	          <option :value="10">{{ $t('views.users.filters.perPage', { count: 10 }) }}</option>
	          <option :value="20">{{ $t('views.users.filters.perPage', { count: 20 }) }}</option>
	          <option :value="50">{{ $t('views.users.filters.perPage', { count: 50 }) }}</option>
	          <option :value="100">{{ $t('views.users.filters.perPage', { count: 100 }) }}</option>
	        </select>
	      </div>
      <button @click="refresh" :disabled="listLoading || saving" class="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        <span class="material-symbols-outlined text-slate-500">refresh</span>
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
	          <thead>
	            <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
	              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('views.users.table.id') }}</th>
	              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('views.users.table.user') }}</th>
	              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('views.users.table.role') }}</th>
	              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</th>
	              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('views.users.table.status') }}</th>
	              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('views.users.table.lastLogin') }}</th>
	              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">{{ $t('views.users.table.actions') }}</th>
	            </tr>
	          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
            <tr v-if="listLoading">
               <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                 <span class="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
               </td>
            </tr>
	            <tr v-else-if="users.length === 0">
	               <td colspan="6" class="px-6 py-8 text-center text-slate-500">{{ $t('views.users.table.empty') }}</td>
	            </tr>
            <tr v-else v-for="user in users" :key="user._id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td class="px-6 py-4 text-sm text-slate-500">#{{ user._id.slice(-6) }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs bg-slate-200 text-slate-500 overflow-hidden">
                    <img v-if="user.avatarUrl" :src="user.avatarUrl" class="w-full h-full object-cover"/>
                    <span v-else>{{ user.name ? user.name.charAt(0).toUpperCase() : 'U' }}</span>
                  </div>
	                  <div>
	                    <p class="text-sm font-semibold">{{ user.name || $t('views.users.table.anonymous') }}</p>
	                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ user.email }}</p>
	                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="px-2 py-1 text-xs font-medium rounded capitalize" :class="getRoleBadgeColor(user.role)">{{ user.role || 'user' }}</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1 items-start">
                  <span class="px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider" :class="getPlanBadgeColor(user.plan)">{{ user.plan || 'free' }}</span>
                  <span v-if="user.plan && user.plan !== 'free' && user.planExpiresAt" class="text-[10px] text-slate-500 font-medium">
                    Exp: {{ dayjs(user.planExpiresAt).format('DD MMM YYYY') }}
                  </span>
                </div>
              </td>
	              <td class="px-6 py-4">
	                <span class="flex items-center gap-1.5 text-xs font-medium capitalize text-green-600 dark:text-green-400">
	                    <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
	                    {{ $t('views.users.table.active') }}
	                </span>
	              </td>
	              <td class="px-6 py-4 text-sm text-slate-500">{{ user.createdAt ? dayjs(user.createdAt).format('DD/MM/YYYY') : $t('views.users.table.na') }}</td>
	                  <td class="px-6 py-4 text-right">
	                <div class="flex justify-end gap-2">
	                    <button @click="openEditModal(user)" :disabled="saving" class="p-1.5 hover:bg-primary/10 hover:text-primary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :title="$t('views.users.actions.edit')"><span class="material-symbols-outlined text-lg">edit</span></button>
	                    <button @click="deleteUser(user._id)" :disabled="saving" class="p-1.5 hover:bg-red-100 hover:text-red-600 rounded transition-colors text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed" :title="$t('views.users.actions.delete')"><span class="material-symbols-outlined text-lg">delete</span></button>
	                </div>
	              </td>
            </tr>
          </tbody>
        </table>
      </div>
	      <!-- Pagination -->
	      <div v-if="!listLoading && total > 0" class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
	          <p class="text-sm text-slate-500 dark:text-slate-400">{{ $t('views.users.pagination.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) }}</p>
	          <div class="flex items-center gap-2">
	              <button @click="previousPage" :disabled="page <= 1 || saving" class="px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed">{{ $t('views.users.pagination.prev') }}</button>
	              <div class="flex items-center gap-1">
	                  <button class="w-8 h-8 flex items-center justify-center text-sm font-bold bg-primary text-white rounded-lg">{{ page }}</button>
	              </div>
	              <button @click="nextPage" :disabled="page >= totalPages || saving" class="px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed">{{ $t('views.users.pagination.next') }}</button>
	          </div>
	      </div>
    </div>

    <!-- User Modal Overlay -->
	    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm shadow-xl p-4">
	      <div class="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
	        <div class="p-6">
	          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-6">{{ editingUser ? $t('views.users.modal.editTitle') : $t('views.users.modal.createTitle') }}</h3>
	          <div class="space-y-4">
	            <div>
	              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('views.users.modal.nameLabel') }}</label>
	              <input v-model="formData.name" type="text" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white" placeholder="John Doe"/>
	            </div>
	            <div>
	              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('views.users.modal.emailLabel') }}</label>
	              <input v-model="formData.email" type="email" :disabled="!!editingUser" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white disabled:opacity-50" placeholder="admin@example.com"/>
	              <p v-if="editingUser" class="text-xs text-orange-500 mt-1">{{ $t('views.users.modal.emailLockedHint') }}</p>
	            </div>
	            <div>
	              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('views.users.modal.roleLabel') }}</label>
	              <select v-model="formData.role" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white appearance-none">
	                <option value="user">{{ $t('views.users.filters.roleUser') }}</option>
	                <option value="admin">{{ $t('views.users.filters.roleAdmin') }}</option>
	              </select>
	            </div>
	            <div>
	              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subscription Plan</label>
	              <select v-model="formData.plan" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white appearance-none">
	                <option value="free">Free</option>
	                <option value="standard">Standard</option>
	                <option value="premium">Premium</option>
	                <option value="ultimate">Ultimate</option>
	              </select>
	            </div>
	          </div>
	        </div>
	        <div class="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
	          <button @click="showModal = false" class="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">{{ $t('views.users.actions.cancel') }}</button>
	          <button @click="saveUser" :disabled="saving || !formData.name || !formData.email" class="px-5 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{{ $t('views.users.actions.save') }}</button>
	        </div>
	      </div>
	    </div>
  </div>
</template>
