<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { message } from 'ant-design-vue';

import { requestClient } from '../../api/request';
import { $t } from '../../locales';

type HomeHeroSettings = {
  homeHeroMovieIds: string[];
  homeHeroLimit: number;
  homeHeroAutofill: boolean;
  homeHeroAutoPlay: boolean;
  homeHeroInterval: number;
};

type MovieSummary = {
  id: string;
  _id?: string;
  title: string;
  slug?: string;
  posterUrl?: string;
  backdropUrl?: string;
  releaseYear?: number;
  imdbRating?: number;
  views?: number;
  status?: string;
};

const loading = ref(false);
const saving = ref(false);

const form = ref<HomeHeroSettings>({
  homeHeroMovieIds: [],
  homeHeroLimit: 6,
  homeHeroAutofill: true,
  homeHeroAutoPlay: true,
  homeHeroInterval: 6.5,
});

const selectedMovies = ref<MovieSummary[]>([]);

const keyword = ref('');
const searching = ref(false);
const searchResults = ref<MovieSummary[]>([]);

const selectedSet = computed(() => new Set(form.value.homeHeroMovieIds));

function normalizeIds(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => String(v || '').trim())
    .filter(Boolean);
}

function getMovieId(input: unknown) {
  const movie = input as any;
  return String(movie?.id ?? movie?._id ?? '').trim();
}

async function fetchSettings() {
  loading.value = true;
  try {
    const data = (await requestClient.get('/settings')) as Partial<HomeHeroSettings>;
    form.value = {
      homeHeroMovieIds: normalizeIds((data as any)?.homeHeroMovieIds),
      homeHeroLimit: typeof (data as any)?.homeHeroLimit === 'number' ? (data as any).homeHeroLimit : 6,
      homeHeroAutofill: typeof (data as any)?.homeHeroAutofill === 'boolean' ? (data as any).homeHeroAutofill : true,
      homeHeroAutoPlay: typeof (data as any)?.homeHeroAutoPlay === 'boolean' ? (data as any).homeHeroAutoPlay : true,
      homeHeroInterval: typeof (data as any)?.homeHeroInterval === 'number' ? (data as any).homeHeroInterval : 6.5,
    };
  } catch (err) {
    console.error('Failed to fetch settings:', err);
    message.error($t('views.homeHero.messages.loadFailed'));
  } finally {
    loading.value = false;
  }
}

async function fetchSelectedMovies() {
  const ids = form.value.homeHeroMovieIds;
  if (!ids.length) {
    selectedMovies.value = [];
    return;
  }

  try {
    const movies = (await requestClient.get('/movies', {
      params: {
        ids: ids.join(','),
        includeHidden: true,
        includeDeleted: true,
        limit: Math.max(ids.length, 1),
        page: 1,
      },
    })) as MovieSummary[];

    const normalized = (Array.isArray(movies) ? movies : [])
      .map((m: any) => ({ ...m, id: getMovieId(m) }))
      .filter((m: any) => m?.id);

    const byId = new Map(normalized.map((m) => [String(m.id), m]));
    selectedMovies.value = ids.map((id) => {
      const movie = byId.get(id);
      if (movie) return movie;
      return { id, title: $t('views.homeHero.messages.notFound'), status: 'missing' } satisfies MovieSummary;
    });
  } catch (err) {
    console.error('Failed to fetch selected movies:', err);
    selectedMovies.value = [];
    message.error($t('views.homeHero.messages.loadSelectedFailed'));
  }
}

function moveSelected(id: string, offset: number) {
  const idx = form.value.homeHeroMovieIds.indexOf(id);
  if (idx < 0) return;

  const next = idx + offset;
  if (next < 0 || next >= form.value.homeHeroMovieIds.length) return;

  const copy = [...form.value.homeHeroMovieIds];
  const item = copy.splice(idx, 1)[0];
  if (!item) return;
  copy.splice(next, 0, item);
  form.value.homeHeroMovieIds = copy;
}

function removeSelected(id: string) {
  form.value.homeHeroMovieIds = form.value.homeHeroMovieIds.filter((x) => x !== id);
}

function addSelected(movie: MovieSummary) {
  const id = String(movie?.id || '');
  if (!id) return;
  if (selectedSet.value.has(id)) return;

  if (form.value.homeHeroMovieIds.length >= 30) {
    message.warning($t('views.homeHero.messages.maxMovies'));
    return;
  }
  form.value.homeHeroMovieIds = [...form.value.homeHeroMovieIds, id];
}

async function searchMovies() {
  const q = keyword.value.trim();
  if (!q) {
    searchResults.value = [];
    return;
  }

  searching.value = true;
  try {
    const movies = (await requestClient.get('/movies', {
      params: {
        search: q,
        sort: '-views',
        includeHidden: true,
        includeDeleted: false,
        limit: 12,
        page: 1,
      },
    })) as MovieSummary[];

    const list = (Array.isArray(movies) ? movies : [])
      .map((m: any) => ({ ...m, id: getMovieId(m) }))
      .filter((m: any) => m?.id);
    searchResults.value = list.filter((m) => m?.id && !selectedSet.value.has(String(m.id)));
  } catch (err) {
    console.error('Search failed:', err);
    searchResults.value = [];
    message.error($t('views.homeHero.messages.searchFailed'));
  } finally {
    searching.value = false;
  }
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  try {
    await requestClient.put('/settings', {
      homeHeroMovieIds: form.value.homeHeroMovieIds,
      homeHeroLimit: Number(form.value.homeHeroLimit) || 6,
      homeHeroAutofill: Boolean(form.value.homeHeroAutofill),
      homeHeroAutoPlay: Boolean(form.value.homeHeroAutoPlay),
      homeHeroInterval: Number(form.value.homeHeroInterval) || 6.5,
    } satisfies HomeHeroSettings);

    message.success($t('views.homeHero.messages.saved'));
    await fetchSettings();
  } catch (err) {
    console.error('Save failed:', err);
    message.error($t('views.homeHero.messages.saveFailed'));
  } finally {
    saving.value = false;
  }
}

