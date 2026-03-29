<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { message } from 'ant-design-vue';
import { requestClient } from '../../api/request';
import { $t } from '../../locales';

type SettingsTab = 'general' | 'streaming' | 'seo' | 'ui';
type LayoutStyle = 'side' | 'top';

type SettingsPayload = {
  siteName: string;
  timezone: string;
  description: string;
  darkMode: boolean;
  themeColor: string;
  layout: LayoutStyle;
  fontFamily: string;
  metaTitle: string;
  gaId: string;
  keywords: string[];
  logoUrl: string;
  faviconUrl: string;
  cdnBaseUrl: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
};

const timezoneOptions = [
  'UTC -12:00',
  'UTC -11:00',
  'UTC -10:00',
  'UTC -09:00',
  'UTC -08:00',
  'UTC -07:00',
  'UTC -06:00',
  'UTC -05:00',
  'UTC -04:00',
  'UTC -03:00',
  'UTC -02:00',
  'UTC -01:00',
  'UTC +00:00 (Greenwich Mean Time)',
  'UTC +01:00',
  'UTC +02:00',
  'UTC +03:00',
  'UTC +04:00',
  'UTC +05:00',
  'UTC +06:00',
  'UTC +07:00 (Asia/Ho_Chi_Minh)',
  'UTC +08:00',
  'UTC +09:00',
  'UTC +10:00',
  'UTC +11:00',
  'UTC +12:00',
  'UTC +13:00',
  'UTC +14:00',
];

const fontOptions = [
  { label: 'Spline Sans (Default)', value: '"Spline Sans", sans-serif' },
  { label: 'Inter', value: '"Inter", sans-serif' },
  { label: 'Roboto', value: '"Roboto", sans-serif' },
  { label: 'Outfit', value: '"Outfit", sans-serif' },
  { label: 'Nunito', value: '"Nunito", sans-serif' },
  { label: 'Playfair Display', value: '"Playfair Display", serif' }
];

const activeTab = ref<SettingsTab>('general');
const loading = ref(false);
const saving = ref(false);
const uploading = ref(false);

const initialSettings = ref<SettingsPayload | null>(null);

const formData = ref<SettingsPayload & { newKeyword: string }>({
  siteName: 'CinemaStream Premium',
  timezone: 'UTC +07:00 (Asia/Ho_Chi_Minh)',
  description: 'Watch thousands of HD movies and TV shows from around the world on CinemaStream.',
  darkMode: true,
  themeColor: '#1F90F9',
  layout: 'side',
  fontFamily: '"Spline Sans", sans-serif',
  metaTitle: '',
  gaId: '',
  keywords: ['Movies', 'Streaming', 'Cinema'],
  newKeyword: '',
  logoUrl: '',
  faviconUrl: '',
  cdnBaseUrl: '',
  facebookUrl: '',
  twitterUrl: '',
  instagramUrl: '',
  youtubeUrl: ''
});

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sanitizePayload(input: typeof formData.value): SettingsPayload {
  const keywords = Array.isArray(input.keywords) ? input.keywords : [];
  const normalizedKeywords = keywords
    .map((k) => (typeof k === 'string' ? k.trim() : ''))
    .filter(Boolean)
    .slice(0, 50);

  return {
    siteName: String(input.siteName || '').trim(),
    timezone: String(input.timezone || '').trim(),
    description: String(input.description || '').trim(),
    darkMode: input.darkMode,
    themeColor: String(input.themeColor || '').trim(),
    layout: input.layout,
    fontFamily: String(input.fontFamily || '').trim(),
    metaTitle: String(input.metaTitle || '').trim(),
    gaId: String(input.gaId || '').trim(),
    keywords: normalizedKeywords,
    logoUrl: String(input.logoUrl || '').trim(),
    faviconUrl: String(input.faviconUrl || '').trim(),
    cdnBaseUrl: String(input.cdnBaseUrl || '').trim(),
    facebookUrl: String(input.facebookUrl || '').trim(),
    twitterUrl: String(input.twitterUrl || '').trim(),
    instagramUrl: String(input.instagramUrl || '').trim(),
    youtubeUrl: String(input.youtubeUrl || '').trim(),
  };
}

