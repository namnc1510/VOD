<script setup>
import { computed, onMounted, ref } from 'vue';

import { getApiErrorMessage } from '../services/api';
import { getCountriesCatalog, getCatalogFilters, getPersons } from '../services/discovery';

const loading = ref(true);
const error = ref('');
const keyword = ref('');
const countries = ref([]);
const genres = ref([]);
const persons = ref([]);

const filteredCountries = computed(() => {
  const search = keyword.value.trim().toLowerCase();
  if (!search) {
    return countries.value;
  }
  return countries.value.filter((item) => item.country.toLowerCase().includes(search));
});

const filteredGenres = computed(() => {
  const search = keyword.value.trim().toLowerCase();
  if (!search) {
    return genres.value;
  }
  return genres.value.filter((item) => item.toLowerCase().includes(search));
});

const filteredPersons = computed(() => {
  const search = keyword.value.trim().toLowerCase();
  if (!search) {
    return persons.value;
  }
  return persons.value.filter((item) => item.name.toLowerCase().includes(search));
});

async function loadData() {
  loading.value = true;
  error.value = '';

  try {
    const [coRes, fiRes, pRes] = await Promise.all([
      getCountriesCatalog(),
      getCatalogFilters(),
      getPersons({ limit: 12, sort: '-views' })
    ]);
    countries.value = coRes;
    genres.value = fiRes.genres || [];
    persons.value = pRes.items || [];
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Failed to load categories catalog');
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <div class="flex flex-col flex-1 max-w-[1440px] mx-auto w-full px-6 lg:px-20 py-10">
    <!-- Hero Header Section -->
    <div class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Browse Categories</h1>
        <p class="text-slate-500 dark:text-slate-400 max-w-2xl text-lg">Explore our vast collection of movies and series by genre or country of origin.</p>
      </div>
      
      <!-- Search Input -->
      <div class="relative w-full md:w-72 mt-4 md:mt-0">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
        <input 
          v-model="keyword"
          type="text" 
          placeholder="Search categories..."
          class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-slate-400 shadow-sm transition-all text-slate-900 dark:text-white"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <span class="material-symbols-outlined animate-spin text-primary text-4xl mb-4">progress_activity</span>
      <p class="text-slate-500 dark:text-slate-400 font-medium text-lg">Loading categories catalog...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 text-red-500 p-8 rounded-2xl border border-red-100 dark:border-red-900 flex flex-col items-center justify-center text-center">
      <span class="material-symbols-outlined text-5xl mb-3">error_outline</span>
      <h3 class="text-lg font-bold mb-1">Oops! Something went wrong</h3>
      <p>{{ error }}</p>
      <button @click="loadData" class="mt-4 px-6 py-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors font-medium">Try Again</button>
    </div>

    <!-- Content Area -->
    <div v-else class="space-y-12">
      <div v-if="!filteredGenres.length && !filteredCountries.length && !filteredPersons.length" class="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 text-center px-4">
        <span class="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">search_off</span>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white mb-2">No categories found</h3>
        <p class="text-slate-500 max-w-md">We couldn't find any genres, countries, or persons matching "{{ keyword }}".</p>
        <button v-if="keyword" @click="keyword = ''" class="mt-6 px-6 py-2 text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors">Clear Search</button>
      </div>

      <!-- Genres Section -->
      <section v-if="filteredGenres.length">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><span class="material-symbols-outlined text-indigo-500">movie_filter</span> Genres</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <RouterLink 
            v-for="genre in filteredGenres" 
            :key="genre" 
            :to="`/explore?genre=${encodeURIComponent(genre)}`"
            class="group p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-lg hover:border-indigo-500/30 transition-all text-center flex flex-col items-center gap-2"
          >
            <div class="size-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all">
              <span class="material-symbols-outlined">category</span>
            </div>
            <span class="font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-500 transition-colors">{{ genre }}</span>
          </RouterLink>
        </div>
      </section>

      <!-- Countries Section -->
      <section v-if="filteredCountries.length">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><span class="material-symbols-outlined text-emerald-500">public</span> Countries</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          <RouterLink 
            v-for="item in filteredCountries" 
            :key="item.country" 
            :to="`/explore?country=${encodeURIComponent(item.country)}`"
            class="group flex flex-col items-center justify-center p-6 md:p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300 text-center"
          >
            <div class="size-16 mb-4 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-inner">
              <span class="material-symbols-outlined text-3xl">map</span>
            </div>
            <h3 class="font-bold text-slate-900 dark:text-white text-lg group-hover:text-emerald-500 transition-colors line-clamp-1 w-full" :title="item.country">{{ item.country }}</h3>
            <div class="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold rounded-full group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
              <span class="material-symbols-outlined text-[14px]">movie</span>
              <span>{{ item.titles }} titles</span>
            </div>
          </RouterLink>
        </div>
      </section>

      <!-- Persons Section -->
      <section v-if="filteredPersons.length">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <span class="material-symbols-outlined text-amber-500">recent_actors</span> 
          Notable Cast & Crew
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <RouterLink 
            v-for="person in filteredPersons" 
            :key="person._id" 
            :to="`/person/${person.slug}`"
            class="group flex flex-col items-center p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-lg hover:border-amber-500/30 transition-all text-center"
          >
            <div class="size-16 sm:size-20 mb-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-inner group-hover:ring-4 ring-amber-500/30 transition-all">
              <img v-if="person.avatarUrl" :src="person.avatarUrl" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <span v-else class="material-symbols-outlined text-3xl text-slate-400">person</span>
            </div>
            <h3 class="font-bold text-slate-900 dark:text-white text-sm group-hover:text-amber-500 transition-colors line-clamp-1 w-full" :title="person.name">{{ person.name }}</h3>
            <div class="mt-1 text-xs text-slate-500 capitalize">{{ person.knownFor }}</div>
          </RouterLink>
        </div>
      </section>
      
    </div>
  </div>
</template>
