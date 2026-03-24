<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import MovieCard from '../components/MovieCard.vue';
import { getApiErrorMessage } from '../services/api';
import { getCatalogFilters, getMovies, getPersons } from '../services/discovery';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const filtersLoading = ref(true);
const error = ref('');
const filters = ref({ genres: [], countries: [], years: [], qualities: [], types: [], persons: [] });
const items = ref([]);
const meta = ref({ page: 1, limit: 12, totalPages: 1, total: 0 });
const showMobileFilters = ref(false);

const form = ref({
  search: '',
  genre: '',
  country: '',
  releaseYear: '',
  quality: '',
  type: '',
  actorSlug: '',
  directorSlug: '',
  sort: '-createdAt',
  page: 1,
  limit: 12
});

const hasFilters = computed(
  () =>
    Boolean(form.value.search || form.value.genre || form.value.country || form.value.releaseYear || form.value.quality || form.value.type || form.value.actorSlug || form.value.directorSlug)
);

function syncFromRoute() {
  form.value.search = route.query.search || '';
  form.value.genre = route.query.genre || '';
  form.value.country = route.query.country || '';
  form.value.releaseYear = route.query.releaseYear || '';
  form.value.quality = route.query.quality || '';
  form.value.type = route.query.type || '';
  form.value.actorSlug = route.query.actorSlug || '';
  form.value.directorSlug = route.query.directorSlug || '';
  form.value.sort = route.query.sort || '-createdAt';
  form.value.page = Number.parseInt(route.query.page || '1', 10);
}

async function loadFilters() {
  filtersLoading.value = true;
  try {
    const [filterRes, personRes] = await Promise.all([
       getCatalogFilters(),
       getPersons({ limit: 50, sort: '-views' })
    ]);
    filters.value = { ...filterRes, persons: personRes.items || [] };
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Failed to load filters');
  } finally {
    filtersLoading.value = false;
  }
}

