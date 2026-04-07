<script setup>
import { computed, onMounted, ref } from 'vue';

import { getApiErrorMessage } from '../services/api';
import { getCatalogFilters, getCountriesCatalog, getPersons } from '../services/discovery';

const loading = ref(true);
const error = ref('');
const keyword = ref('');
const countries = ref([]);
const genres = ref([]);
const persons = ref([]);

const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase());

const filteredCountries = computed(() => {
  if (!normalizedKeyword.value) return countries.value;
  return countries.value.filter((item) => item.country.toLowerCase().includes(normalizedKeyword.value));
});

const filteredGenres = computed(() => {
  if (!normalizedKeyword.value) return genres.value;
  return genres.value.filter((item) => item.toLowerCase().includes(normalizedKeyword.value));
});

const filteredPersons = computed(() => {
  if (!normalizedKeyword.value) return persons.value;
  return persons.value.filter((item) => item.name.toLowerCase().includes(normalizedKeyword.value));
});

async function loadData() {
  loading.value = true;
  error.value = '';

  try {
    const [countriesRes, filtersRes, personsRes] = await Promise.all([
      getCountriesCatalog(),
      getCatalogFilters(),
      getPersons({ limit: 18, sort: '-views' }),
    ]);

    countries.value = countriesRes;
    genres.value = filtersRes.genres || [];
    persons.value = personsRes.items || [];
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Failed to load categories catalog');
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <section class="page-shell">
    <div class="page-hero">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-4">
          <span class="page-kicker">Catalog Map</span>
          <h1 class="page-title max-w-[12ch]">Browse the library by category, country, and cast.</h1>
          <p class="page-copy">
            Use one search field to narrow down genres, production countries, and notable cast or crew members.
          </p>
        </div>

        <div class="w-full max-w-md">
          <label class="control-label">Search Catalog</label>
          <div class="relative">
            <span class="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              v-model="keyword"
              type="search"
              placeholder="Search genres, countries, people..."
              class="control-field pl-11"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="empty-state">
      <span class="material-symbols-outlined animate-spin text-5xl text-primary">progress_activity</span>
      <h2 class="section-title">Loading the category catalog...</h2>
      <p class="section-copy text-center">Fetching genres, countries, and featured people from the backend.</p>
    </div>

    <div v-else-if="error" class="status-card status-error panel-surface p-6">
      <span class="material-symbols-outlined text-xl">error</span>
      <div class="space-y-3">
        <p>{{ error }}</p>
        <button class="action-secondary w-fit" @click="loadData">Try Again</button>
      </div>
    </div>

    <template v-else>
      <div v-if="!filteredGenres.length && !filteredCountries.length && !filteredPersons.length" class="empty-state">
        <span class="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700">search_off</span>
        <h2 class="section-title">No category matched your search.</h2>
        <p class="section-copy text-center">
          Try a broader keyword or clear the search field to see the full catalog map again.
        </p>
        <button v-if="keyword" class="action-secondary" @click="keyword = ''">Clear Search</button>
      </div>

      <section v-if="filteredGenres.length" class="page-shell gap-5">
        <div class="section-head">
          <div>
            <h2 class="section-title">Genres</h2>
            <p class="section-copy">Jump straight into a mood or style without browsing the entire homepage feed.</p>
          </div>
        </div>
        <div class="panel-surface grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <RouterLink
            v-for="genre in filteredGenres"
            :key="genre"
            :to="`/explore?genre=${encodeURIComponent(genre)}`"
            class="panel-muted flex min-h-[116px] flex-col items-center justify-center gap-3 p-4 text-center hover:-translate-y-0.5"
          >
            <div class="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span class="material-symbols-outlined">category</span>
            </div>
            <span class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ genre }}</span>
          </RouterLink>
        </div>
      </section>

      <section v-if="filteredCountries.length" class="page-shell gap-5">
        <div class="section-head">
          <div>
            <h2 class="section-title">Countries</h2>
            <p class="section-copy">Explore regional catalogs and find out where each cluster of titles comes from.</p>
          </div>
        </div>
        <div class="panel-surface grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <RouterLink
            v-for="item in filteredCountries"
            :key="item.country"
            :to="`/explore?country=${encodeURIComponent(item.country)}`"
            class="panel-muted flex min-h-[150px] flex-col items-center justify-center gap-3 p-5 text-center hover:-translate-y-0.5"
          >
            <div class="flex size-14 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
              <span class="material-symbols-outlined">public</span>
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-white">{{ item.country }}</h3>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {{ item.titles }} titles
            </p>
          </RouterLink>
        </div>
      </section>

      <section v-if="filteredPersons.length" class="page-shell gap-5">
        <div class="section-head">
          <div>
            <h2 class="section-title">Notable Cast and Crew</h2>
            <p class="section-copy">Quick access to frequently viewed actors and directors from the client app.</p>
          </div>
        </div>
        <div class="panel-surface grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <RouterLink
            v-for="person in filteredPersons"
            :key="person._id"
            :to="`/person/${person.slug}`"
            class="panel-muted flex min-h-[190px] flex-col items-center justify-center gap-3 p-4 text-center hover:-translate-y-0.5"
          >
            <div class="size-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <img v-if="person.avatarUrl" :src="person.avatarUrl" class="h-full w-full object-cover" :alt="person.name" />
              <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                <span class="material-symbols-outlined text-3xl">person</span>
              </div>
            </div>
            <div class="space-y-1">
              <h3 class="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white">{{ person.name }}</h3>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {{ person.knownFor || 'Talent' }}
              </p>
            </div>
          </RouterLink>
        </div>
      </section>
    </template>
  </section>
</template>
