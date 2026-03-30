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

const isCollapsed = ref(localStorage.getItem('movie_sidebar_collapsed') === 'true');
const showLabels = ref(!isCollapsed.value);

watch(isCollapsed, (val) => {
  localStorage.setItem('movie_sidebar_collapsed', Boolean(val));
});

function toggleSidebar() {
  if (isCollapsed.value) {
    isCollapsed.value = false;
    setTimeout(() => {
      showLabels.value = true;
    }, 200);
  } else {
    showLabels.value = false;
    isCollapsed.value = true;
  }
}

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
  <aside :class="[
    'hidden xl:flex flex-col h-screen shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md sticky top-0 transition-all duration-300 ease-in-out',
    isCollapsed ? 'w-[88px] items-center' : 'w-[280px]'
  ]">
    <div :class="['py-8 flex items-center relative', isCollapsed ? 'px-0 justify-center w-full' : 'px-8 justify-between']">
      <RouterLink to="/" class="flex items-center gap-4 text-primary" :title="siteName">
        <div class="h-10 shrink-0">
          <img v-if="logoUrl" :src="logoUrl" loading="lazy" :alt="siteName" class="h-full w-auto object-contain rounded-lg" />
          <svg v-else class="h-full w-auto" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
          </svg>
        </div>
        <h2 v-if="showLabels" class="text-slate-900 dark:text-slate-100 text-xl font-black leading-tight tracking-tight">{{ siteName }}</h2>
      </RouterLink>
    </div>

    <!-- Toggle Collapse Button centered relative to header -->
    <button @click="toggleSidebar" class="absolute top-9 -right-3.5 size-7 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-primary rounded-full border border-slate-200 dark:border-slate-700 shadow-md transition-all z-50 hover:scale-110">
      <span class="material-symbols-outlined text-[16px]">{{ isCollapsed ? 'chevron_right' : 'chevron_left' }}</span>
    </button>

    <div :class="['mb-6 transition-all', isCollapsed ? 'px-4' : 'px-6']">
      <form v-if="showLabels" @submit.prevent="submitSearch" class="flex flex-col h-11">
        <label class="flex w-full flex-1 items-stretch rounded-xl h-full shadow-sm border border-slate-200 dark:border-slate-800 focus-within:ring-2 ring-primary/50 transition-all">
          <div class="text-slate-400 flex border-none bg-slate-50 dark:bg-slate-900/50 items-center justify-center pl-4 rounded-l-xl">
            <span class="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input v-model="search" type="search" class="flex w-full min-w-0 flex-1 border-none bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-0 h-full placeholder:text-slate-400 px-3 rounded-r-xl text-sm font-normal outline-none" placeholder="Search..." />
        </label>
      </form>
      <button v-else @click="toggleSidebar" class="h-11 w-full rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-primary transition-colors" title="Search">
         <span class="material-symbols-outlined text-[20px]">search</span>
      </button>
    </div>

    <nav :class="['flex flex-col gap-2 flex-1 overflow-y-auto scrollbar-hide', isCollapsed ? 'px-2 items-center' : 'px-4']">
      <RouterLink to="/" :class="['flex items-center gap-4 py-3.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary rounded-xl transition-all text-sm font-bold', isCollapsed ? 'px-0 justify-center w-12' : 'px-4']" exact-active-class="!text-primary !bg-primary/10" title="Home">
        <span class="material-symbols-outlined text-[22px]">home</span>
        <span v-if="showLabels" class="fade-in">Home</span>
      </RouterLink>
      <RouterLink to="/explore" :class="['flex items-center gap-4 py-3.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary rounded-xl transition-all text-sm font-bold', isCollapsed ? 'px-0 justify-center w-12' : 'px-4']" active-class="!text-primary !bg-primary/10" title="Explore">
        <span class="material-symbols-outlined text-[22px]">explore</span>
        <span v-if="showLabels" class="fade-in">Explore</span>
      </RouterLink>
      <RouterLink to="/categories" :class="['flex items-center gap-4 py-3.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary rounded-xl transition-all text-sm font-bold', isCollapsed ? 'px-0 justify-center w-12' : 'px-4']" active-class="!text-primary !bg-primary/10" title="Categories">
        <span class="material-symbols-outlined text-[22px]">category</span>
        <span v-if="showLabels" class="fade-in">Categories</span>
      </RouterLink>
      <RouterLink to="/watchlist" :class="['flex items-center gap-4 py-3.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary rounded-xl transition-all text-sm font-bold', isCollapsed ? 'px-0 justify-center w-12' : 'px-4']" active-class="!text-primary !bg-primary/10" title="Watchlist">
        <span class="material-symbols-outlined text-[22px]">bookmark</span>
        <span v-if="showLabels" class="fade-in">Watchlist</span>
      </RouterLink>

      <div class="h-px bg-slate-200 dark:bg-slate-800 my-4 w-[calc(100%-2rem)] mx-auto shrink-0"></div>

      <button @click="playRandomMovie" :disabled="randomLoading" :class="['flex items-center justify-between py-3.5 rounded-xl bg-primary text-white hover:opacity-90 transition-all shadow-md shadow-primary/20 text-sm font-bold', isCollapsed ? 'px-0 justify-center w-12' : 'px-4']" title="Surprise Me">
        <span class="flex items-center gap-4">
           <span v-if="randomLoading" class="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
           <span v-else class="material-symbols-outlined text-[22px]">casino</span>
           <span v-if="showLabels" class="fade-in">Surprise Me</span>
        </span>
      </button>
    </nav>

    <!-- Footer Profile -->
    <div :class="['border-t border-slate-200 dark:border-slate-800 mt-auto transition-all', isCollapsed ? 'p-4 flex flex-col items-center gap-4' : 'p-6']">
      <div v-if="authStore.isLoggedIn" :class="['flex gap-4 w-full', isCollapsed ? 'flex-col items-center' : 'flex-col']">
         <RouterLink to="/profile" :class="['flex items-center gap-3', isCollapsed ? 'justify-center' : '']" title="Account">
           <img :src="authStore.user?.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuArpztiDc-i31Sjbyh_a4hUf_uwd-DUrj1ZPj1mfPbgVSxqPEvpPq5I_pQlj0ZbPhfU2J5NdmuSCS9IrQ2L5GN6nKoCsbINfvKEbIqQJb8XrLphD0bAPZ5KxPXyE8AqVrmYAZfSDkEenma9NATBYYhBKkHniqEkGbw9R_Ei9FG03U6bC-AVe_luFl7QmWqLw0Gw2h10m6wosBW7GolA4JiAHhmlo6od3g3TlvgGnHGIqYJswJGrxsPjqREaKpMx7StWcSGyYAwZJQ'" class="size-10 rounded-full border border-slate-200 dark:border-slate-700 object-cover shrink-0" />
           <div v-if="showLabels" class="flex-1 min-w-0 fade-in">
             <p class="text-xs text-slate-500 font-medium">Account</p>
             <p class="text-sm font-bold text-slate-900 dark:text-white truncate">{{ profileLabel }}</p>
           </div>
         </RouterLink>
         
         <div :class="['flex w-full', isCollapsed ? 'flex-col gap-2' : 'gap-2 mt-2']">
           <RouterLink to="/pricing" :class="['flex-1 flex items-center justify-center py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary rounded-xl text-slate-700 dark:text-slate-300 transition-colors text-xs font-bold', isCollapsed ? 'size-10 rounded-full p-0 flex-none' : '']" title="VIP Status">
              <span class="material-symbols-outlined text-[20px]">subscriptions</span>
           </RouterLink>
           <button @click="logout" :class="['flex-1 flex items-center justify-center py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-500 hover:text-white rounded-xl text-red-500 transition-colors text-xs font-bold', isCollapsed ? 'size-10 rounded-full p-0 flex-none' : '']" title="Logout">
              <span class="material-symbols-outlined text-[20px]">logout</span>
           </button>
         </div>
      </div>
      <div v-else :class="isCollapsed ? 'flex flex-col items-center' : ''">
         <template v-if="showLabels">
           <p class="text-sm font-bold text-slate-900 dark:text-white mb-1 fade-in">Welcome back</p>
           <p class="text-xs text-slate-500 mb-4 fade-in">Sign in to sync your progress.</p>
         </template>
         <RouterLink to="/login" :class="['flex items-center justify-center bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all', isCollapsed ? 'size-12 rounded-full' : 'w-full rounded-xl h-11']" title="Sign In">
            <span v-if="isCollapsed" class="material-symbols-outlined text-[20px]">login</span>
            <span v-if="showLabels" class="fade-in">Sign In</span>
         </RouterLink>
      </div>
    </div>
  </aside>

</template>


<style scoped>
.fade-in {
  animation: fadeIn 0.15s ease-in-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