const isDirty = computed(() => {
  if (!initialSettings.value) return false;
  const current = sanitizePayload(formData.value);
  return JSON.stringify(current) !== JSON.stringify(initialSettings.value);
});

async function fetchSettings() {
  loading.value = true;
  try {
    const data = (await requestClient.get('/settings')) as Partial<SettingsPayload>;

    const merged = {
      ...sanitizePayload(formData.value),
      ...data,
      keywords: Array.isArray((data as any)?.keywords) ? (data as any).keywords : formData.value.keywords,
    } satisfies SettingsPayload;

    const sanitized = sanitizePayload({ ...merged, newKeyword: '' });
    formData.value = { ...sanitized, newKeyword: '' };
    initialSettings.value = cloneJson(sanitized);
  } catch (err) {
    console.error('Failed to fetch settings:', err);
    message.error($t('views.settings.messages.loadFailed'));
  } finally {
    loading.value = false;
  }
}

function resetChanges() {
  if (!initialSettings.value) return;
  formData.value = { ...cloneJson(initialSettings.value), newKeyword: '' };
  message.info($t('views.settings.messages.discarded'));
}

async function saveChanges() {
  if (saving.value) return;
  saving.value = true;
  try {
    const payload = sanitizePayload(formData.value);
    const saved = (await requestClient.put('/settings', payload)) as SettingsPayload;

    // Persist the server-normalized values (e.g. keywords trimmed/deduped).
    const merged = {
      ...payload,
      ...saved,
      keywords: Array.isArray((saved as any)?.keywords) ? (saved as any).keywords : payload.keywords,
    } satisfies SettingsPayload;
    const normalized = sanitizePayload({ ...merged, newKeyword: '' });

    initialSettings.value = cloneJson(normalized);
    formData.value = { ...cloneJson(normalized), newKeyword: '' };
    message.success($t('views.settings.messages.saved'));
  } catch (err) {
    console.error('Failed to save settings:', err);
    message.error($t('views.settings.messages.saveFailed'));
  } finally {
    saving.value = false;
  }
}

function removeKeyword(index: number) {
  if (index < 0 || index >= formData.value.keywords.length) return;
  formData.value.keywords.splice(index, 1);
}

function addKeyword() {
  const raw = formData.value.newKeyword.trim();
  if (!raw) return;

  // Allow comma-separated input as well.
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  const existing = new Set(formData.value.keywords.map((k) => k.toLowerCase()));

  let added = 0;
  for (const part of parts) {
    if (formData.value.keywords.length >= 50) break;
    const key = part.toLowerCase();
    if (existing.has(key)) continue;
    existing.add(key);
    formData.value.keywords.push(part);
    added += 1;
  }

  if (added > 0) {
    formData.value.newKeyword = '';
  }

  if (formData.value.keywords.length >= 50) {
    message.warning($t('views.settings.messages.maxKeywords'));
  }
}

async function uploadToServer(file: File) {
  const form = new FormData();
  form.append('file', file);
  
  const data = await requestClient.post(
    '/upload',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 15 * 60 * 1000,
    }
  );
  const url = (data as any)?.url || (data as any)?.path;
  if (!url || typeof url !== 'string') {
    throw new Error('Upload failed: missing url');
  }
  return url;
}

function validateImageFile(file: File, maxBytes: number) {
  if (!file.type.startsWith('image/')) {
    message.warning($t('views.settings.messages.imageOnly'));
    return false;
  }
  if (file.size > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(0);
    message.warning($t('views.settings.messages.fileTooLarge', { mb }));
    return false;
  }
  return true;
}

async function handleAssetUpload(event: Event, field: 'logoUrl' | 'faviconUrl') {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const maxBytes = field === 'logoUrl' ? 2 * 1024 * 1024 : 1 * 1024 * 1024;
  if (!validateImageFile(file, maxBytes)) {
    target.value = '';
    return;
  }

  uploading.value = true;
  try {
    const url = await uploadToServer(file);
    formData.value[field] = url;
    message.success($t('views.settings.messages.uploaded'));
  } catch (err) {
    console.error('Upload failed:', err);
    message.error($t('views.settings.messages.uploadFailed'));
  } finally {
    uploading.value = false;
  }

  // Allow selecting the same file again.
  target.value = '';
}

