<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import { getMovies } from '../services/discovery';

const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const search = ref('');

const profileLabel = computed(() => authStore.user?.name || 'Account');
const siteName = computed(() => settingsStore.siteName);
const logoUrl = computed(() => settingsStore.resolveAssetUrl(settingsStore.logoUrl));

const isMobileMenuOpen = ref(false);
const toggleMobileMenu = () => isMobileMenuOpen.value = !isMobileMenuOpen.value;

// Close mobile menu when navigating
watch(() => router.currentRoute.value.fullPath, () => {
  isMobileMenuOpen.value = false;
});

function submitSearch() {
  const keyword = search.value.trim();
  router.push({
    name: 'explore',
    query: keyword ? { search: keyword } : {}
  });
}

function logout() {
  authStore.logout();
  router.push({ name: 'home' });
}

const randomLoading = ref(false);
async function playRandomMovie() {
  if (randomLoading.value) return;
  randomLoading.value = true;
  try {
    const res = await getMovies({ limit: 50, sort: '-views' });
    if (res.items && res.items.length) {
      const idx = Math.floor(Math.random() * res.items.length);
      const slug = res.items[idx].slug;
      if (slug) router.push(`/movies/${slug}`);
    }
  } finally {
    randomLoading.value = false;
  }
}
</script>

