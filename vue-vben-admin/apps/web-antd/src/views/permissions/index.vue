<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { message } from 'ant-design-vue';

import { requestClient } from '../../api/request';
import { $t } from '../../locales';

type RoleKey = 'admin' | 'editor' | 'moderator' | 'user';
type ActionKey = 'view' | 'create' | 'edit' | 'delete';

type RolePermission = {
  role: RoleKey;
  codes: string[];
};

const roles: Array<{ key: RoleKey; labelKey: string; icon: string; descKey: string }> = [
  { key: 'admin', labelKey: 'views.permissions.roles.admin.label', icon: 'admin_panel_settings', descKey: 'views.permissions.roles.admin.desc' },
  { key: 'editor', labelKey: 'views.permissions.roles.editor.label', icon: 'edit_note', descKey: 'views.permissions.roles.editor.desc' },
  { key: 'moderator', labelKey: 'views.permissions.roles.moderator.label', icon: 'gavel', descKey: 'views.permissions.roles.moderator.desc' },
  { key: 'user', labelKey: 'views.permissions.roles.user.label', icon: 'person', descKey: 'views.permissions.roles.user.desc' },
];

const matrix = [
  {
    moduleKey: 'views.permissions.modules.movies',
    icon: 'movie',
    actions: {
      view: 'AC_MOVIES_VIEW',
      create: 'AC_MOVIES_CREATE',
      edit: 'AC_MOVIES_EDIT',
      delete: 'AC_MOVIES_DELETE',
    } as Record<ActionKey, string>,
  },
  {
    moduleKey: 'views.permissions.modules.comments',
    icon: 'forum',
    actions: {
      view: 'AC_COMMENTS_VIEW',
      create: 'AC_COMMENTS_MODERATE',
      edit: 'AC_COMMENTS_MODERATE',
      delete: 'AC_COMMENTS_DELETE',
    } as Record<ActionKey, string>,
  },
  {
    moduleKey: 'views.permissions.modules.taxonomies',
    icon: 'category',
    actions: {
      view: 'AC_TAXONOMIES_VIEW',
      create: 'AC_TAXONOMIES_EDIT',
      edit: 'AC_TAXONOMIES_EDIT',
      delete: 'AC_TAXONOMIES_EDIT',
    } as Record<ActionKey, string>,
  },
  {
    moduleKey: 'views.permissions.modules.users',
    icon: 'group',
    actions: {
      view: 'AC_USERS_VIEW',
      create: 'AC_USERS_CREATE',
      edit: 'AC_USERS_EDIT',
      delete: 'AC_USERS_DELETE',
    } as Record<ActionKey, string>,
  },
  {
    moduleKey: 'views.permissions.modules.analytics',
    icon: 'monitoring',
    actions: {
      view: 'AC_ANALYTICS_VIEW',
      create: 'AC_ANALYTICS_VIEW',
      edit: 'AC_ANALYTICS_VIEW',
      delete: 'AC_ANALYTICS_VIEW',
    } as Record<ActionKey, string>,
  },
  {
    moduleKey: 'views.permissions.modules.settings',
    icon: 'settings',
    actions: {
      view: 'AC_SETTINGS_VIEW',
      create: 'AC_SETTINGS_EDIT',
      edit: 'AC_SETTINGS_EDIT',
      delete: 'AC_SETTINGS_EDIT',
    } as Record<ActionKey, string>,
  },
];

const advanced = [
  {
    code: 'AC_SYS_BYPASS_MAINTENANCE',
    titleKey: 'views.permissions.advanced.bypassMaintenance.title',
    descKey: 'views.permissions.advanced.bypassMaintenance.desc',
  },
  {
    code: 'AC_SYS_API_KEYS',
    titleKey: 'views.permissions.advanced.apiKeys.title',
    descKey: 'views.permissions.advanced.apiKeys.desc',
  },
  {
    code: 'AC_SYS_VIEW_LOGS',
    titleKey: 'views.permissions.advanced.viewLogs.title',
    descKey: 'views.permissions.advanced.viewLogs.desc',
  },
  {
    code: 'AC_SYS_DB_BACKUP',
    titleKey: 'views.permissions.advanced.dbBackup.title',
    descKey: 'views.permissions.advanced.dbBackup.desc',
  },
];

const activeRole = ref<RoleKey>('admin');
const listLoading = ref(false);
const saving = ref(false);

const rolePerms = ref<Record<RoleKey, RolePermission>>({
  admin: { role: 'admin', codes: [] },
  editor: { role: 'editor', codes: [] },
  moderator: { role: 'moderator', codes: [] },
  user: { role: 'user', codes: [] },
});
const initialRolePerms = ref<Record<RoleKey, RolePermission> | null>(null);

