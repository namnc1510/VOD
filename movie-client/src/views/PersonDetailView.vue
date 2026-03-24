<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getPersonBySlug } from '../services/discovery';
import { getApiErrorMessage } from '../services/api';
import MovieCard from '../components/MovieCard.vue';

const route = useRoute();
const person = ref(null);
const loading = ref(true);
const error = ref('');

const loadPerson = async () => {
  loading.value = true;
  error.value = '';
  try {
    const slug = route.params.slug;
    person.value = await getPersonBySlug(slug);
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Could not load person details');
  } finally {
    loading.value = false;
  }
};

watch(() => route.params.slug, loadPerson);
onMounted(loadPerson);

const formatDate = (dateStr) => {
  if (!dateStr) return 'Unknown';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};
</script>

<template>
  <div class="flex flex-col flex-1 pb-20 mt-4 md:mt-12">
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-40">
      <span class="material-symbols-outlined animate-spin text-primary text-5xl mb-4">progress_activity</span>
      <p class="text-slate-500 dark:text-slate-400 font-medium">Loading profile...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-4xl mx-auto w-full px-6 py-20">
      <div class="bg-red-50 dark:bg-red-900/20 text-red-500 p-8 rounded-3xl border border-red-100 dark:border-red-900 flex flex-col items-center justify-center text-center">
        <span class="material-symbols-outlined text-6xl mb-4">error_outline</span>
        <h3 class="text-xl font-bold mb-2">Oops! Something went wrong</h3>
        <p class="max-w-md">{{ error }}</p>
        <button @click="loadPerson" class="mt-6 px-6 py-2.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors font-bold">Try Again</button>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="person" class="max-w-[1280px] mx-auto w-full px-6 lg:px-12 animate-fade-in space-y-12">
      <div class="flex flex-col md:flex-row gap-10 lg:gap-16 items-start relative">
        
        <!-- Sidebar Profile -->
        <div class="shrink-0 w-full md:w-72 flex flex-col items-center md:items-start space-y-8 sticky top-24">
          <div class="w-48 h-48 md:w-full md:aspect-[2/3] md:h-auto rounded-3xl overflow-hidden shadow-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative group">
            <img v-if="person.avatarUrl" :src="person.avatarUrl" :alt="person.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div v-else class="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
              <span class="material-symbols-outlined text-8xl mb-2">person_filled</span>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          
          <div class="w-full space-y-6">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white hidden md:block">Personal Info</h2>
            
            <div class="grid grid-cols-2 md:grid-cols-1 gap-4">
              <div>
                <h4 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Known For</h4>
                <p class="font-medium text-slate-900 dark:text-white capitalize">{{ person.knownFor }}</p>
              </div>
              
              <div v-if="person.gender && person.gender !== 'Unknown'">
                <h4 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Gender</h4>
                <p class="font-medium text-slate-900 dark:text-white">{{ person.gender }}</p>
              </div>

              <div>
                <h4 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Born</h4>
                <p class="font-medium text-slate-900 dark:text-white">{{ formatDate(person.birthDate) }}</p>
              </div>

              <div v-if="person.placeOfBirth || person.nationality">
                <h4 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Place of Birth</h4>
                <p class="font-medium text-slate-900 dark:text-white">{{ person.placeOfBirth || person.nationality }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content (Bio & Movies) -->
        <div class="flex-1 min-w-0 space-y-12">
          
          <!-- Header -->
          <div class="text-center md:text-left">
            <h1 class="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6 flex items-center justify-center md:justify-start gap-3">
               {{ person.name }}
               <span v-if="person.views > 100" title="Trending Star" class="material-symbols-outlined text-amber-500 text-3xl">hotel_class</span>
            </h1>
            
            <div class="space-y-4">
               <h3 class="text-xl font-bold text-slate-900 dark:text-white">Biography</h3>
               <p class="text-slate-600 dark:text-slate-300 text-lg leading-relaxed whitespace-pre-line">{{ person.biography || `We don't have a biography for ${person.name}.` }}</p>
            </div>
          </div>

      <!-- Movies Section -->
      <div class="border-t border-slate-200 dark:border-slate-800 pt-10">
        <div class="flex items-center justify-between mb-8">
          <h2 class="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            Known For
          </h2>
          <span class="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{{ person.movies?.length || 0 }} Movies</span>
        </div>

        <div v-if="person.movies && person.movies.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          <MovieCard 
            v-for="movie in person.movies" 
            :key="movie._id" 
            :movie="movie" 
            :compact="true"
          />
        </div>
        
        <div v-else class="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
           <span class="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-4">search_off</span>
           <p class="text-slate-500 font-medium">No associated movies found.</p>
        </div>
      </div>
      
      </div>
    </div>
  </div>
</div>
</template>
