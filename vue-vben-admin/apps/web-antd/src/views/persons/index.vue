<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { message, Select as ASelect } from 'ant-design-vue';

import { requestClient } from '../../api/request';

type PersonItem = {
  _id?: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  biography?: string;
  gender?: string;
  placeOfBirth?: string;
  knownFor?: string | string[];
  views?: number;
};

const items = ref<PersonItem[]>([]);
const listLoading = ref(false);
const saving = ref(false);

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
});

const searchQuery = ref('');
const knownForFilter = ref('');
const sortFilter = ref('-views');

const roleOptions = ref<string[]>([]);

async function fetchRoleOptions() {
  try {
    const res = await requestClient.get('/persons/roles');
    // @ts-ignore
    const fetched = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
    const defaultRoles = ['acting', 'directing', 'producing', 'writing', 'music', 'editing', 'camera'];
    roleOptions.value = Array.from(new Set([...defaultRoles, ...fetched]));
  } catch (err) {
    console.error('Failed to fetch role options', err);
    roleOptions.value = ['acting', 'directing', 'producing', 'writing', 'music', 'editing', 'camera'];
  }
}

// Modal state
const showModal = ref(false);
const editingItem = ref<PersonItem | null>(null);
const formData = ref({
  name: '',
  slug: '',
  avatarUrl: '',
  biography: '',
  gender: 'unknown',
  placeOfBirth: '',
  knownFor: ['acting'],
});

async function fetchItems() {
  listLoading.value = true;
  try {
    const res = await requestClient.get(`/persons`, {
      params: {
        page: pagination.value.page,
        limit: pagination.value.limit,
        search: searchQuery.value || undefined,
        knownFor: knownForFilter.value || undefined,
        sort: sortFilter.value || undefined,
      },
      responseReturn: 'body',
    });
    
    // @ts-ignore
    const body = res || {};
    // @ts-ignore
    items.value = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
    // @ts-ignore
    pagination.value.total = Number(body?.meta?.total) || items.value.length;
  } catch (err) {
    console.error('Error fetching persons', err);
    message.error('Failed to load cast & crew data');
  } finally {
    listLoading.value = false;
  }
}

onMounted(() => {
  fetchItems();
  fetchRoleOptions();
});

function handleSearch() {
  pagination.value.page = 1;
  fetchItems();
}

function openCreateModal() {
  if (saving.value) return;
  editingItem.value = null;
  formData.value = {
    name: '',
    slug: '',
    avatarUrl: '',
    biography: '',
    gender: 'unknown',
    placeOfBirth: '',
    knownFor: ['acting'],
  };
  showModal.value = true;
}

function openEditModal(item: PersonItem) {
  if (saving.value) return;
  editingItem.value = item;
  formData.value = {
    name: item.name,
    slug: item.slug,
    avatarUrl: item.avatarUrl || '',
    biography: item.biography || '',
    gender: item.gender || 'unknown',
    placeOfBirth: item.placeOfBirth || '',
    knownFor: Array.isArray(item.knownFor) ? item.knownFor : [item.knownFor || 'acting'],
  };
  showModal.value = true;
}

async function saveItem() {
  if (!formData.value.name) return;
  saving.value = true;
  try {
    if (editingItem.value) {
      const id = editingItem.value._id;
      await requestClient.put(`/persons/${id}`, formData.value);
    } else {
      await requestClient.post(`/persons`, formData.value);
    }
    showModal.value = false;
    await fetchItems();
    message.success('Person saved successfully');
  } catch (err) {
    console.error('Error saving person', err);
    message.error('Failed to save person');
  } finally {
    saving.value = false;
  }
}

