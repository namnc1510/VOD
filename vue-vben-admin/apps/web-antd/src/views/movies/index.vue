<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { Select as ASelect } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { useRoute, useRouter } from 'vue-router';

import { requestClient } from '../../api/request';
import { $t } from '../../locales';

type TaxonomyOption = {
  id: string;
  name: string;
  slug?: string;
};

type MoviesListBody = {
  success?: boolean;
  data?: any[];
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

const movies = ref([] as any[]);
const route = useRoute();
const router = useRouter();
const listLoading = ref(true);
const saving = ref(false);
const uploading = ref(false);
const page = ref(1);
const limit = ref(10);
const total = ref(0);
const serverTotalPages = ref<number | null>(null);

const searchQuery = ref('');
const selectedCountryId = ref('');
const selectedGenreId = ref('');
const selectedQuality = ref('');
const selectedType = ref('');
const selectedStatus = ref('');
const tagsQuery = ref('');
const releaseYearFilter = ref('');
const minImdbFilter = ref('');
const maxImdbFilter = ref('');
const minRatingFilter = ref('');
const maxRatingFilter = ref('');
const featuredFilter = ref(''); // '' | 'true' | 'false'
const trendingFilter = ref(''); // '' | 'true' | 'false'
const newReleaseFilter = ref(''); // '' | 'true' | 'false'
const includeHidden = ref(true);
const includeDeleted = ref(false);
const sort = ref('-createdAt');

const categoryOptions = ref<TaxonomyOption[]>([]);
const countryOptions = ref<TaxonomyOption[]>([]);
const personOptions = ref<{ id: string; name: string; knownFor: string; avatarUrl: string }[]>([]);
const qualities = ref([] as string[]);
const types = ref([] as string[]);
// Form State
const showModal = ref(false);
const editingMovie = ref<any>(null);
const lastDeleted = ref<null | { id: string; title: string }>(null);
let lastDeletedTimer: null | ReturnType<typeof setTimeout> = null;
const importing = ref(false);
const expandedMovieId = ref<string | null>(null);
const formData = ref({
  title: '',
  slug: '',
  releaseYear: new Date().getFullYear(),
  quality: 'HD',
  type: 'movie',
  status: 'released',
  accessMode: 'free',
  genres: [] as string[],
  countries: [] as string[],
  overview: '',
  posterUrl: '',
  backdropUrl: '',
  trailerUrl: '',
  streamUrl: '',
  directors: [] as string[],
  actors: [] as string[],
  gallery: [] as string[]
});

function getMovieId(movie: any) {
  return String(movie?.id ?? movie?._id ?? '').trim();
}

function joinList(input: any) {
  if (!Array.isArray(input)) return '';
  return input
    .map((v) => (typeof v === 'string' ? v : v?.name ?? v?.title ?? ''))
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(', ');
}

function formatDateTime(input: any) {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleString();
}

function toggleExpanded(movie: any) {
  const id = getMovieId(movie);
  if (!id) return;
  expandedMovieId.value = expandedMovieId.value === id ? null : id;
}

function mapTaxonomyOptions(input: any): TaxonomyOption[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      const id = String(item?._id ?? item?.id ?? '');
      const name = String(item?.name ?? item?.title ?? '');
      const slug = item?.slug ? String(item.slug) : undefined;
      return id && name ? { id, name, slug } : null;
    })
    .filter(Boolean) as TaxonomyOption[];
}

function isObjectIdLike(value: string) {
  return /^[a-f\d]{24}$/i.test(value);
}

function resolveIdsFromMovieField(
  input: unknown,
  options: TaxonomyOption[],
): string[] {
  const byName = new Map(options.map((o) => [o.name.toLowerCase(), o.id]));

  if (!Array.isArray(input)) return [];
  return input
    .map((v: any) => {
      if (typeof v === 'string') {
        if (isObjectIdLike(v)) return v;
        return byName.get(v.toLowerCase()) || '';
      }
      if (v && typeof v === 'object') {
        const id = v._id ?? v.id;
        if (typeof id === 'string' && isObjectIdLike(id)) return id;
        const name = v.name ?? v.title;
        if (typeof name === 'string') return byName.get(name.toLowerCase()) || '';
      }
      return '';
    })
    .filter((v: any): v is string => typeof v === 'string' && v.length > 0);
}

function openCreateModal() {
  editingMovie.value = null;
  formData.value = {
    title: '',
    slug: '',
    releaseYear: new Date().getFullYear(),
    quality: 'HD',
    type: 'movie',
    status: 'released',
    accessMode: 'free',
    genres: [],
    countries: [],
    overview: '',
    posterUrl: '',
    backdropUrl: '',
    trailerUrl: '',
    streamUrl: '',
    directors: [],
    actors: [],
    gallery: []
  };
  showModal.value = true;
}

function openEditModal(movie: any) {
  editingMovie.value = movie;
  formData.value = {
    title: movie.title || '',
    slug: movie.slug || '',
    releaseYear: movie.releaseYear || new Date().getFullYear(),
    quality: movie.quality || 'HD',
    type: movie.type || 'movie',
    status: movie.status || 'released',
    accessMode: movie.accessMode || 'free',
    genres: resolveIdsFromMovieField(movie.genres, categoryOptions.value),
    countries: resolveIdsFromMovieField(movie.countries, countryOptions.value),
    overview: movie.overview || '',
    posterUrl: movie.posterUrl || '',
    backdropUrl: movie.backdropUrl || '',
    trailerUrl: movie.trailerUrl || '',
    streamUrl: movie.streamUrl || '',
    directors: Array.isArray(movie.directors) ? movie.directors.map((p: any) => typeof p === 'object' ? p._id || p.id : p) : [],
    actors: Array.isArray(movie.actors) ? movie.actors.map((p: any) => typeof p === 'object' ? p._id || p.id : p) : [],
    gallery: Array.isArray(movie.gallery) ? movie.gallery : []
  };
  showModal.value = true;
}

