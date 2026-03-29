<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { requestClient } from '../../api/request';
import dayjs from 'dayjs';
import { message } from 'ant-design-vue';
import { $t } from '../../locales';

type UserRef = {
  _id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
};

type TransactionRow = {
  _id: string;
  user: UserRef;
  amount: number;
  currency: string;
  planPurchased: 'free' | 'standard' | 'premium' | 'ultimate';
  billingCycle: 'monthly' | 'annual';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  createdAt: string;
};

type TransactionsListBody = {
  success: boolean;
  data: TransactionRow[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

const transactions = ref<TransactionRow[]>([]);
const listLoading = ref(false);
const saving = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const serverTotalPages = ref<number | null>(null);

// Form State
const showModal = ref(false);
const editingTransaction = ref<TransactionRow | null>(null);
const formData = ref({ status: 'completed' });

function openEditModal(transaction: TransactionRow) {
  if (saving.value) return;
  editingTransaction.value = transaction;
  formData.value = { status: transaction.status };
  showModal.value = true;
}

async function saveTransaction() {
  saving.value = true;
  try {
    const payload = {
      status: formData.value.status,
    };

    if (editingTransaction.value) {
      await requestClient.put(`/payment/transactions/${editingTransaction.value._id}`, payload);
    }
    showModal.value = false;
    await fetchTransactions();
    message.success($t('views.transactions.messages.saved') || 'Transaction updated successfully');
  } catch (error) {
    console.error('Error saving transaction:', error);
    message.error($t('views.transactions.messages.saveFailed') || 'Failed to update transaction');
  } finally {
    saving.value = false;
  }
}

async function fetchTransactions(options?: { resetPage?: boolean }) {
  if (options?.resetPage) page.value = 1;

  listLoading.value = true;
  try {
    const res = await requestClient.get('/payment/transactions', {
      params: {
        page: page.value,
        limit: limit.value,
      },
      responseReturn: 'body',
    });

    // @ts-ignore
    const body = res || {};
    // @ts-ignore
    const finalData = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : []);
    
    transactions.value = finalData;
    // @ts-ignore
    total.value = Number(body?.meta?.total ?? finalData.length) || 0;
    // @ts-ignore
    serverTotalPages.value = typeof body?.meta?.totalPages === 'number' ? body.meta.totalPages : null;

    // @ts-ignore
    if (typeof body?.meta?.page === 'number') page.value = body.meta.page;
    // @ts-ignore
    if (typeof body?.meta?.limit === 'number') limit.value = body.meta.limit;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    message.error($t('views.transactions.messages.loadFailed') || 'Failed to load transactions');
  } finally {
    listLoading.value = false;
  }
}

onMounted(() => {
  fetchTransactions();
});

function previousPage() {
  if (page.value > 1) {
    page.value--;
    fetchTransactions();
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value++;
    fetchTransactions();
  }
}

const totalPages = computed(() => {
  return (
    serverTotalPages.value ?? Math.max(Math.ceil(total.value / limit.value), 1)
  );
});

function refresh() {
  fetchTransactions();
}

function applySearch() {
  fetchTransactions({ resetPage: true });
}

function getStatusBadgeColor(status: string) {
  if (status === 'completed') return 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400';
  if (status === 'failed') return 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400';
  if (status === 'refunded') return 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400';
  if (status === 'pending') return 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
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
    <!-- Title -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ $t('views.transactions.title') || 'Transactions' }}</h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">{{ $t('views.transactions.subtitle') || 'Manage and view all transactions and subscriptions' }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 shadow-sm">
      <div class="w-full md:w-44">
        <select v-model.number="limit" @change="applySearch" :disabled="listLoading || saving" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-slate-100 outline-none disabled:opacity-50">
          <option :value="10">{{ $t('views.transactions.filters.perPage', { count: 10 }) || '10 per page' }}</option>
          <option :value="20">{{ $t('views.transactions.filters.perPage', { count: 20 }) || '20 per page' }}</option>
          <option :value="50">{{ $t('views.transactions.filters.perPage', { count: 50 }) || '50 per page' }}</option>
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
              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('views.transactions.table.id') || 'ID' }}</th>
              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('views.transactions.table.user') || 'User' }}</th>
              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('views.transactions.table.plan') || 'Purchased Plan' }}</th>
              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('views.transactions.table.amount') || 'Amount' }}</th>
              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('views.transactions.table.status') || 'Status' }}</th>
              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ $t('views.transactions.table.date') || 'Date' }}</th>
              <th class="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">{{ $t('views.transactions.table.actions') || 'Actions' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-slate-100">
            <tr v-if="listLoading">
               <td colspan="7" class="px-6 py-12 text-center text-slate-500">
                 <span class="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
               </td>
            </tr>
            <tr v-else-if="transactions.length === 0">
               <td colspan="7" class="px-6 py-8 text-center text-slate-500">{{ $t('views.transactions.table.empty') || 'No transactions found.' }}</td>
            </tr>
            <tr v-else v-for="tx in transactions" :key="tx._id" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <td class="px-6 py-4 text-sm text-slate-500 font-mono">#{{ tx._id.slice(-6) }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-slate-200 text-slate-500 overflow-hidden">
                    <img v-if="tx.user?.avatarUrl" :src="tx.user.avatarUrl" class="w-full h-full object-cover"/>
                    <span v-else>{{ tx.user?.name ? tx.user.name.charAt(0).toUpperCase() : 'U' }}</span>
                  </div>
                  <div>
                    <p class="text-sm font-semibold">{{ tx.user?.name || 'Unknown' }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ tx.user?.email || '--' }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1 items-start">
                  <span class="px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider" :class="getPlanBadgeColor(tx.planPurchased)">{{ tx.planPurchased }}</span>
                  <span class="text-xs text-slate-500 capitalize">{{ tx.billingCycle }}</span>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="font-bold text-sm">{{ tx.amount }} {{ tx.currency }}</span><br/>
                <span class="text-xs text-slate-500 uppercase">{{ tx.paymentMethod }}</span>
              </td>
              <td class="px-6 py-4">
                <span class="px-2 py-1 text-xs font-medium rounded capitalize" :class="getStatusBadgeColor(tx.status)">{{ tx.status }}</span>
              </td>
              <td class="px-6 py-4 text-sm text-slate-500">{{ tx.createdAt ? dayjs(tx.createdAt).format('DD/MM/YYYY HH:mm') : '--' }}</td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                    <button @click="openEditModal(tx)" :disabled="saving" class="p-1.5 hover:bg-primary/10 hover:text-primary rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" :title="$t('views.transactions.actions.edit') || 'Edit Status'"><span class="material-symbols-outlined text-lg">edit</span></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div v-if="!listLoading && total > 0" class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ $t('views.transactions.pagination.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) || `Showing ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} of ${total}` }}</p>
          <div class="flex items-center gap-2">
              <button @click="previousPage" :disabled="page <= 1 || saving" class="px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed">{{ $t('views.transactions.pagination.prev') || 'Prev' }}</button>
              <div class="flex items-center gap-1">
                  <button class="w-8 h-8 flex items-center justify-center text-sm font-bold bg-primary text-white rounded-lg">{{ page }}</button>
              </div>
              <button @click="nextPage" :disabled="page >= totalPages || saving" class="px-3 py-1.5 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed">{{ $t('views.transactions.pagination.next') || 'Next' }}</button>
          </div>
      </div>
    </div>

    <!-- Edit Modal Overlay -->
    <div v-if="showModal" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm shadow-xl p-4">
      <div class="bg-white dark:bg-slate-900 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div class="p-6">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-6">{{ $t('views.transactions.modal.editTitle') || 'Update Transaction' }}</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('views.transactions.modal.statusLabel') || 'Status' }}</label>
              <select v-model="formData.status" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white appearance-none">
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
        </div>
        <div class="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
          <button @click="showModal = false" class="px-5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">{{ $t('views.transactions.actions.cancel') || 'Cancel' }}</button>
          <button @click="saveTransaction" :disabled="saving" class="px-5 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{{ $t('views.transactions.actions.save') || 'Save' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