async function deleteItem(id: string) {
  if (!confirm('Are you sure you want to delete this person? This will also remove them from all assigned movies.')) return;
  saving.value = true;
  try {
    await requestClient.delete(`/persons/${id}`);
    await fetchItems();
    message.success('Person deleted successfully');
  } catch (err) {
    console.error('Error deleting person', err);
    message.error('Failed to delete person');
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
    .replace(/[^0-9a-z\s-]/g, '')
    .replace(/\s+/g, '-')
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
        <h3 class="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Cast & Crew</h3>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Manage all actors and directors across movies</p>
      </div>
      <div class="flex gap-3 items-center flex-wrap justify-end">
        <select 
          v-model="knownForFilter" 
          @change="handleSearch"
          class="px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary/20 outline-none capitalize"
        >
          <option value="">All Roles</option>
          <option value="acting" v-if="!roleOptions.includes('acting')">Acting</option>
          <option value="directing" v-if="!roleOptions.includes('directing')">Directing</option>
          <option v-for="role in roleOptions" :key="role" :value="role">{{ role }}</option>
        </select>
        
        <select 
          v-model="sortFilter" 
          @change="handleSearch"
          class="px-4 py-2 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
        >
          <option value="-views">Most Viewed</option>
          <option value="views">Least Viewed</option>
          <option value="name">Name (A-Z)</option>
          <option value="-name">Name (Z-A)</option>
        </select>

        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          <input 
            v-model="searchQuery" 
            @keyup.enter="handleSearch"
            type="text" 
            placeholder="Search by name..." 
            class="pl-9 pr-4 py-2 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary/20 outline-none w-full md:w-64"
          />
        </div>
        <button
          @click="openCreateModal()"
          :disabled="saving"
          class="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-base">person_add</span>
          Create New
        </button>
      </div>
    </div>

    <!-- Data Table -->
    <div class="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Avatar</th>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name & Slug</th>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Known For</th>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Views</th>
            <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-white">
          <tr v-if="listLoading">
            <td colspan="5" class="px-6 py-12 text-center text-slate-500">
              <span class="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
            </td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="5" class="px-6 py-8 text-center text-slate-500">No Cast or Crew found.</td>
          </tr>
          <tr v-else v-for="item in items" :key="item._id" class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
            <td class="px-6 py-4">
              <img v-if="item.avatarUrl" :src="item.avatarUrl" class="w-12 h-12 object-cover rounded-full border border-slate-200 dark:border-slate-700" />
              <div v-else class="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <span class="material-symbols-outlined">person</span>
              </div>
            </td>
            <td class="px-6 py-4">
              <div class="font-bold text-sm">{{ item.name }}</div>
              <div class="text-xs text-slate-500">{{ item.slug }}</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500 capitalize">
              <div class="flex flex-wrap gap-1">
                <span v-for="role in (Array.isArray(item.knownFor) ? item.knownFor : [item.knownFor || 'acting'])" :key="role" class="px-2 py-1 rounded-md text-xs font-medium" :class="role === 'acting' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'">
                  {{ role }}
                </span>
              </div>
            </td>
            <td class="px-6 py-4 text-sm font-medium">{{ item.views?.toLocaleString() || 0 }}</td>
            <td class="px-6 py-4 text-right">
              <div class="flex justify-end gap-2">
                <button
                  @click="openEditModal(item)"
                  :disabled="saving"
                  class="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors disabled:opacity-50"
                  title="Edit cast"
                >
                  <span class="material-symbols-outlined text-lg">edit</span>
                </button>
                <button
                  @click="deleteItem(String(item._id))"
                  :disabled="saving"
                  class="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete cast"
                >
                  <span class="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Pagination Controls (Simple) -->
      <div v-if="!listLoading && items.length > 0 && pagination.total > pagination.limit" class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <span class="text-sm text-slate-500">
          Showing {{ (pagination.page - 1) * pagination.limit + 1 }}-{{ Math.min(pagination.page * pagination.limit, pagination.total) }} of {{ pagination.total }} items
        </span>
        <div class="flex items-center gap-2">
           <button @click="pagination.page--; fetchItems()" :disabled="pagination.page <= 1" class="px-3 py-1.5 text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors border border-transparent dark:border-slate-700">Prev</button>
           <div class="flex items-center gap-1">
              <button class="w-8 h-8 flex items-center justify-center text-sm font-bold bg-primary text-white rounded-lg shadow-sm shadow-primary/30">{{ pagination.page }}</button>
           </div>
           <button @click="pagination.page++; fetchItems()" :disabled="items.length < pagination.limit" class="px-3 py-1.5 text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50 transition-colors border border-transparent dark:border-slate-700">Next</button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="bg-white dark:bg-slate-900 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        <div class="p-6 overflow-y-auto">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-6">
            {{ editingItem ? 'Edit Person' : 'Create New Person' }}
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input
                v-model="formData.name"
                @blur="generateSlug"
                type="text"
                class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Slug</label>
              <input
                v-model="formData.slug"
                type="text"
                class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
              />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Avatar Image URL</label>
              <input
                v-model="formData.avatarUrl"
                type="text"
                class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gender</label>
              <select v-model="formData.gender" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Known For</label>
              <!-- eslint-disable vue/no-v-model-argument -->
              <ASelect
                v-model:value="formData.knownFor"
                mode="tags"
                class="w-full"
                :token-separators="[',']"
                :getPopupContainer="(triggerNode) => triggerNode.parentNode"
                placeholder="Type and press enter to add custom role..."
                :options="[{value: 'acting', label: 'Acting'}, {value: 'directing', label: 'Directing'}, {value: 'producing', label: 'Producing'}, {value: 'writing', label: 'Writing'}, {value: 'music', label: 'Music'}, {value: 'editing', label: 'Editing'}, {value: 'camera', label: 'Camera'}]"
              />
              <!-- eslint-enable vue/no-v-model-argument -->
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Place of Birth</label>
              <input
                v-model="formData.placeOfBirth"
                type="text"
                class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 dark:text-white"
              />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Biography</label>
              <textarea
                v-model="formData.biography"
                rows="4"
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
            Cancel
          </button>
          <button
            @click="saveItem"
            :disabled="saving || !formData.name"
            class="px-5 py-2 text-sm font-bold bg-primary text-white rounded-lg opacity-100 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <span class="material-symbols-outlined text-[18px]">save</span>
            Save Profile
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
