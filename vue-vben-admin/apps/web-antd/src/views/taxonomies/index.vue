<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { message } from 'ant-design-vue';

import { requestClient } from '../../api/request';
import { $t } from '../../locales';

type TaxonomyType = 'category' | 'country' | 'format' | 'quality';
type TaxonomyItem = {
  _id?: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
};

const activeTab = ref<TaxonomyType>('category');
const tabs: Array<{
  endpoint: TaxonomyType;
  key: TaxonomyType;
  titleKey: string;
}> = [
  { key: 'category', titleKey: 'views.taxonomies.tabs.category', endpoint: 'category' },
  { key: 'country', titleKey: 'views.taxonomies.tabs.country', endpoint: 'country' },
  { key: 'format', titleKey: 'views.taxonomies.tabs.format', endpoint: 'format' },
  { key: 'quality', titleKey: 'views.taxonomies.tabs.quality', endpoint: 'quality' },
];

const items = ref<TaxonomyItem[]>([]);
const listLoading = ref(false);
const saving = ref(false);

// Modal state
const showModal = ref(false);
const editingItem = ref<TaxonomyItem | null>(null);
const formData = ref({
  name: '',
  slug: '',
  description: '',
});

async function fetchItems() {
  listLoading.value = true;
  try {
    const res = await requestClient.get(`/taxonomies/${activeTab.value}`);
    items.value = Array.isArray(res) ? res : [];
  } catch (err) {
    console.error('Error fetching taxonomies', err);
    message.error($t('views.taxonomies.messages.loadFailed'));
  } finally {
    listLoading.value = false;
  }
}

onMounted(() => {
  fetchItems();
});

function handleTabChange(key: TaxonomyType) {
  if (saving.value) return;
  activeTab.value = key;
  fetchItems();
}

function openCreateModal() {
  if (saving.value) return;
  editingItem.value = null;
  formData.value = { name: '', slug: '', description: '' };
  showModal.value = true;
}

function openEditModal(item: TaxonomyItem) {
  if (saving.value) return;
  editingItem.value = item;
  formData.value = {
    name: item.name,
    slug: item.slug,
    description: item.description || '',
  };
  showModal.value = true;
}

async function saveItem() {
  if (!formData.value.name) return;
  saving.value = true;
  try {
    if (editingItem.value) {
      const id = editingItem.value._id || editingItem.value.id;
      await requestClient.put(`/taxonomies/${activeTab.value}/${id}`, formData.value);
    } else {
      await requestClient.post(`/taxonomies/${activeTab.value}`, formData.value);
    }
    showModal.value = false;
    await fetchItems();
    message.success($t('views.taxonomies.messages.saved'));
  } catch (err) {
    console.error('Error saving taxonomy', err);
    message.error($t('views.taxonomies.messages.saveFailed'));
  } finally {
    saving.value = false;
  }
}

async function deleteItem(id: string) {
  if (!confirm($t('views.taxonomies.messages.deleteConfirm'))) return;
  saving.value = true;
  try {
    await requestClient.delete(`/taxonomies/${activeTab.value}/${id}`);
    await fetchItems();
    message.success($t('views.taxonomies.messages.deleted'));
  } catch (err) {
    console.error('Error deleting taxonomy', err);
    message.error($t('views.taxonomies.messages.deleteFailed'));
  } finally {
    saving.value = false;
  }
}

function generateSlug() {
  if (!formData.value.name || formData.value.slug) return;

  const slug = formData.value.name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^0-9a-z\\s-]/g, '')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  formData.value.slug = slug;
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50 dark:bg-background-dark/50">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h3 class="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{{ $t('views.taxonomies.title') }}</h3>
        <p class="text-slate-500 dark:text-slate-400 mt-1">{{ $t('views.taxonomies.subtitle') }}</p>
      </div>
      <button
        @click="openCreateModal()"
        :disabled="saving"
        class="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
      >
        <span class="material-symbols-outlined text-base">add_box</span>
        {{ $t('views.taxonomies.actions.create') }}
      </button>
    </div>

    <!-- Tabs -->
    <div class="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-2 flex gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="handleTabChange(tab.key)"
        class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
        :class="activeTab === tab.key ? 'bg-primary text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
      >
        {{ $t(tab.titleKey) }}
      </button>
    </div>

    <!-- Data Table -->
    <div class="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.taxonomies.table.id') }}</th>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.taxonomies.table.name') }}</th>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.taxonomies.table.slug') }}</th>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.taxonomies.table.description') }}</th>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{{ $t('views.taxonomies.table.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-white">
          <tr v-if="listLoading">
            <td colspan="5" class="px-6 py-12 text-center text-slate-500">
              <span class="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
            </td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-slate-500">{{ $t('views.taxonomies.table.empty') }}</td>
          </tr>
          <tr v-else v-for="item in items" :key="item._id || item.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
            <td class="px-6 py-4 text-xs font-medium text-slate-500 max-w-[100px] truncate" :title="item._id">{{ item._id }}</td>
            <td class="px-6 py-4 font-bold text-sm">{{ item.name }}</td>
            <td class="px-6 py-4 text-sm text-slate-500">{{ item.slug }}</td>
            <td class="px-6 py-4 text-sm text-slate-500 opacity-80">{{ item.description || '--' }}</td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end gap-2">
                <button
                  @click="openEditModal(item)"
                  :disabled="saving"
                  class="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors disabled:opacity-50"
                  :title="$t('views.taxonomies.actions.edit')"
                >
                  <span class="material-symbols-outlined text-lg">edit</span>
                </button>
                <button
                  @click="deleteItem(String(item._id || item.id))"
                  :disabled="saving"
                  class="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                  :title="$t('views.taxonomies.actions.delete')"
                >
                  <span class="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div class="p-6">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-6">
            {{ editingItem ? $t('views.taxonomies.modal.editTitle') : $t('views.taxonomies.modal.createTitle') }}
          </h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('views.taxonomies.modal.nameLabel') }}</label>
              <input
                v-model="formData.name"
                @blur="generateSlug"
                type="text"
                class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                :placeholder="$t('views.taxonomies.modal.namePlaceholder')"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('views.taxonomies.modal.slugLabel') }}</label>
              <input
                v-model="formData.slug"
                type="text"
                class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
                :placeholder="$t('views.taxonomies.modal.slugPlaceholder')"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{{ $t('views.taxonomies.modal.descriptionLabel') }}</label>
              <textarea
                v-model="formData.description"
                rows="3"
                class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
              ></textarea>
            </div>
          </div>
        </div>
        <div class="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
          <button
            @click="showModal = false"
            :disabled="saving"
            class="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {{ $t('views.taxonomies.actions.cancel') }}
          </button>
          <button
            @click="saveItem"
            :disabled="saving || !formData.name"
            class="px-5 py-2 text-sm font-bold bg-primary text-white rounded-lg opacity-100 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <span class="material-symbols-outlined text-[18px]">save</span>
            {{ $t('views.taxonomies.actions.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