async function saveMovie() {
  if (!formData.value.title) {
    message.warning($t('views.movies.messages.titleRequired'));
    return;
  }
  
  saving.value = true;
  try {
    // Backend Movie model uses refs for genres/countries, so we must send ObjectId strings.
    const payload = {
      ...formData.value,
      quality: String(formData.value.quality || 'HD').toUpperCase(),
      type: String(formData.value.type || 'movie').toLowerCase(),
      accessMode: String(formData.value.accessMode || 'free').toLowerCase(),
      releaseYear: Number(formData.value.releaseYear) || undefined,
      genres: Array.isArray(formData.value.genres) ? formData.value.genres : [],
      countries: Array.isArray(formData.value.countries) ? formData.value.countries : [],
      actors: Array.isArray(formData.value.actors) ? formData.value.actors : [],
      directors: Array.isArray(formData.value.directors) ? formData.value.directors : [],
    };

    if (editingMovie.value) {
      const id = editingMovie.value.id || editingMovie.value._id;
      await requestClient.put(`/movies/${id}`, payload);
      message.success($t('views.movies.messages.updated'));
    } else {
      await requestClient.post('/movies', payload);
      message.success($t('views.movies.messages.created'));
    }
    showModal.value = false;
    await fetchMovies();
  } catch (error) {
    console.error('Error saving movie:', error);
    message.error($t('views.movies.messages.saveFailed'));
  } finally {
    saving.value = false;
  }
}

async function deleteMovie(movieOrId: any) {
  const id =
    typeof movieOrId === 'string'
      ? movieOrId
      : String(movieOrId?.id || movieOrId?._id || '');
  const title =
    typeof movieOrId === 'object' && movieOrId
      ? String(movieOrId?.title || '')
      : '';

  if (!id) return;

  if (confirm($t('views.movies.messages.deleteConfirm'))) {
    saving.value = true;
    try {
      await requestClient.delete(`/movies/${id}`);

      lastDeleted.value = { id, title };
      if (lastDeletedTimer) clearTimeout(lastDeletedTimer);
      lastDeletedTimer = setTimeout(() => {
        lastDeleted.value = null;
        lastDeletedTimer = null;
      }, 10_000);

      message.success($t('views.movies.messages.deleted'));
      await fetchMovies();
    } catch (error) {
      console.error('Error deleting movie:', error);
      message.error($t('views.movies.messages.deleteFailed'));
    } finally {
      saving.value = false;
    }
  }
}

function openEpisodes(movie: any) {
  const id = String(movie?.id ?? movie?._id ?? '');
  if (!id) return;
  router.push({ name: 'MovieEpisodeList', query: { movieId: id } });
}

async function undoLastDelete() {
  if (!lastDeleted.value) return;

  saving.value = true;
  try {
    await requestClient.post(`/movies/${lastDeleted.value.id}/restore`);
    lastDeleted.value = null;
    if (lastDeletedTimer) clearTimeout(lastDeletedTimer);
    lastDeletedTimer = null;
    message.success($t('views.movies.messages.restored'));
    await fetchMovies();
  } catch (error) {
    console.error('Error restoring movie:', error);
    message.error($t('views.movies.messages.restoreFailed'));
  } finally {
    saving.value = false;
  }
}

function triggerImportExcel() {
  const input = document.getElementById('movies-import-excel') as HTMLInputElement | null;
  input?.click();
}

async function downloadTemplate() {
  try {
    const response = await requestClient.get('/movies/import/template', { responseType: 'blob', responseReturn: 'response' });
    const blob = new Blob([response.data || response]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Movie_Import_Template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download template failed:', error);
    message.error($t('views.movies.messages.downloadTemplateFailed'));
  }
}

async function handleImportExcel(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  importing.value = true;
  try {
    const form = new FormData();
    form.append('file', file);
    
    const result = await requestClient.post(
      '/movies/import',
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15 * 60 * 1000,
      }
    );

    const created = (result as any)?.created ?? 0;
    const failed = (result as any)?.failed ?? 0;
    message.success($t('views.movies.messages.importDone', { created, failed }));

    if (failed > 0) {
      // Keep it simple: log row-level errors for now.
      console.error('Import errors:', (result as any)?.errors || []);
      message.warning($t('views.movies.messages.importHasErrors'));
    }

    await fetchFilters();
    await fetchMovies({ resetPage: true });
  } catch (error) {
    console.error('Import failed:', error);
    message.error($t('views.movies.messages.importFailed'));
  } finally {
    importing.value = false;
    // Allow re-selecting the same file.
    target.value = '';
  }
}