function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function codesSet(role: RoleKey) {
  return new Set((rolePerms.value[role]?.codes || []).filter(Boolean));
}

function isChecked(role: RoleKey, code: string) {
  return codesSet(role).has(code);
}

function setChecked(role: RoleKey, code: string, e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  const current = rolePerms.value[role]?.codes || [];
  const set = new Set(current);
  if (checked) set.add(code);
  else set.delete(code);
  rolePerms.value[role] = { role, codes: Array.from(set) };
}

const allMatrixCodes = computed(() => {
  const set = new Set<string>();
  for (const row of matrix) {
    for (const code of Object.values(row.actions)) set.add(code);
  }
  for (const item of advanced) set.add(item.code);
  return Array.from(set);
});

const isAllSelected = computed(() => {
  const set = codesSet(activeRole.value);
  return allMatrixCodes.value.every((c) => set.has(c));
});

function toggleSelectAll() {
  const role = activeRole.value;
  const set = codesSet(role);
  if (isAllSelected.value) {
    for (const code of allMatrixCodes.value) set.delete(code);
  } else {
    for (const code of allMatrixCodes.value) set.add(code);
  }
  rolePerms.value[role] = { role, codes: Array.from(set) };
}

const isDirty = computed(() => {
  if (!initialRolePerms.value) return false;
  return JSON.stringify(rolePerms.value) !== JSON.stringify(initialRolePerms.value);
});

const activeRoleLabel = computed(() => {
  const labelKey = roles.find((r) => r.key === activeRole.value)?.labelKey;
  return labelKey ? $t(labelKey) : String(activeRole.value);
});

async function fetchRoles() {
  listLoading.value = true;
  try {
    const items = (await requestClient.get('/permissions/roles')) as any[];
    const next = cloneJson(rolePerms.value);
    for (const it of items || []) {
      const role = String(it.role || '').toLowerCase() as RoleKey;
      if (!roles.some((r) => r.key === role)) continue;
      next[role] = { role, codes: Array.isArray(it.codes) ? it.codes : [] };
    }
    rolePerms.value = next;
    initialRolePerms.value = cloneJson(next);
  } catch (err) {
    console.error('Failed to fetch role permissions:', err);
    message.error($t('views.permissions.messages.loadFailed'));
  } finally {
    listLoading.value = false;
  }
}

function discard() {
  if (!initialRolePerms.value) return;
  rolePerms.value = cloneJson(initialRolePerms.value);
  message.info($t('views.permissions.messages.discarded'));
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  try {
    const role = activeRole.value;
    const payload = { codes: rolePerms.value[role].codes || [] };
    const updated = (await requestClient.put(`/permissions/roles/${role}`, payload)) as RolePermission;

    rolePerms.value[role] = {
      role,
      codes: Array.isArray((updated as any)?.codes) ? (updated as any).codes : payload.codes,
    };
    initialRolePerms.value = cloneJson(rolePerms.value);
    message.success($t('views.permissions.messages.saved'));
  } catch (err) {
    console.error('Failed to save role permissions:', err);
    message.error($t('views.permissions.messages.saveFailed'));
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  fetchRoles();
});
</script>