async function loadMovies() {
  loading.value = true;
  error.value = '';

  try {
    const params = {
      search: form.value.search || undefined,
      genre: form.value.genre || undefined,
      country: form.value.country || undefined,
      releaseYear: form.value.releaseYear || undefined,
      quality: form.value.quality || undefined,
      type: form.value.type || undefined,
      actorSlug: form.value.actorSlug || undefined,
      directorSlug: form.value.directorSlug || undefined,
      sort: form.value.sort || undefined,
      page: form.value.page,
      limit: form.value.limit
    };

    const result = await getMovies(params);
    items.value = result.items;
    meta.value = result.meta || meta.value;
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Failed to load movies');
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  const query = {
    ...(form.value.search ? { search: form.value.search } : {}),
    ...(form.value.genre ? { genre: form.value.genre } : {}),
    ...(form.value.country ? { country: form.value.country } : {}),
    ...(form.value.releaseYear ? { releaseYear: form.value.releaseYear } : {}),
    ...(form.value.quality ? { quality: form.value.quality } : {}),
    ...(form.value.type ? { type: form.value.type } : {}),
    ...(form.value.actorSlug ? { actorSlug: form.value.actorSlug } : {}),
    ...(form.value.directorSlug ? { directorSlug: form.value.directorSlug } : {}),
    ...(form.value.sort ? { sort: form.value.sort } : {}),
    page: String(form.value.page)
  };

  router.push({ name: 'explore', query });
}

function clearFilters() {
  form.value = {
    search: '',
    genre: '',
    country: '',
    releaseYear: '',
    quality: '',
    type: '',
    actorSlug: '',
    directorSlug: '',
    sort: '-createdAt',
    page: 1,
    limit: 12
  };
  router.push({ name: 'explore' });
}

function goPage(offset) {
  const nextPage = Math.max(1, (meta.value.page || 1) + offset);
  if (nextPage > (meta.value.totalPages || 1)) {
    return;
  }

  form.value.page = nextPage;
  applyFilters();
}

watch(
  () => route.query,
  () => {
    syncFromRoute();
    loadMovies();
  },
  { immediate: true }
);

onMounted(loadFilters);
</script>

<template>
  <div class="flex flex-col">
    <!-- Hero Header Section -->
    <!-- Hero Header Section -->
    <div class="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
      <div>
        <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Explore Movies Catalog</h1>
        <p class="text-slate-500 dark:text-slate-400 max-w-2xl text-lg">Browse through our curated collection of high-definition movies across all genres.</p>
        <div v-if="meta.total" class="mt-4 inline-flex items-center px-3 py-1 bg-primary/10 text-primary text-sm font-bold rounded-full">
          {{ meta.total }} titles found
        </div>
      </div>
      
      <!-- Mobile Filter Toggle -->
      <button @click="showMobileFilters = !showMobileFilters" class="lg:hidden flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold shadow-lg">
        <span class="material-symbols-outlined">{{ showMobileFilters ? 'close' : 'tune' }}</span>
        {{ showMobileFilters ? 'Hide Filters' : 'Filters & Sort' }}
      </button>
    </div>

    <div class="flex flex-col lg:flex-row gap-8">
      <!-- Sidebar / Sort Section -->
      <aside :class="['w-full lg:w-64 shrink-0 space-y-8 transition-all', showMobileFilters ? 'block' : 'hidden lg:block']">
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">Sort By</h3>
          <div class="flex flex-col gap-2">
            <button @click="form.sort = '-createdAt'; applyFilters()" :class="['flex items-center justify-between w-full px-4 py-3 rounded-xl font-medium transition-colors', form.sort === '-createdAt' ? 'bg-primary text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300']">
              <span>Newest</span>
              <span v-if="form.sort === '-createdAt'" class="material-symbols-outlined text-lg">check_circle</span>
            </button>
            <button @click="form.sort = '-views'; applyFilters()" :class="['flex items-center justify-between w-full px-4 py-3 rounded-xl font-medium transition-colors', form.sort === '-views' ? 'bg-primary text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300']">
              <span>Most Viewed</span>
              <span v-if="form.sort === '-views'" class="material-symbols-outlined text-lg">check_circle</span>
            </button>
            <button @click="form.sort = '-imdbRating'; applyFilters()" :class="['flex items-center justify-between w-full px-4 py-3 rounded-xl font-medium transition-colors', form.sort === '-imdbRating' ? 'bg-primary text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300']">
              <span>Top Rated</span>
              <span v-if="form.sort === '-imdbRating'" class="material-symbols-outlined text-lg">check_circle</span>
            </button>
            <button @click="form.sort = 'title'; applyFilters()" :class="['flex items-center justify-between w-full px-4 py-3 rounded-xl font-medium transition-colors', form.sort === 'title' ? 'bg-primary text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300']">
              <span>A-Z</span>
              <span v-if="form.sort === 'title'" class="material-symbols-outlined text-lg">check_circle</span>
            </button>
          </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
           <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Filters</h3>
              <button @click="clearFilters" class="text-xs text-primary font-bold hover:underline">Reset</button>
           </div>
           
           <div class="flex flex-col gap-4">
              <div class="relative">
                 <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                 <input v-model="form.search" @keyup.enter="applyFilters" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:text-white" placeholder="Search keywords..." type="search"/>
              </div>

               <div v-if="filtersLoading" class="text-sm text-slate-500 text-center py-4">Loading filters...</div>
               <template v-else>
                  <label class="flex flex-col gap-1.5">
                     <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Genre</span>
                     <select v-model="form.genre" @change="applyFilters" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:text-white appearance-none">
                        <option value="">All Genres</option>
                        <option v-for="genre in filters.genres" :key="genre" :value="genre">{{ genre }}</option>
                     </select>
                  </label>

                   <label class="flex flex-col gap-1.5">
                     <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Country</span>
                     <select v-model="form.country" @change="applyFilters" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:text-white appearance-none">
                        <option value="">All Countries</option>
                        <option v-for="country in filters.countries" :key="country" :value="country">{{ country }}</option>
                     </select>
                  </label>

                  <label class="flex flex-col gap-1.5">
                     <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Cast & Crew</span>
                     <select v-model="form.actorSlug" @change="applyFilters" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:text-white appearance-none">
                        <option value="">All Actors</option>
                        <option v-for="person in filters.persons" :key="person._id" :value="person.slug">{{ person.name }} ({{ person.knownFor }})</option>
                     </select>
                  </label>

                  <label class="flex flex-col gap-1.5">
                     <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Year</span>
                     <select v-model="form.releaseYear" @change="applyFilters" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:text-white appearance-none">
                        <option value="">All Years</option>
                        <option v-for="year in filters.years" :key="year" :value="year">{{ year }}</option>
                     </select>
                  </label>

                  <div class="grid grid-cols-2 gap-3">
                     <label class="flex flex-col gap-1.5">
                        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Quality</span>
                        <select v-model="form.quality" @change="applyFilters" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:text-white appearance-none">
                           <option value="">All</option>
                           <option v-for="quality in filters.qualities" :key="quality" :value="quality">{{ quality }}</option>
                        </select>
                     </label>

                     <label class="flex flex-col gap-1.5">
                        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-1">Type</span>
                        <select v-model="form.type" @change="applyFilters" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all dark:text-white appearance-none">
                           <option value="">All</option>
                           <option v-for="type in filters.types" :key="type" :value="type">{{ type }}</option>
                        </select>
                     </label>
                  </div>
               </template>
           </div>
        </div>

        <div class="bg-primary/5 rounded-2xl p-6 border border-primary/10">
          <h3 class="text-primary font-bold mb-2">Premium Pass</h3>
          <p class="text-slate-600 dark:text-slate-400 text-sm mb-4">Get unlimited access to 4K Ultra HD content and early releases.</p>
          <button class="w-full py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors">Upgrade Now</button>
        </div>
      </aside>

      <!-- Content Area -->
      <div class="flex-1 space-y-6">
        <div v-if="error" class="bg-red-50 dark:bg-red-900/20 text-red-500 p-6 rounded-2xl border border-red-100 dark:border-red-900">{{ error }}</div>
        
        <div v-if="loading" class="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
           <span class="material-symbols-outlined animate-spin text-primary text-4xl mb-4">progress_activity</span>
           <p class="text-slate-500 dark:text-slate-400 font-medium">Loading catalog...</p>
        </div>
        
        <template v-else>
           <div v-if="!items.length && !loading" class="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-center px-4">
              <span class="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">search_off</span>
              <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">No movies found</h3>
              <p class="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">We couldn't find any titles matching your current filter criteria. Try adjusting or clearing your filters.</p>
              <button @click="clearFilters" class="mt-6 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Clear All Filters</button>
           </div>
           
           <div v-else class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
             <MovieCard v-for="movie in items" :key="movie.id" :movie="movie" :compact="true" />
           </div>

           <!-- Pagination Component -->
           <div v-if="meta.totalPages > 1" class="flex items-center justify-center py-8">
             <nav class="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
               <button @click="goPage(-1)" :disabled="meta.page <= 1" class="size-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                 <span class="material-symbols-outlined">chevron_left</span>
               </button>
               
               <div class="px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Page {{ meta.page }} of {{ meta.totalPages }}
               </div>

               <button @click="goPage(1)" :disabled="meta.page >= meta.totalPages" class="size-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                 <span class="material-symbols-outlined">chevron_right</span>
               </button>
             </nav>
           </div>
        </template>
      </div>
    </div>
  </div>
</template>