async function fetchMovies(options?: { resetPage?: boolean }) {
  if (options?.resetPage) page.value = 1;

  listLoading.value = true;
  try {
    const body = (await requestClient.get('/movies', {
      params: {
        page: page.value,
        limit: limit.value,
        search: searchQuery.value,
        country: selectedCountryId.value || undefined,
        genre: selectedGenreId.value || undefined,
        quality: selectedQuality.value || undefined,
        type: selectedType.value || undefined,
        status: selectedStatus.value || undefined,
        tags: tagsQuery.value || undefined,
        releaseYear: releaseYearFilter.value || undefined,
        minImdb: minImdbFilter.value || undefined,
        maxImdb: maxImdbFilter.value || undefined,
        minRating: minRatingFilter.value || undefined,
        maxRating: maxRatingFilter.value || undefined,
        featured: featuredFilter.value || undefined,
        trending: trendingFilter.value || undefined,
        newRelease: newReleaseFilter.value || undefined,
        includeHidden: includeHidden.value,
        includeDeleted: includeDeleted.value,
        sort: sort.value || undefined,
      },
      responseReturn: 'body',
    })) as MoviesListBody;

    if (!body || body.success !== true) {
      movies.value = [];
      total.value = 0;
      serverTotalPages.value = null;
      return;
    }

    movies.value = Array.isArray(body.data) ? body.data : [];
    total.value = Number(body.meta?.total ?? movies.value.length) || 0;
    serverTotalPages.value =
      typeof body.meta?.totalPages === 'number' ? body.meta.totalPages : null;

    if (typeof body.meta?.page === 'number') page.value = body.meta.page;
    if (typeof body.meta?.limit === 'number') limit.value = body.meta.limit;
  } catch (error) {
    console.error('Error fetching movies:', error);
    message.error($t('views.movies.messages.loadFailed'));
  } finally {
    listLoading.value = false;
  }
}

onMounted(async () => {
  const initialSearch = String(route.query.search ?? '').trim();
  if (initialSearch) {
    searchQuery.value = initialSearch;
  }

  await Promise.all([fetchMovies({ resetPage: true }), fetchFilters()]);
});

watch(
  () => route.query.search,
  (value) => {
    const next = String(value ?? '').trim();
    if (next === searchQuery.value) return;
    searchQuery.value = next;
    fetchMovies({ resetPage: true });
  },
);

async function fetchFilters() {
  try {
    const [cats, cnts, quals, formats, personsRes] = await Promise.all([
      requestClient.get('/taxonomies/category'),
      requestClient.get('/taxonomies/country'),
      requestClient.get('/taxonomies/quality'),
      requestClient.get('/taxonomies/format'),
      requestClient.get('/persons?limit=1000'),
    ]);

    categoryOptions.value = mapTaxonomyOptions(cats);
    countryOptions.value = mapTaxonomyOptions(cnts);

    const qualityOptions = mapTaxonomyOptions(quals).map((o) => o.name);
    const formatOptions = mapTaxonomyOptions(formats).map((o) => o.name);
    qualities.value = qualityOptions.length > 0 ? qualityOptions : ['SD', 'HD', '4K'];
    types.value = formatOptions.length > 0 ? formatOptions : ['movie', 'series'];

    // @ts-ignore
    const personsList = personsRes?.data || personsRes || [];
    personOptions.value = personsList.map((p: any) => ({
      id: p._id || p.id,
      name: p.name,
      knownFor: p.knownFor,
      avatarUrl: p.avatarUrl
    }));
  } catch (error) {
    console.error('Error fetching filters:', error);
    message.error($t('views.movies.messages.filtersLoadFailed'));
  }
}

function applyFilters() {
  if (selectedStatus.value === 'hidden') {
    includeHidden.value = true;
  }
  fetchMovies({ resetPage: true });
}

function resetFilters() {
  searchQuery.value = '';
  selectedCountryId.value = '';
  selectedGenreId.value = '';
  selectedQuality.value = '';
  selectedType.value = '';
  selectedStatus.value = '';
  tagsQuery.value = '';
  releaseYearFilter.value = '';
  minImdbFilter.value = '';
  maxImdbFilter.value = '';
  minRatingFilter.value = '';
  maxRatingFilter.value = '';
  featuredFilter.value = '';
  trendingFilter.value = '';
  newReleaseFilter.value = '';
  includeHidden.value = true;
  includeDeleted.value = false;
  sort.value = '-createdAt';
  fetchMovies({ resetPage: true });
}


function previousPage() {
  if (page.value > 1) {
    page.value--;
    fetchMovies();
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value++;
    fetchMovies();
  }
}

const totalPages = computed(() => {
  if (typeof serverTotalPages.value === 'number') return serverTotalPages.value;
  return Math.max(Math.ceil(total.value / limit.value), 1);
});

function getStatusTextClass(status: string) {
  if (status === 'released' || status === 'published') return 'text-emerald-600';
  if (status === 'coming_soon') return 'text-amber-600';
  return 'text-slate-500';
}

function getStatusDotClass(status: string) {
  if (status === 'released' || status === 'published') return 'bg-emerald-500';
  if (status === 'coming_soon') return 'bg-amber-500';
  return 'bg-slate-500';
}

function movieStatusLabel(status?: string) {
  const s = String(status || '').trim();
  if (s === 'released' || s === 'published') return $t('views.movies.status.released');
  if (s === 'coming_soon') return $t('views.movies.status.comingSoon');
  if (s === 'hidden') return $t('views.movies.status.hidden');
  if (s === 'draft' || !s) return $t('views.movies.status.draft');
  return s;
}

async function uploadToServer(file: File) {
  // Backend should implement: POST /api/v1/upload (multipart field: file)
  // and return { success:true, data:{ url } } so requestClient unwraps to { url }.
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

async function handleImageUpload(event: Event, field: 'posterUrl' | 'backdropUrl') {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  uploading.value = true;
  try {
    const url = await uploadToServer(file);
    formData.value[field] = url;
  } catch (error) {
    console.error('Upload failed:', error);
    message.error($t('views.movies.messages.uploadImageFailed'));
  } finally {
    uploading.value = false;
  }

  // Allow selecting the same file again to retrigger change.
  target.value = '';
}

async function handleVideoUpload(event: Event, field: 'trailerUrl' | 'streamUrl') {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  uploading.value = true;
  try {
    const url = await uploadToServer(file);
    formData.value[field] = url;
  } catch (error) {
    console.error('Upload failed:', error);
    message.error($t('views.movies.messages.uploadVideoFailed'));
  } finally {
    uploading.value = false;
  }

  target.value = '';
}

function triggerUpload(refName: string) {
  const fileInput = document.getElementById(refName) as HTMLInputElement;
  if (fileInput) fileInput.click();
}

async function handleGalleryUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;
  
  if (formData.value.gallery.length + files.length > 10) {
    message.warning($t('views.movies.messages.galleryMax'));
    target.value = '';
    return;
  }

  uploading.value = true;
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;
      const url = await uploadToServer(file);
      formData.value.gallery.push(url);
    }
  } catch (error) {
    console.error('Upload failed:', error);
    message.error($t('views.movies.messages.uploadGalleryFailed'));
  } finally {
    uploading.value = false;
  }

  // Allow selecting the same files again to retrigger change.
  target.value = '';
}