<template>
  <header class="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-6 md:px-20 py-4">
    <div class="flex items-center gap-10">
      <RouterLink to="/" class="flex items-center gap-3 text-primary">
        <div class="size-8">
          <img v-if="logoUrl" :src="logoUrl" loading="lazy" :alt="siteName" class="w-full h-full object-cover rounded-lg" />
          <svg v-else fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
          </svg>
        </div>
        <h2 class="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight">{{ siteName }}</h2>
      </RouterLink>
      <nav class="hidden lg:flex items-center gap-8">
        <RouterLink to="/" class="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors text-sm font-medium leading-normal" exact-active-class="!text-primary font-semibold">Home</RouterLink>
        <RouterLink to="/explore" class="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors text-sm font-medium leading-normal" active-class="!text-primary font-semibold">Explore</RouterLink>
        <RouterLink to="/categories" class="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors text-sm font-medium leading-normal" active-class="!text-primary font-semibold">Categories</RouterLink>
        <RouterLink to="/watchlist" class="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors text-sm font-medium leading-normal" active-class="!text-primary font-semibold">Watchlist</RouterLink>
      </nav>
    </div>

    <!-- Mobile Navigation Toggle -->
    <div class="flex lg:hidden flex-1 justify-end">
       <button @click="toggleMobileMenu" class="flex items-center justify-center size-10 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span class="material-symbols-outlined text-2xl">menu</span>
       </button>
    </div>

    <div class="hidden lg:flex flex-1 justify-end items-center gap-4">
      <form @submit.prevent="submitSearch" class="hidden xl:flex flex-col min-w-40 h-10 max-w-64">
        <label class="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm">
          <div class="text-slate-400 flex border-none bg-slate-100 dark:bg-slate-800 items-center justify-center pl-4 rounded-l-xl">
            <span class="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input v-model="search" type="search" class="form-input flex w-full min-w-0 flex-1 border-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-0 h-full placeholder:text-slate-400 px-4 rounded-r-xl text-sm font-normal outline-none" placeholder="Search movies, actors..." />
        </label>
      </form>

      <button @click="playRandomMovie" :disabled="randomLoading" class="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all shadow-sm" title="Surprise Me">
        <span v-if="randomLoading" class="material-symbols-outlined animate-spin text-lg">progress_activity</span>
        <span v-else class="material-symbols-outlined text-xl">casino</span>
      </button>

      <!-- Profile Dropdown -->
      <div v-if="authStore.isLoggedIn" class="relative group ml-2">
        <button class="relative size-10 rounded-full border border-slate-200 dark:border-slate-700 bg-center bg-cover cursor-pointer focus:ring-2 focus:ring-primary/50 outline-none hover:shadow-md transition-all" :style="{ backgroundImage: `url('${authStore.user?.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuArpztiDc-i31Sjbyh_a4hUf_uwd-DUrj1ZPj1mfPbgVSxqPEvpPq5I_pQlj0ZbPhfU2J5NdmuSCS9IrQ2L5GN6nKoCsbINfvKEbIqQJb8XrLphD0bAPZ5KxPXyE8AqVrmYAZfSDkEenma9NATBYYhBKkHniqEkGbw9R_Ei9FG03U6bC-AVe_luFl7QmWqLw0Gw2h10m6wosBW7GolA4JiAHhmlo6od3g3TlvgGnHGIqYJswJGrxsPjqREaKpMx7StWcSGyYAwZJQ'}')` }"></button>
        
        <!-- Dropdown Menu Content -->
        <div class="absolute right-0 top-full pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-slate-200/50 dark:shadow-none">
            <!-- Header (Name & Link) -->
            <RouterLink to="/profile" class="block px-4 py-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-700 transition-colors">
              <p class="text-xs text-slate-500 dark:text-slate-400 mb-0.5 font-medium">Signed in as</p>
              <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ profileLabel }}</p>
            </RouterLink>
            
            <!-- Actions -->
            <div class="p-2 flex flex-col gap-1">
              <RouterLink to="/profile" class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <span class="material-symbols-outlined text-[20px]">person</span>
                Account Profile
              </RouterLink>
              <RouterLink to="/pricing" class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <span class="material-symbols-outlined text-[20px]">subscriptions</span>
                Premium / VIP
              </RouterLink>
              
              <div class="h-px bg-slate-100 dark:bg-slate-700/50 my-1 mx-2"></div>
              
              <button @click="logout" class="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 text-sm font-bold text-red-600 dark:text-red-400 transition-colors">
                <span class="material-symbols-outlined text-[20px] text-red-500">logout</span>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="flex gap-3">
        <RouterLink to="/login" class="flex min-w-[84px] cursor-pointer items-center justify-center rounded-xl h-10 px-5 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <span>Sign In</span>
        </RouterLink>
      </div>
    </div>
  
  <!-- Mobile Drawer Menu -->
  <Teleport to="body">
    <div v-if="isMobileMenuOpen" class="fixed inset-0 z-[100] lg:hidden flex">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" @click="isMobileMenuOpen = false"></div>
      <div class="relative ml-auto w-4/5 max-w-xs h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col p-6 animate-slide-in-right overflow-y-auto">
         <!-- Close Button -->
         <button @click="isMobileMenuOpen = false" class="absolute top-6 right-6 size-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-500 transition-colors">
            <span class="material-symbols-outlined">close</span>
         </button>

         <!-- Mobile Search -->
         <div class="mt-16 mb-8">
           <form @submit.prevent="submitSearch(); isMobileMenuOpen = false" class="flex flex-col h-12">
            <label class="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm">
              <div class="text-slate-400 flex border-none bg-slate-100 dark:bg-slate-800 items-center justify-center pl-4 rounded-l-xl">
                <span class="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input v-model="search" type="search" class="form-input flex w-full min-w-0 flex-1 border-none bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-0 h-full placeholder:text-slate-400 px-4 rounded-r-xl text-base font-normal outline-none" placeholder="Search movies, actors..." />
            </label>
           </form>
         </div>

         <!-- Mobile Nav Links -->
         <nav class="flex flex-col gap-2">
            <RouterLink to="/" class="flex items-center gap-4 p-4 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium text-lg" exact-active-class="!text-primary font-bold bg-primary/5">
              <span class="material-symbols-outlined text-2xl">home</span> Home
            </RouterLink>
            <RouterLink to="/explore" class="flex items-center gap-4 p-4 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium text-lg" active-class="!text-primary font-bold bg-primary/5">
              <span class="material-symbols-outlined text-2xl">explore</span> Explore
            </RouterLink>
            <RouterLink to="/categories" class="flex items-center gap-4 p-4 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium text-lg" active-class="!text-primary font-bold bg-primary/5">
              <span class="material-symbols-outlined text-2xl">category</span> Categories
            </RouterLink>
            <RouterLink to="/watchlist" class="flex items-center gap-4 p-4 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium text-lg" active-class="!text-primary font-bold bg-primary/5">
              <span class="material-symbols-outlined text-2xl">bookmark</span> Watchlist
            </RouterLink>
         </nav>
         
         <div class="mt-auto pt-8 flex flex-col gap-4">
             <!-- Profile Actions for Mobile -->
             <div v-if="authStore.isLoggedIn" class="flex flex-col gap-2">
                <RouterLink to="/profile" class="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-slate-900 dark:text-white">
                    <img :src="authStore.user?.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuArpztiDc-i31Sjbyh_a4hUf_uwd-DUrj1ZPj1mfPbgVSxqPEvpPq5I_pQlj0ZbPhfU2J5NdmuSCS9IrQ2L5GN6nKoCsbINfvKEbIqQJb8XrLphD0bAPZ5KxPXyE8AqVrmYAZfSDkEenma9NATBYYhBKkHniqEkGbw9R_Ei9FG03U6bC-AVe_luFl7QmWqLw0Gw2h10m6wosBW7GolA4JiAHhmlo6od3g3TlvgGnHGIqYJswJGrxsPjqREaKpMx7StWcSGyYAwZJQ'" class="size-10 rounded-full object-cover border border-slate-300 dark:border-slate-600" />
                    <span>My Account</span>
                </RouterLink>
                <button @click="logout" class="flex items-center gap-4 p-4 font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors">
                  <span class="material-symbols-outlined text-2xl">logout</span> Logout
                </button>
             </div>
             <div v-else>
               <RouterLink to="/login" class="flex items-center justify-center p-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors">
                 Sign In
               </RouterLink>
             </div>
         </div>
      </div>
    </div>
  </Teleport>
  </header>
</template>
<style>
.animate-slide-in-right {
  animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
</style>