<template>
  <div class="flex-1 px-4 md:px-10 py-8 bg-slate-50 dark:bg-background-dark/50">
    <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
      <div class="flex flex-col gap-1">
        <h1 class="text-slate-900 dark:text-slate-100 text-3xl font-bold tracking-tight">{{ $t('views.permissions.title') }}</h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm">{{ $t('views.permissions.subtitle') }}</p>
      </div>
      <div class="flex gap-3">
        <button
          @click="discard"
          :disabled="listLoading || saving || !isDirty"
          class="flex items-center justify-center rounded-lg h-10 px-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ $t('views.permissions.actions.discard') }}
        </button>
        <button
          @click="save"
          :disabled="listLoading || saving || !isDirty"
          class="flex items-center justify-center rounded-lg h-10 px-6 bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ $t('views.permissions.actions.save') }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <aside class="lg:col-span-1 space-y-2">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">{{ $t('views.permissions.matrix.availableRoles') }}</h3>

        <button
          v-for="r in roles"
          :key="r.key"
          @click="activeRole = r.key"
          :disabled="listLoading || saving"
          :class="[
            'w-full flex items-center justify-between px-4 py-3 rounded-lg group transition-all',
            activeRole === r.key
              ? 'bg-primary/10 border-r-4 border-primary text-primary rounded-l-lg'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
          ]"
        >
          <div class="flex items-center gap-3 text-left">
            <span class="material-symbols-outlined text-[20px]">{{ r.icon }}</span>
            <div class="flex flex-col">
              <span class="font-medium">{{ $t(r.labelKey) }}</span>
              <span class="text-[10px] opacity-70">{{ $t(r.descKey) }}</span>
            </div>
          </div>
          <span v-if="activeRole === r.key" class="text-xs bg-primary/20 px-2 py-0.5 rounded-full">{{ $t('views.permissions.status.active') }}</span>
        </button>

        <div v-if="isDirty" class="mt-4 px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs font-semibold">
          {{ $t('views.permissions.status.unsaved') }}
        </div>
      </aside>

      <div class="lg:col-span-3">
        <div class="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-slate-900 dark:text-slate-100">
          <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900/60">
            <div>
              <h2 class="text-xl font-bold">{{ $t('views.permissions.matrix.title', { role: activeRoleLabel }) }}</h2>
              <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">{{ $t('views.permissions.matrix.subtitle') }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-slate-500 dark:text-slate-400">
                {{ isAllSelected ? $t('views.permissions.matrix.deselectAll') : $t('views.permissions.matrix.selectAll') }}
              </span>
              <input
                :checked="isAllSelected"
                @change="toggleSelectAll"
                :disabled="listLoading || saving"
                class="h-5 w-5 rounded border-slate-300 dark:border-slate-700 bg-transparent text-primary focus:ring-primary focus:ring-offset-background-dark cursor-pointer disabled:opacity-50"
                type="checkbox"
              />
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead class="bg-slate-50 dark:bg-slate-900/60 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th class="px-6 py-4 w-1/3">{{ $t('views.permissions.table.module') }}</th>
                  <th class="px-4 py-4 text-center">{{ $t('views.permissions.table.view') }}</th>
                  <th class="px-4 py-4 text-center">{{ $t('views.permissions.table.create') }}</th>
                  <th class="px-4 py-4 text-center">{{ $t('views.permissions.table.edit') }}</th>
                  <th class="px-4 py-4 text-center">{{ $t('views.permissions.table.delete') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
                <tr v-if="listLoading">
                  <td colspan="5" class="px-6 py-10 text-center text-slate-500">
                    <span class="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                  </td>
                </tr>
                <tr v-else v-for="item in matrix" :key="item.moduleKey" class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <span class="material-symbols-outlined text-primary/70">{{ item.icon }}</span>
                      <span class="font-medium text-sm">{{ $t(item.moduleKey) }}</span>
                    </div>
                  </td>

                  <td class="px-4 py-4 text-center">
                    <input
                      :checked="isChecked(activeRole, item.actions.view)"
                      @change="(e) => setChecked(activeRole, item.actions.view, e)"
                      :disabled="saving"
                      class="h-5 w-5 rounded border-slate-300 dark:border-slate-700 bg-transparent text-primary focus:ring-primary disabled:opacity-50"
                      type="checkbox"
                    />
                  </td>
                  <td class="px-4 py-4 text-center">
                    <input
                      :checked="isChecked(activeRole, item.actions.create)"
                      @change="(e) => setChecked(activeRole, item.actions.create, e)"
                      :disabled="saving"
                      class="h-5 w-5 rounded border-slate-300 dark:border-slate-700 bg-transparent text-primary focus:ring-primary disabled:opacity-50"
                      type="checkbox"
                    />
                  </td>
                  <td class="px-4 py-4 text-center">
                    <input
                      :checked="isChecked(activeRole, item.actions.edit)"
                      @change="(e) => setChecked(activeRole, item.actions.edit, e)"
                      :disabled="saving"
                      class="h-5 w-5 rounded border-slate-300 dark:border-slate-700 bg-transparent text-primary focus:ring-primary disabled:opacity-50"
                      type="checkbox"
                    />
                  </td>
                  <td class="px-4 py-4 text-center">
                    <input
                      :checked="isChecked(activeRole, item.actions.delete)"
                      @change="(e) => setChecked(activeRole, item.actions.delete, e)"
                      :disabled="saving"
                      class="h-5 w-5 rounded border-slate-300 dark:border-slate-700 bg-transparent text-primary focus:ring-primary disabled:opacity-50"
                      type="checkbox"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="p-6 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-800">
            <h4 class="text-sm font-bold mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px]">lock_open</span>
              {{ $t('views.permissions.advanced.title') }}
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="p in advanced"
                :key="p.code"
                class="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 shadow-sm"
              >
                <input
                  :checked="isChecked(activeRole, p.code)"
                  @change="(e) => setChecked(activeRole, p.code, e)"
                  :disabled="saving"
                  class="mt-1 h-5 w-5 rounded border-slate-300 dark:border-slate-700 bg-transparent text-primary focus:ring-primary disabled:opacity-50"
                  type="checkbox"
                />
                <div>
                  <p class="text-sm font-medium">{{ $t(p.titleKey) }}</p>
                  <p class="text-xs text-slate-500">{{ $t(p.descKey) }}</p>
                  <p class="text-[10px] mt-2 font-mono text-slate-400">{{ p.code }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