function removeGalleryImage(index: number) {
  formData.value.gallery.splice(index, 1);
}
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50 dark:bg-background-dark/50">
    <!-- Title and Primary Actions -->
	    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
	      <div>
	        <h3 class="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{{ $t('views.movies.title') }}</h3>
	        <p class="text-slate-500 dark:text-slate-400 mt-1">{{ $t('views.movies.subtitle') }}</p>
	      </div>
	      <div class="flex gap-3">
        <button
          v-if="lastDeleted"
          type="button"
          @click="undoLastDelete"
	          :disabled="saving"
	          class="flex items-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
	          :title="$t('views.movies.actions.undoDeleteTitle')"
	        >
	          <span class="material-symbols-outlined text-base">undo</span>
	          {{ $t('views.movies.actions.undo') }}
	        </button>
        <button
          type="button"
          @click="downloadTemplate"
          class="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-semibold transition-colors"
          :title="$t('views.movies.actions.downloadTemplateTitle')"
        >
          <span class="material-symbols-outlined text-base">download</span>
          {{ $t('views.movies.actions.downloadTemplate') }}
        </button>
        <button
          type="button"
	          @click="triggerImportExcel"
	          :disabled="importing"
	          class="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
	          :title="$t('views.movies.actions.importExcelTitle')"
	        >
	          <span class="material-symbols-outlined text-base">upload_file</span>
	          {{ $t('views.movies.actions.importExcel') }}
	        </button>
        <input
          id="movies-import-excel"
          type="file"
          class="hidden"
          accept=".xlsx,.xls,.csv"
          @change="handleImportExcel"
	        />
	        <button @click="openCreateModal()" class="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary/20">
	          <span class="material-symbols-outlined text-base">add_box</span>
	          {{ $t('views.movies.actions.create') }}
	        </button>
	      </div>
	    </div>

    <!-- Undo delete -->
	    <div v-if="lastDeleted" class="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
	      <div class="text-sm text-amber-900 font-semibold truncate">
	        {{ $t('views.movies.undoBanner.text', { titlePart: lastDeleted.title ? $t('views.movies.undoBanner.titlePart', { title: lastDeleted.title }) : '' }) }}
	      </div>
      <button
        type="button"
        class="px-4 py-2 text-sm font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
        @click="undoLastDelete"
        :disabled="saving"
	      >
	        {{ $t('views.movies.undoBanner.button') }}
	      </button>
	    </div>

    <!-- Filters Toolbar -->
    <div class="p-5 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div class="col-span-1 md:col-span-2 relative">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
	        <input
	          v-model="searchQuery"
	          class="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm transition-all text-slate-900 dark:text-white"
	          :placeholder="$t('views.movies.filters.searchPlaceholder')"
	          type="text"
	          @keyup.enter="applyFilters"
	        />
        </div>

	        <select v-model="selectedCountryId" @change="applyFilters" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm appearance-none text-slate-900 dark:text-white">
	          <option value="">{{ $t('views.movies.filters.allCountries') }}</option>
	          <option v-for="c in countryOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
	        </select>

	        <select v-model="selectedGenreId" @change="applyFilters" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm appearance-none text-slate-900 dark:text-white">
	          <option value="">{{ $t('views.movies.filters.allCategories') }}</option>
	          <option v-for="cat in categoryOptions" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
	        </select>

	        <select v-model="selectedQuality" @change="applyFilters" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm appearance-none text-slate-900 dark:text-white">
	          <option value="">{{ $t('views.movies.filters.allQualities') }}</option>
	          <option v-for="q in qualities" :key="q" :value="q">{{ q }}</option>
	        </select>

	        <select v-model="selectedType" @change="applyFilters" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm appearance-none text-slate-900 dark:text-white">
	          <option value="">{{ $t('views.movies.filters.allTypes') }}</option>
	          <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
	        </select>
      </div>

	      <div class="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3">
	        <select v-model="selectedStatus" @change="applyFilters" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm appearance-none text-slate-900 dark:text-white">
	          <option value="">{{ $t('views.movies.filters.allStatus') }}</option>
	          <option value="released">{{ $t('views.movies.status.released') }}</option>
	          <option value="coming_soon">{{ $t('views.movies.status.comingSoon') }}</option>
	          <option value="hidden">{{ $t('views.movies.status.hidden') }}</option>
	        </select>

	        <select v-model="sort" @change="applyFilters" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm appearance-none text-slate-900 dark:text-white">
	          <option value="-createdAt">{{ $t('views.movies.sort.newest') }}</option>
	          <option value="createdAt">{{ $t('views.movies.sort.oldest') }}</option>
	          <option value="-views">{{ $t('views.movies.sort.viewsDesc') }}</option>
	          <option value="-imdbRating">{{ $t('views.movies.sort.imdbDesc') }}</option>
	          <option value="-rating">{{ $t('views.movies.sort.ratingDesc') }}</option>
	          <option value="-releaseYear">{{ $t('views.movies.sort.releaseYearDesc') }}</option>
	          <option value="title">{{ $t('views.movies.sort.titleAsc') }}</option>
	          <option value="-title">{{ $t('views.movies.sort.titleDesc') }}</option>
	          <option value="-trendingScore">{{ $t('views.movies.sort.trendingDesc') }}</option>
	        </select>

	        <input v-model="releaseYearFilter" @keyup.enter="applyFilters" @change="applyFilters" type="number" min="1888" max="2100" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-slate-900 dark:text-white" :placeholder="$t('views.movies.filters.releaseYearPlaceholder')" />

	        <input v-model="tagsQuery" @keyup.enter="applyFilters" @change="applyFilters" type="text" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-slate-900 dark:text-white" :placeholder="$t('views.movies.filters.tagsPlaceholder')" />

	        <select v-model="featuredFilter" @change="applyFilters" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm appearance-none text-slate-900 dark:text-white">
	          <option value="">{{ $t('views.movies.filters.featuredAll') }}</option>
	          <option value="true">{{ $t('views.movies.filters.featuredTrue') }}</option>
	          <option value="false">{{ $t('views.movies.filters.featuredFalse') }}</option>
	        </select>

	        <select v-model="trendingFilter" @change="applyFilters" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm appearance-none text-slate-900 dark:text-white">
	          <option value="">{{ $t('views.movies.filters.trendingAll') }}</option>
	          <option value="true">{{ $t('views.movies.filters.trendingTrue') }}</option>
	          <option value="false">{{ $t('views.movies.filters.trendingFalse') }}</option>
	        </select>
      </div>

	      <div class="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3">
	        <input v-model="minImdbFilter" @keyup.enter="applyFilters" @change="applyFilters" type="number" min="0" max="10" step="0.1" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-slate-900 dark:text-white" :placeholder="$t('views.movies.filters.minImdb')" />
	        <input v-model="maxImdbFilter" @keyup.enter="applyFilters" @change="applyFilters" type="number" min="0" max="10" step="0.1" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-slate-900 dark:text-white" :placeholder="$t('views.movies.filters.maxImdb')" />
	        <input v-model="minRatingFilter" @keyup.enter="applyFilters" @change="applyFilters" type="number" min="0" max="10" step="0.1" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-slate-900 dark:text-white" :placeholder="$t('views.movies.filters.minRating')" />
	        <input v-model="maxRatingFilter" @keyup.enter="applyFilters" @change="applyFilters" type="number" min="0" max="10" step="0.1" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm text-slate-900 dark:text-white" :placeholder="$t('views.movies.filters.maxRating')" />

	        <select v-model="newReleaseFilter" @change="applyFilters" class="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm appearance-none text-slate-900 dark:text-white">
	          <option value="">{{ $t('views.movies.filters.newAll') }}</option>
	          <option value="true">{{ $t('views.movies.filters.newTrue') }}</option>
	          <option value="false">{{ $t('views.movies.filters.newFalse') }}</option>
	        </select>

        <div class="flex flex-wrap items-center gap-4">
	          <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
	            <input v-model="includeHidden" @change="applyFilters" type="checkbox" class="size-4 accent-primary" />
	            {{ $t('views.movies.filters.includeHidden') }}
	          </label>
	          <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
	            <input v-model="includeDeleted" @change="applyFilters" type="checkbox" class="size-4 accent-primary" />
	            {{ $t('views.movies.filters.includeDeleted') }}
	          </label>
	        </div>
	      </div>

	      <div class="mt-4 flex flex-wrap items-center justify-end gap-3">
	        <button @click="resetFilters" type="button" class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-bold hover:border-primary hover:text-primary transition-colors">
	          {{ $t('views.movies.actions.reset') }}
	        </button>
	        <button @click="applyFilters" type="button" class="px-5 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity">
	          {{ $t('views.movies.actions.apply') }}
	        </button>
	      </div>
    </div>

    <!-- Data Table -->
    <div class="bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
	        <table class="w-full min-w-[1600px] text-left border-collapse">
	          <thead>
	            <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.idSlug') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.poster') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.title') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.release') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.type') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.genres') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.countries') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.quality') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.imdb') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.rating') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Access Mode</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.views') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.flags') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.status') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{{ $t('views.movies.table.created') }}</th>
	              <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{{ $t('views.movies.table.actions') }}</th>
	            </tr>
	          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-white">
            <tr v-if="listLoading">
              <td colspan="15" class="px-6 py-12 text-center text-slate-500">
                <span class="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
              </td>
            </tr>
	            <tr v-else-if="movies.length === 0">
	              <td colspan="15" class="px-6 py-8 text-center text-slate-500">{{ $t('views.movies.table.empty') }}</td>
	            </tr>
            <template v-else>
              <!-- eslint-disable-next-line vue/no-v-for-template-key -->
              <template v-for="movie in movies" :key="getMovieId(movie) || movie.slug">
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td class="px-6 py-4 text-sm text-slate-500 max-w-[220px]">
                    <div class="font-semibold truncate" :title="getMovieId(movie)">{{ getMovieId(movie) }}</div>
                    <div class="text-xs truncate" :title="movie.slug">{{ movie.slug || '-' }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="w-12 h-16 rounded overflow-hidden bg-slate-200 dark:bg-slate-700">
                      <div class="w-full h-full bg-cover bg-center" :style="{ backgroundImage: `url(${movie.posterUrl || 'https://via.placeholder.com/150'})` }"></div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <p class="text-sm font-bold truncate max-w-[260px]">{{ movie.title }}</p>
                    <p class="text-[10px] text-slate-500 truncate max-w-[260px]">
                      {{ movie.directors?.length ? 'Dir: ' + joinList(movie.directors) : '' }}
                    </p>
                  </td>
                  <td class="px-6 py-4 text-sm">
                    <div class="font-semibold">{{ movie.releaseYear || '-' }}</div>
                    <div class="text-xs text-slate-500">{{ movie.releaseDate ? formatDateTime(movie.releaseDate) : '' }}</div>
                  </td>
                  <td class="px-6 py-4 text-sm">{{ movie.type || '-' }}</td>
                  <td class="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 max-w-[220px] truncate" :title="joinList(movie.genres)">{{ joinList(movie.genres) || '-' }}</td>
                  <td class="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 max-w-[220px] truncate" :title="joinList(movie.countries)">{{ joinList(movie.countries) || '-' }}</td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded">{{ movie.quality || 'HD' }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm">{{ movie.imdbRating ?? '-' }}</td>
                  <td class="px-6 py-4 text-sm">{{ movie.rating ?? '-' }}</td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider" :class="{ 'bg-amber-100 text-amber-700': movie.accessMode === 'ultimate', 'bg-lime-100 text-lime-700': movie.accessMode === 'premium', 'bg-indigo-100 text-indigo-700': movie.accessMode === 'standard', 'bg-slate-100 text-slate-500': !movie.accessMode || movie.accessMode === 'free' }">{{ movie.accessMode || 'free' }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm">{{ movie.views?.toLocaleString?.() || movie.views || '0' }}</td>
	                  <td class="px-6 py-4">
	                    <div class="flex flex-wrap gap-1">
	                      <span v-if="movie.isFeatured" class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">{{ $t('views.movies.flags.featured') }}</span>
	                      <span v-if="movie.isTrending" class="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">{{ $t('views.movies.flags.trending') }}</span>
	                      <span v-if="movie.isNewRelease" class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">{{ $t('views.movies.flags.new') }}</span>
	                      <span v-if="!movie.isFeatured && !movie.isTrending && !movie.isNewRelease" class="text-xs text-slate-400">{{ $t('views.movies.flags.none') }}</span>
	                    </div>
	                  </td>
	                  <td class="px-6 py-4">
	                    <span class="flex items-center gap-1.5 text-xs font-semibold capitalize" :class="getStatusTextClass(movie.status)">
	                      <span class="size-1.5 rounded-full" :class="getStatusDotClass(movie.status)"></span>
	                      {{ movieStatusLabel(movie.status) }}
	                    </span>
	                  </td>
                  <td class="px-6 py-4 text-xs text-slate-500">{{ movie.createdAt ? formatDateTime(movie.createdAt) : '-' }}</td>
	                  <td class="px-6 py-4 text-right">
	                    <div class="flex justify-end gap-2">
	                      <button @click="toggleExpanded(movie)" class="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-lg transition-colors" :title="$t('views.movies.actions.details')">
	                        <span class="material-symbols-outlined text-lg">{{ expandedMovieId === getMovieId(movie) ? 'expand_less' : 'expand_more' }}</span>
	                      </button>
	                      <button @click="openEpisodes(movie)" class="p-1.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-lg transition-colors" :title="$t('views.movies.actions.episodes')">
	                        <span class="material-symbols-outlined text-lg">play_circle</span>
	                      </button>
	                      <button @click="openEditModal(movie)" class="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors" :title="$t('views.movies.actions.edit')">
	                        <span class="material-symbols-outlined text-lg">edit</span>
	                      </button>
	                      <button @click="deleteMovie(movie)" class="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors" :title="$t('views.movies.actions.delete')">
	                        <span class="material-symbols-outlined text-lg">delete</span>
	                      </button>
	                    </div>
	                  </td>
                </tr>

                <tr v-if="expandedMovieId === getMovieId(movie)" class="bg-slate-50 dark:bg-slate-800/20">
                  <td colspan="15" class="px-6 py-5">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
	                      <div class="space-y-1">
	                        <div class="text-xs font-bold text-slate-500 uppercase">{{ $t('views.movies.details.overview') }}</div>
	                        <div class="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{{ movie.overview || '-' }}</div>
	                      </div>

	                      <div class="space-y-2">
	                        <div>
	                          <div class="text-xs font-bold text-slate-500 uppercase">{{ $t('views.movies.details.tags') }}</div>
	                          <div class="text-slate-700 dark:text-slate-200">{{ joinList(movie.tags) || '-' }}</div>
	                        </div>
	                        <div>
	                          <div class="text-xs font-bold text-slate-500 uppercase">{{ $t('views.movies.details.durationLanguage') }}</div>
	                          <div class="text-slate-700 dark:text-slate-200">{{ movie.durationMinutes || '-' }} {{ $t('views.movies.details.min') }} • {{ movie.language || '-' }}</div>
	                        </div>
	                        <div>
	                          <div class="text-xs font-bold text-slate-500 uppercase">{{ $t('views.movies.details.trendingScore') }}</div>
	                          <div class="text-slate-700 dark:text-slate-200">{{ movie.trendingScore ?? '-' }}</div>
	                        </div>
	                        <div>
	                          <div class="text-xs font-bold text-slate-500 uppercase">{{ $t('views.movies.details.updatedDeleted') }}</div>
	                          <div class="text-slate-700 dark:text-slate-200">
	                            {{ movie.updatedAt ? formatDateTime(movie.updatedAt) : '-' }} • {{ movie.deletedAt ? formatDateTime(movie.deletedAt) : '-' }}
	                          </div>
	                        </div>
	                      </div>

	                      <div class="space-y-2">
	                        <div>
	                          <div class="text-xs font-bold text-slate-500 uppercase">{{ $t('views.movies.details.media') }}</div>
	                          <div class="text-slate-700 dark:text-slate-200 break-all">
	                            <div v-if="movie.posterUrl">{{ $t('views.movies.details.poster') }}: {{ movie.posterUrl }}</div>
	                            <div v-if="movie.backdropUrl">{{ $t('views.movies.details.backdrop') }}: {{ movie.backdropUrl }}</div>
	                            <div v-if="movie.trailerUrl">{{ $t('views.movies.details.trailer') }}: {{ movie.trailerUrl }}</div>
	                            <div v-if="movie.streamUrl">{{ $t('views.movies.details.stream') }}: {{ movie.streamUrl }}</div>
	                            <div v-if="!movie.posterUrl && !movie.backdropUrl && !movie.trailerUrl && !movie.streamUrl">-</div>
	                          </div>
	                        </div>
	                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>

	    <!-- Pagination Footer -->
	    <div v-if="!listLoading && total > 0" class="px-6 py-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
	        <span class="text-xs text-slate-500">{{ $t('views.movies.table.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total }) }}</span>
	        <div class="flex gap-1">
          <button @click="previousPage" :disabled="page <= 1" class="size-8 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed">
             <span class="material-symbols-outlined text-base">chevron_left</span>
          </button>
          
          <button class="size-8 flex items-center justify-center rounded bg-primary text-white font-bold text-xs">{{ page }}</button>
          
          <button @click="nextPage" :disabled="page >= totalPages" class="size-8 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed">
             <span class="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Movie Modal Overlay -->
    <div v-if="showModal" class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">
      <div class="bg-white dark:bg-slate-900 rounded-xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
	        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
	          <h3 class="text-xl font-bold text-slate-900 dark:text-white">{{ editingMovie ? $t('views.movies.modal.editTitle') : $t('views.movies.modal.createTitle') }}</h3>
	          <button @click="showModal = false" class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
	            <span class="material-symbols-outlined">close</span>
	          </button>
	        </div>
        
        <div class="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
	            <!-- Thông tin chung -->
	            <div class="space-y-4">
	              <h4 class="font-bold border-b pb-2 mb-4 dark:border-slate-800 text-slate-800 dark:text-slate-200">{{ $t('views.movies.modal.sections.general') }}</h4>
	              <div>
	                <label class="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.name') }}</label>
	                <input v-model="formData.title" type="text" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" :placeholder="$t('views.movies.modal.fields.namePlaceholder')"/>
	              </div>
	              <div class="grid grid-cols-2 gap-4">
	                <div>
	                  <label class="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.slug') }}</label>
	                  <input v-model="formData.slug" type="text" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" :placeholder="$t('views.movies.modal.fields.slugPlaceholder')"/>
	                </div>
	                <div>
	                  <label class="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.releaseYear') }}</label>
	                  <input v-model="formData.releaseYear" type="number" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"/>
	                </div>
	                <div>
	                  <label class="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.type') }}</label>
	                  <select v-model="formData.type" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
	                    <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
	                  </select>
	                </div>
	                <div>
	                  <label class="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.quality') }}</label>
	                  <select v-model="formData.quality" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
	                    <option v-for="q in qualities" :key="q" :value="q">{{ q }}</option>
	                  </select>
	                </div>
	                <div>
	                  <label class="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Access Mode</label>
	                  <select v-model="formData.accessMode" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white">
	                    <option value="free">Free</option>
	                    <option value="standard">Standard</option>
	                    <option value="premium">Premium</option>
	                    <option value="ultimate">Ultimate</option>
	                  </select>
	                </div>
	              </div>
	              <div>
	                <label class="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.overview') }}</label>
	                <textarea v-model="formData.overview" rows="4" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"></textarea>
	              </div>
	            </div>

	            <!-- Phân loại & Media -->
	            <div class="space-y-4">
	              <h4 class="font-bold border-b pb-2 mb-4 dark:border-slate-800 text-slate-800 dark:text-slate-200">{{ $t('views.movies.modal.sections.taxonomiesMedia') }}</h4>
	              <!-- eslint-disable vue/no-v-model-argument -->
	              <div class="grid grid-cols-2 gap-4 border-b pb-4 mb-4 dark:border-slate-800">
	                 <div>
	                    <label class="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.countries') }}</label>
	                    <ASelect
	                      v-model:value="formData.countries"
	                      mode="multiple"
	                      style="width: 100%"
	                      :placeholder="$t('views.movies.modal.fields.countriesPlaceholder')"
	                      :options="countryOptions.map(o => ({ value: o.id, label: o.name }))"
	                    />
	                 </div>
	                 <div>
	                    <label class="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.genres') }}</label>
	                    <ASelect
	                      v-model:value="formData.genres"
	                      mode="multiple"
	                      style="width: 100%"
	                      :placeholder="$t('views.movies.modal.fields.genresPlaceholder')"
	                      :options="categoryOptions.map(o => ({ value: o.id, label: o.name }))"
	                    />
	                 </div>
	                 <div class="col-span-2 md:col-span-1">
	                    <label class="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Directors</label>
	                    <ASelect
	                      v-model:value="formData.directors"
	                      mode="multiple"
	                      style="width: 100%"
	                      placeholder="Select Directors"
	                      :options="personOptions.filter(p => true).map(o => ({ value: o.id, label: o.name }))"
	                    />
	                 </div>
	                 <div class="col-span-2 md:col-span-1">
	                    <label class="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Actors (Cast)</label>
	                    <ASelect
	                      v-model:value="formData.actors"
	                      mode="multiple"
	                      style="width: 100%"
	                      placeholder="Select Actors"
	                      :options="personOptions.filter(p => true).map(o => ({ value: o.id, label: o.name }))"
	                    />
	                 </div>
	              </div>
	              <!-- eslint-enable vue/no-v-model-argument -->
              
	              <div>
	                <div class="flex items-center justify-between mb-1">
	                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.trailerUrl') }}</label>
	                  <button type="button" @click="triggerUpload('trailer-upload')" class="text-xs font-bold text-primary hover:underline disabled:opacity-50" :disabled="uploading">
	                    {{ $t('views.movies.actions.uploadFile') }}
	                  </button>
	                </div>
	                <input v-model="formData.trailerUrl" type="text" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" placeholder="https://youtube.com/..."/>
	                <input type="file" id="trailer-upload" class="hidden" accept="video/*" @change="e => handleVideoUpload(e, 'trailerUrl')"/>
	              </div>
              
	              <div>
	                <div class="flex items-center justify-between mb-1">
	                  <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.streamUrl') }}</label>
	                  <button type="button" @click="triggerUpload('stream-upload')" class="text-xs font-bold text-primary hover:underline disabled:opacity-50" :disabled="uploading">
	                    {{ $t('views.movies.actions.uploadFile') }}
	                  </button>
	                </div>
	                <input v-model="formData.streamUrl" type="text" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" :placeholder="$t('views.movies.modal.fields.streamPlaceholder')"/>
	                <input type="file" id="stream-upload" class="hidden" accept="video/*" @change="e => handleVideoUpload(e, 'streamUrl')"/>
	              </div>

	              <div class="grid grid-cols-2 gap-4">
	                <div>
	                  <label class="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.poster') }}</label>
	                  <input v-model="formData.posterUrl" type="text" class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mb-2" :placeholder="$t('views.movies.modal.fields.posterPlaceholder')"/>
	                  <div class="relative group w-full h-32 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary" @click="triggerUpload('poster-upload')">
	                    <div v-if="formData.posterUrl" class="absolute inset-0 bg-cover bg-center" :style="{ backgroundImage: `url(${formData.posterUrl})` }"></div>
	                    <span v-if="!formData.posterUrl" class="text-xs text-slate-400 font-medium">{{ $t('views.movies.modal.fields.clickUpload') }}</span>
	                    <input type="file" id="poster-upload" class="hidden" accept="image/*" @change="e => handleImageUpload(e, 'posterUrl')"/>
	                  </div>
	                </div>
	                
	                <div>
	                  <label class="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.backdrop') }}</label>
	                  <input v-model="formData.backdropUrl" type="text" class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mb-2" :placeholder="$t('views.movies.modal.fields.backdropPlaceholder')"/>
	                  <div class="relative group w-full h-32 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary" @click="triggerUpload('backdrop-upload')">
	                    <div v-if="formData.backdropUrl" class="absolute inset-0 bg-cover bg-center" :style="{ backgroundImage: `url(${formData.backdropUrl})` }"></div>
	                    <span v-if="!formData.backdropUrl" class="text-xs text-slate-400 font-medium">{{ $t('views.movies.modal.fields.clickUpload') }}</span>
	                    <input type="file" id="backdrop-upload" class="hidden" accept="image/*" @change="e => handleImageUpload(e, 'backdropUrl')"/>
	                  </div>
	                </div>
	              </div>

	              <!-- Thư viện Ảnh (Gallery) -->
	              <div class="pt-2 border-t border-slate-200 dark:border-slate-800">
	                 <div class="flex items-center justify-between mb-3">
	                   <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.gallery') }}</label>
	                   <span class="text-xs font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">{{ $t('views.movies.modal.fields.galleryCount', { count: formData.gallery.length }) }}</span>
	                 </div>
                 <div class="grid grid-cols-4 lg:grid-cols-5 gap-3">
                    <div v-for="(img, idx) in formData.gallery" :key="idx" class="relative group aspect-square rounded-lg border dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <div class="absolute inset-0 bg-cover bg-center" :style="{ backgroundImage: `url(${img})` }"></div>
                      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button @click="removeGalleryImage(idx)" class="size-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg">
                          <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                    
	                    <div v-if="formData.gallery.length < 10" @click="triggerUpload('gallery-upload')" class="aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all bg-slate-50 dark:bg-slate-800/50 text-slate-500">
	                       <span class="material-symbols-outlined mb-1">add_photo_alternate</span>
	                       <span class="text-[10px] font-bold">{{ $t('views.movies.modal.fields.addImage') }}</span>
	                       <input type="file" id="gallery-upload" class="hidden" accept="image/*" multiple @change="handleGalleryUpload"/>
	                    </div>
	                 </div>
	              </div>
            </div>
          </div>
        </div>
        
	        <div class="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
	          <div class="flex items-center gap-3">
	            <span class="text-sm font-bold text-slate-700 dark:text-slate-300">{{ $t('views.movies.modal.fields.statusLabel') }}</span>
	            <select v-model="formData.status" class="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20">
	              <option value="released">{{ $t('views.movies.modal.fields.statusReleased') }}</option>
	              <option value="coming_soon">{{ $t('views.movies.modal.fields.statusComingSoon') }}</option>
	              <option value="hidden">{{ $t('views.movies.modal.fields.statusHidden') }}</option>
	            </select>
	          </div>
	          <div class="flex gap-3">
	            <button @click="showModal = false" class="px-5 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600">{{ $t('views.movies.modal.buttons.cancel') }}</button>
	            <button @click="saveMovie" :disabled="saving || uploading || !formData.title" class="px-6 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
	              <span class="material-symbols-outlined text-[18px]">save</span>
	              {{ $t('views.movies.modal.buttons.save') }}
	            </button>
	          </div>
	        </div>
      </div>
    </div>
  </div>
</template>