watch(
  () => form.value.homeHeroMovieIds.join(','),
  () => {
    fetchSelectedMovies();
  },
);

onMounted(async () => {
  await fetchSettings();
  await fetchSelectedMovies();
});
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-white">{{ $t('views.homeHero.title') }}</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ $t('views.homeHero.subtitle') }}</p>
      </div>
      <button
        @click="save"
        :disabled="loading || saving"
        class="px-5 py-2 bg-primary text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ saving ? $t('views.homeHero.actions.saving') : $t('views.homeHero.actions.save') }}
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-slate-900 dark:text-white">{{ $t('views.homeHero.sections.selected') }}</h2>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            {{ form.homeHeroMovieIds.length }} / 30
          </div>
        </div>

        <div v-if="!form.homeHeroMovieIds.length" class="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
          {{ $t('views.homeHero.messages.emptySelected') }}
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(movie, idx) in selectedMovies"
            :key="movie.id"
            class="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40"
          >
            <div class="size-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
              <img v-if="movie.posterUrl || movie.backdropUrl" :src="movie.posterUrl || movie.backdropUrl" :alt="movie.title" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ movie.title }}</span>
                <span v-if="movie.status" class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                  {{ movie.status }}
                </span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400">
                {{ movie.releaseYear || '-' }} • {{ $t('views.homeHero.meta.views') }} {{ movie.views ?? 0 }} • {{ $t('views.homeHero.meta.imdb') }} {{ movie.imdbRating?.toFixed?.(1) ?? $t('views.homeHero.meta.na') }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="moveSelected(movie.id, -1)"
                :disabled="idx === 0"
                class="size-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary disabled:opacity-40"
                :aria-label="$t('views.homeHero.aria.moveUp')"
              >
                <span class="material-symbols-outlined text-[18px]">arrow_upward</span>
              </button>
              <button
                @click="moveSelected(movie.id, 1)"
                :disabled="idx === selectedMovies.length - 1"
                class="size-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary disabled:opacity-40"
                :aria-label="$t('views.homeHero.aria.moveDown')"
              >
                <span class="material-symbols-outlined text-[18px]">arrow_downward</span>
              </button>
              <button
                @click="removeSelected(movie.id)"
                class="size-9 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/30"
                :aria-label="$t('views.homeHero.aria.remove')"
              >
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-5">
        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.homeHero.fields.limitLabel') }}</label>
          <input
            v-model.number="form.homeHeroLimit"
            type="number"
            min="1"
            max="12"
            class="w-full rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ $t('views.homeHero.fields.limitHint') }}</p>
        </div>

        <label class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.homeHero.fields.autofillLabel') || 'Autofill with trending' }}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">{{ $t('views.homeHero.fields.autofillHint') || 'Automatically add trending movies if limit not met' }}</div>
          </div>
          <input v-model="form.homeHeroAutofill" type="checkbox" class="size-5 accent-primary" />
        </label>

        <label class="flex items-center justify-between gap-3">
          <div>
            <div class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.homeHero.fields.autoPlayLabel') || 'Auto-play Slider' }}</div>
            <div class="text-xs text-slate-500 dark:text-slate-400">{{ $t('views.homeHero.fields.autoPlayHint') || 'Automatically cycle the big header images' }}</div>
          </div>
          <input v-model="form.homeHeroAutoPlay" type="checkbox" class="size-5 accent-primary" />
        </label>

        <div class="space-y-2">
          <label class="text-sm font-semibold text-slate-700 dark:text-slate-300">{{ $t('views.homeHero.fields.intervalLabel') || 'Auto-play interval speed (seconds)' }}</label>
          <input
            v-model.number="form.homeHeroInterval"
            type="number"
            min="1"
            max="30"
            step="0.5"
            class="w-full rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary focus:ring-primary outline-none"
          />
        </div>

        <div class="pt-4 border-t border-slate-200 dark:border-slate-800">
          <h2 class="font-bold text-slate-900 dark:text-white mb-3">{{ $t('views.homeHero.sections.addMovies') }}</h2>
          <div class="flex gap-2">
            <input
              v-model="keyword"
              @keyup.enter="searchMovies"
              type="text"
              :placeholder="$t('views.homeHero.fields.searchPlaceholder')"
              class="flex-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <button
              @click="searchMovies"
              :disabled="searching"
              class="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
            >
              {{ searching ? '...' : $t('views.homeHero.actions.search') }}
            </button>
          </div>

          <div class="mt-4 space-y-2 max-h-[440px] overflow-auto pr-1">
            <div v-if="!searchResults.length" class="text-xs text-slate-500 dark:text-slate-400 py-4">
              {{ $t('views.homeHero.messages.emptySearch') }}
            </div>
            <button
              v-for="movie in searchResults"
              :key="movie.id"
              @click="addSelected(movie)"
              class="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div class="size-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
                  <img v-if="movie.posterUrl || movie.backdropUrl" :src="movie.posterUrl || movie.backdropUrl" :alt="movie.title" class="w-full h-full object-cover" />
                </div>
                <div class="min-w-0">
                  <div class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ movie.title }}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">
                    {{ movie.releaseYear || '-' }} • {{ $t('views.homeHero.meta.views') }} {{ movie.views ?? 0 }}
                  </div>
                </div>
                <div class="ml-auto text-primary font-bold text-xs">{{ $t('views.homeHero.actions.add') }}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