function triggerUpload(inputId: string) {
  const el = document.getElementById(inputId) as HTMLInputElement | null;
  if (el) el.click();
}

async function copyGaId() {
  const value = String(formData.value.gaId || '').trim();
  if (!value) {
    message.info($t('views.settings.messages.noGaId'));
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    message.success($t('views.settings.messages.copiedGaId'));
  } catch (err) {
    console.error('Failed to copy:', err);
    message.error($t('views.settings.messages.copyFailed'));
  }
}

onMounted(() => {
  fetchSettings();
});
</script>

<template>
  <div class="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark/50">
    <div class="max-w-5xl mx-auto p-6 lg:p-10">
      <!-- Breadcrumbs -->
      <div class="flex items-center gap-2 mb-6 text-sm">
        <a href="#" class="text-slate-500 hover:text-primary transition-colors">{{ $t('views.settings.breadcrumbs.dashboard') }}</a>
        <span class="text-slate-400">/</span>
        <span class="text-slate-500">{{ $t('views.settings.breadcrumbs.system') }}</span>
        <span class="text-slate-400">/</span>
        <span class="text-slate-900 dark:text-white font-semibold">{{ $t('views.settings.breadcrumbs.settings') }}</span>
      </div>

      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{{ $t('views.settings.title') }}</h1>
          <p class="text-slate-500 dark:text-slate-400 mt-2">{{ $t('views.settings.subtitle') }}</p>
        </div>
        <div class="flex gap-3">
          <button @click="resetChanges" :disabled="loading || saving || uploading || !isDirty" class="px-5 py-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {{ $t('views.settings.actions.reset') }}
          </button>
          <button @click="saveChanges" :disabled="loading || saving || uploading || !isDirty" class="px-5 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <span class="material-symbols-outlined text-[18px]">save</span>
            {{ $t('views.settings.actions.save') }}
          </button>
        </div>
      </div>

      <!-- Settings Tabs / Sections -->
      <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div class="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50/50 dark:bg-slate-800/30">
          <button @click="activeTab = 'general'" :class="['px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-all', activeTab === 'general' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-primary']">
            {{ $t('views.settings.tabs.general') }}
          </button>
          <button @click="activeTab = 'streaming'" :class="['px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-all', activeTab === 'streaming' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-primary']">
            {{ $t('views.settings.tabs.streaming') }}
          </button>
          <button @click="activeTab = 'seo'" :class="['px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-all', activeTab === 'seo' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-primary']">
            {{ $t('views.settings.tabs.seo') }}
          </button>
          <button @click="activeTab = 'ui'" :class="['px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-all', activeTab === 'ui' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-primary']">
            {{ $t('views.settings.tabs.ui') }}
          </button>
        </div>

        <div class="p-8 space-y-10">
          <div v-show="activeTab === 'general'">
            <section>
              <div class="flex items-center gap-3 mb-6">
                <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span class="material-symbols-outlined text-primary text-[20px]">info</span>
                </div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('views.settings.general.title') }}</h3>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-2">
                  <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.settings.general.siteName') }}</label>
                  <input v-model="formData.siteName" type="text" class="w-full rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-primary focus:border-primary text-slate-900 dark:text-white px-4 py-3" />
                  <p class="text-xs text-slate-500">{{ $t('views.settings.general.siteNameHint') }}</p>
                </div>
                
                 <div class="space-y-2">
                   <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.settings.general.timezone') }}</label>
                   <select v-model="formData.timezone" class="w-full rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-primary focus:border-primary text-slate-900 dark:text-white px-4 py-3">
                     <option v-for="tz in timezoneOptions" :key="tz" :value="tz">{{ tz }}</option>
                   </select>
                 </div>
                
                <div class="space-y-2 md:col-span-2">
                  <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.settings.general.description') }}</label>
                  <textarea v-model="formData.description" class="w-full rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-primary focus:border-primary text-slate-900 dark:text-white px-4 py-3" rows="3"></textarea>
                </div>
                
                <!-- Asset Uploads -->
                <div class="space-y-4">
                  <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.settings.general.logo') }}</label>
                  <div class="flex items-center gap-4">
                    <div class="size-20 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                      <img v-if="formData.logoUrl" :src="formData.logoUrl" class="w-full h-full object-cover rounded-xl" />
                      <span v-else class="material-symbols-outlined text-slate-400">image</span>
                    </div>
                    <div class="flex flex-col gap-2">
                      <input id="settings_logo_upload" type="file" accept="image/*" class="hidden" @change="(e) => handleAssetUpload(e, 'logoUrl')" />
                      <button @click="triggerUpload('settings_logo_upload')" :disabled="uploading || saving || loading" class="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-xs font-bold rounded-lg hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {{ uploading ? $t('views.settings.labels.uploading') : $t('views.settings.general.uploadLogo') }}
                      </button>
                      <p class="text-[10px] text-slate-500">{{ $t('views.settings.general.logoHint') }}</p>
                    </div>
                  </div>
                </div>
                
                <div class="space-y-4">
                  <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.settings.general.favicon') }}</label>
                  <div class="flex items-center gap-4">
                    <div class="size-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                      <img v-if="formData.faviconUrl" :src="formData.faviconUrl" class="w-full h-full object-cover rounded-lg" />
                      <span v-else class="material-symbols-outlined text-slate-400 text-[18px]">ads_click</span>
                    </div>
                    <div class="flex flex-col gap-2">
                      <input id="settings_favicon_upload" type="file" accept="image/*" class="hidden" @change="(e) => handleAssetUpload(e, 'faviconUrl')" />
                      <button @click="triggerUpload('settings_favicon_upload')" :disabled="uploading || saving || loading" class="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-xs font-bold rounded-lg hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {{ uploading ? $t('views.settings.labels.uploading') : $t('views.settings.general.changeFavicon') }}
                      </button>
                      <p class="text-[10px] text-slate-500">{{ $t('views.settings.general.faviconHint') }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Section: UI -->
          <div v-show="activeTab === 'ui'">
            <section>
              <div class="flex items-center gap-3 mb-6">
                <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span class="material-symbols-outlined text-primary text-[20px]">palette</span>
                </div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('views.settings.ui.title') }}</h3>
              </div>
              
              <div class="space-y-8">
                <!-- Interface & Typography -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  <div class="col-span-1 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-slate-50 dark:bg-slate-800/20">
                    <h4 class="text-base font-bold text-slate-900 dark:text-white mb-2">Interface Core</h4>
                    <p class="text-xs text-slate-500 mb-6">Customize the core visual appearance and colors.</p>
                    
                    <div class="space-y-6">
                      <div class="flex items-center justify-between">
                        <div>
                          <p class="text-sm font-bold text-slate-900 dark:text-white">{{ $t('views.settings.ui.darkMode') }}</p>
                          <p class="text-xs text-slate-500 mt-1">{{ $t('views.settings.ui.darkModeHint') }}</p>
                        </div>
                        <div 
                          @click="formData.darkMode = !formData.darkMode"
                          :class="['relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none', !formData.darkMode ? 'bg-slate-300 dark:bg-slate-600' : '']"
                          :style="formData.darkMode ? { backgroundColor: formData.themeColor } : {}"
                        >
                          <span :class="['pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out', formData.darkMode ? 'translate-x-5' : 'translate-x-0']"></span>
                        </div>
                      </div>

                      <div class="flex items-center justify-between">
                        <div>
                          <p class="text-sm font-bold text-slate-900 dark:text-white">{{ $t('views.settings.ui.primaryColor') }}</p>
                          <p class="text-xs text-slate-500 mt-1">{{ $t('views.settings.ui.primaryColorHint') }}</p>
                        </div>
                        <div class="flex items-center gap-2">
                           <span class="text-xs font-mono text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">{{ formData.themeColor }}</span>
                           <input type="color" v-model="formData.themeColor" class="size-8 rounded-lg border-2 border-white dark:border-slate-600 shadow-sm cursor-pointer p-0 overflow-hidden" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="col-span-1 lg:col-span-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-sm">
                     <h4 class="text-base font-bold text-slate-900 dark:text-white mb-2">Typography & Layout</h4>
                     <p class="text-xs text-slate-500 mb-6">Tailor the fonts and navigation structure context.</p>

                     <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="space-y-3">
                           <label class="text-sm font-bold text-slate-900 dark:text-white">Font Family</label>
                           <div class="grid grid-cols-1 gap-3">
                              <label v-for="font in fontOptions" :key="font.value" class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors" :class="formData.fontFamily === font.value ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'">
                                 <input type="radio" :value="font.value" v-model="formData.fontFamily" class="hidden" />
                                 <div class="size-4 rounded-full border-2 flex items-center justify-center shrink-0" :style="{ borderColor: formData.fontFamily === font.value ? formData.themeColor : '#cbd5e1' }">
                                   <div v-if="formData.fontFamily === font.value" class="size-2 rounded-full" :style="{ backgroundColor: formData.themeColor }"></div>
                                 </div>
                                 <div class="text-sm font-medium text-slate-700 dark:text-slate-300" :style="{ fontFamily: font.value }">{{ font.label }}</div>
                              </label>
                           </div>
                        </div>

                        <div class="space-y-3">
                           <label class="text-sm font-bold text-slate-900 dark:text-white">{{ $t('views.settings.ui.layout') }}</label>
                           <div class="grid grid-cols-2 gap-4">
                              <button @click="formData.layout = 'side'" :class="['p-4 rounded-xl flex flex-col items-center gap-3 transition-all', formData.layout === 'side' ? 'border-2' : 'border-2 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700']" :style="formData.layout === 'side' ? { borderColor: formData.themeColor, backgroundColor: formData.themeColor + '10' } : {}">
                                <div class="w-full aspect-video rounded bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                                  <div class="absolute left-0 top-0 bottom-0 w-3" :style="{ backgroundColor: formData.layout === 'side' ? formData.themeColor : '#e2e8f0' }"></div>
                                </div>
                                <span :class="['text-xs font-bold', formData.layout === 'side' ? '' : 'text-slate-500']" :style="formData.layout === 'side' ? { color: formData.themeColor } : {}">{{ $t('views.settings.ui.sideNav') }}</span>
                              </button>
                              
                              <button @click="formData.layout = 'top'" :class="['p-4 rounded-xl flex flex-col items-center gap-3 transition-all', formData.layout === 'top' ? 'border-2' : 'border-2 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700']" :style="formData.layout === 'top' ? { borderColor: formData.themeColor, backgroundColor: formData.themeColor + '10' } : {}">
                                <div class="w-full aspect-video rounded bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                                  <div class="absolute top-0 left-0 right-0 h-3" :class="formData.layout === 'top' ? '' : 'bg-slate-400 dark:bg-slate-600'" :style="formData.layout === 'top' ? { backgroundColor: formData.themeColor } : {}"></div>
                                </div>
                                <span :class="['text-xs font-bold', formData.layout === 'top' ? '' : 'text-slate-500']" :style="formData.layout === 'top' ? { color: formData.themeColor } : {}">{{ $t('views.settings.ui.topNav') }}</span>
                              </button>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>

                <!-- Social Links -->
                <div class="p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                  <h4 class="text-base font-bold text-slate-900 dark:text-white mb-2">Social Media Links</h4>
                  <p class="text-xs text-slate-500 mb-6">URLs for footer icons. Leave blank to hide the specific icon.</p>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <!-- Facebook -->
                    <div class="flex items-center gap-3">
                      <div class="size-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex flex-none items-center justify-center">
                        <span class="material-symbols-outlined text-[20px]">facebook</span>
                      </div>
                      <input v-model="formData.facebookUrl" type="url" class="w-full bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-slate-900 dark:text-white px-3 py-2 text-sm" placeholder="https://facebook.com/..." />
                    </div>
                    
                    <!-- Twitter/X -->
                    <div class="flex items-center gap-3">
                      <div class="size-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex flex-none items-center justify-center">
                        <span class="material-symbols-outlined text-[20px]">alternate_email</span>
                      </div>
                      <input v-model="formData.twitterUrl" type="url" class="w-full bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-slate-900 dark:text-white px-3 py-2 text-sm" placeholder="https://twitter.com/..." />
                    </div>

                    <!-- Instagram -->
                    <div class="flex items-center gap-3">
                      <div class="size-11 rounded-xl bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 flex flex-none items-center justify-center">
                        <span class="material-symbols-outlined text-[20px]">photo_camera</span>
                      </div>
                      <input v-model="formData.instagramUrl" type="url" class="w-full bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-slate-900 dark:text-white px-3 py-2 text-sm" placeholder="https://instagram.com/..." />
                    </div>

                    <!-- YouTube -->
                    <div class="flex items-center gap-3">
                      <div class="size-11 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex flex-none items-center justify-center">
                        <span class="material-symbols-outlined text-[20px]">play_circle</span>
                      </div>
                      <input v-model="formData.youtubeUrl" type="url" class="w-full bg-slate-50 dark:bg-slate-800 border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-slate-900 dark:text-white px-3 py-2 text-sm" placeholder="https://youtube.com/..." />
                    </div>
                  </div>
                </div>

              </div>
            </section>
          </div>
          
          <div v-show="activeTab === 'seo'">
            <section>
              <div class="flex items-center gap-3 mb-6">
                <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span class="material-symbols-outlined text-primary text-[20px]">public</span>
                </div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('views.settings.seo.title') }}</h3>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-2">
                  <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.settings.seo.metaTitle') }}</label>
                  <input v-model="formData.metaTitle" type="text" class="w-full rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-primary focus:border-primary text-slate-900 dark:text-white px-4 py-3" :placeholder="$t('views.settings.seo.metaTitlePlaceholder')" />
                </div>
                
                <div class="space-y-2">
                  <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.settings.seo.gaId') }}</label>
                  <div class="flex items-center gap-2">
                    <input v-model="formData.gaId" type="text" class="w-full rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-primary focus:border-primary text-slate-900 dark:text-white px-4 py-3 font-mono text-sm" placeholder="G-XXXXXXXXXX" />
                    <button @click="copyGaId" type="button" class="p-3 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors" :title="$t('views.settings.seo.copyGaId')">
                      <span class="material-symbols-outlined text-[20px]">content_copy</span>
                    </button>
                  </div>
                </div>
                
                <div class="space-y-2 md:col-span-2">
                  <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.settings.seo.keywords') }}</label>
                  <div class="w-full rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 flex flex-wrap gap-2">
                    <span v-for="(kw, idx) in formData.keywords" :key="idx" class="px-2 py-1 bg-primary/20 text-primary text-[11px] font-bold rounded flex items-center gap-1">
                      {{ kw }} 
                      <span @click="removeKeyword(idx)" class="material-symbols-outlined text-[14px] cursor-pointer">close</span>
                    </span>
                    <input v-model="formData.newKeyword" @keyup.enter="addKeyword" type="text" class="bg-transparent border-none focus:ring-0 p-0 text-xs flex-1 min-w-[100px]" :placeholder="$t('views.settings.seo.keywordPlaceholder')" />
                  </div>
                </div>
              </div>
            </section>
          </div>
          
           <!-- Section: Streaming (Placeholder for brevity) -->
          <div v-show="activeTab === 'streaming'">
            <section>
              <div class="flex items-center gap-3 mb-6">
                <div class="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span class="material-symbols-outlined text-primary text-[20px]">cloud</span>
                </div>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">{{ $t('views.settings.streaming.title') }}</h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-2 md:col-span-2">
                  <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.settings.streaming.cdnBaseUrl') }}</label>
                  <input v-model="formData.cdnBaseUrl" type="text" class="w-full rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-primary focus:border-primary text-slate-900 dark:text-white px-4 py-3 font-mono text-sm" placeholder="https://cdn.example.com" />
                  <p class="text-xs text-slate-500">{{ $t('views.settings.streaming.cdnHint') }}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
        
        <!-- Footer Action Bar -->
        <div class="bg-slate-50 dark:bg-slate-800/30 px-8 py-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div v-if="isDirty" class="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500 font-medium">
            <span class="material-symbols-outlined text-[18px]">warning</span>
            <span>{{ $t('views.settings.status.unsaved') }}</span>
          </div>
          <div class="flex gap-4">
            <button @click="resetChanges" :disabled="loading || saving || uploading || !isDirty" class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">{{ $t('views.settings.actions.discard') }}</button>
            <button @click="saveChanges" :disabled="loading || saving || uploading || !isDirty" class="px-8 py-2.5 bg-primary text-white font-bold rounded-lg hover:opacity-90 shadow-lg shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">{{ $t('views.settings.actions.saveAll') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
