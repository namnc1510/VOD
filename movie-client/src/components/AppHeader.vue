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
  <header class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-colors dark:border-slate-800/80 dark:bg-background-dark/82">
    <div class="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-6">
      <div class="flex min-w-0 items-center gap-6 lg:gap-10">
        <RouterLink to="/" class="flex min-w-0 items-center gap-3 text-primary">
          <div class="size-8 shrink-0 overflow-hidden rounded-lg">
            <img v-if="logoUrl" :src="logoUrl" loading="lazy" :alt="siteName" class="h-full w-full object-cover" />
            <svg v-else fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
            </svg>
          </div>
          <h2 class="truncate text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">{{ siteName }}</h2>
        </RouterLink>
        <nav class="hidden items-center gap-7 lg:flex">
          <RouterLink to="/" class="text-sm font-medium leading-normal text-slate-600 transition-colors hover:text-primary dark:text-slate-400" exact-active-class="!text-primary font-semibold">Home</RouterLink>
          <RouterLink to="/explore" class="text-sm font-medium leading-normal text-slate-600 transition-colors hover:text-primary dark:text-slate-400" active-class="!text-primary font-semibold">Explore</RouterLink>
          <RouterLink to="/categories" class="text-sm font-medium leading-normal text-slate-600 transition-colors hover:text-primary dark:text-slate-400" active-class="!text-primary font-semibold">Categories</RouterLink>
          <RouterLink to="/watchlist" class="text-sm font-medium leading-normal text-slate-600 transition-colors hover:text-primary dark:text-slate-400" active-class="!text-primary font-semibold">Watchlist</RouterLink>
        </nav>
      </div>

      <div class="flex flex-1 items-center justify-end gap-3">
        <div class="flex flex-1 justify-end lg:hidden">
          <button @click="toggleMobileMenu" class="flex size-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
            <span class="material-symbols-outlined text-2xl">menu</span>
          </button>
        </div>

        <div class="hidden items-center gap-3 lg:flex">
          <form @submit.prevent="submitSearch" class="hidden xl:flex xl:w-[320px] xl:max-w-[360px]">
            <label class="flex h-11 w-full items-stretch overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100/90 shadow-sm transition-colors focus-within:border-primary/40 dark:border-slate-700/80 dark:bg-slate-800/90">
              <div class="flex items-center justify-center pl-4 text-slate-400">
                <span class="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input v-model="search" type="search" class="form-input h-full w-full min-w-0 flex-1 border-none bg-transparent px-4 text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-slate-100" placeholder="Search movies, actors..." />
            </label>
          </form>

          <button @click="playRandomMovie" :disabled="randomLoading" class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm transition-all hover:bg-primary/20" title="Surprise Me">
            <span v-if="randomLoading" class="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            <span v-else class="material-symbols-outlined text-xl">casino</span>
          </button>

          <div v-if="authStore.isLoggedIn" class="relative group ml-1">
            <button class="relative size-11 rounded-full border border-slate-200 bg-center bg-cover outline-none transition-all hover:shadow-md focus:ring-2 focus:ring-primary/50 dark:border-slate-700" :style="{ backgroundImage: `url('${authStore.user?.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuArpztiDc-i31Sjbyh_a4hUf_uwd-DUrj1ZPj1mfPbgVSxqPEvpPq5I_pQlj0ZbPhfU2J5NdmuSCS9IrQ2L5GN6nKoCsbINfvKEbIqQJb8XrLphD0bAPZ5KxPXyE8AqVrmYAZfSDkEenma9NATBYYhBKkHniqEkGbw9R_Ei9FG03U6bC-AVe_luFl7QmWqLw0Gw2h10m6wosBW7GolA4JiAHhmlo6od3g3TlvgGnHGIqYJswJGrxsPjqREaKpMx7StWcSGyYAwZJQ'}')` }"></button>
            <div class="invisible absolute right-0 top-full z-50 w-56 pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
              <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
                <RouterLink to="/profile" class="block border-b border-slate-100 bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-900">
                  <p class="mb-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">Signed in as</p>
                  <p class="truncate text-sm font-bold text-slate-900 dark:text-white">{{ profileLabel }}</p>
                </RouterLink>

                <div class="flex flex-col gap-1 p-2">
                  <RouterLink to="/profile" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50">
                    <span class="material-symbols-outlined text-[20px]">person</span>
                    Account Profile
                  </RouterLink>
                  <RouterLink to="/pricing" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50">
                    <span class="material-symbols-outlined text-[20px]">subscriptions</span>
                    Premium / VIP
                  </RouterLink>

                  <div class="mx-2 my-1 h-px bg-slate-100 dark:bg-slate-700/50"></div>

                  <button @click="logout" class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/10">
                    <span class="material-symbols-outlined text-[20px] text-red-500">logout</span>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="flex gap-3">
            <RouterLink to="/login" class="flex h-11 min-w-[92px] cursor-pointer items-center justify-center rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90">
              <span>Sign In</span>
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="isMobileMenuOpen" class="fixed inset-0 z-[100] flex lg:hidden">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" @click="isMobileMenuOpen = false"></div>
        <div class="animate-slide-in-right relative ml-auto flex h-full w-4/5 max-w-xs flex-col overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900">
          <button @click="isMobileMenuOpen = false" class="absolute right-6 top-6 flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:text-red-500 dark:bg-slate-800">
            <span class="material-symbols-outlined">close</span>
          </button>

          <div class="mb-8 mt-16">
            <form @submit.prevent="submitSearch(); isMobileMenuOpen = false" class="flex h-12 flex-col">
              <label class="flex h-full w-full flex-1 items-stretch rounded-xl shadow-sm">
                <div class="flex items-center justify-center rounded-l-xl bg-slate-100 pl-4 text-slate-400 dark:bg-slate-800">
                  <span class="material-symbols-outlined text-[20px]">search</span>
                </div>
                <input v-model="search" type="search" class="form-input h-full w-full min-w-0 flex-1 rounded-r-xl border-none bg-slate-100 px-4 text-base font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 dark:bg-slate-800 dark:text-slate-100" placeholder="Search movies, actors..." />
              </label>
            </form>
          </div>

          <nav class="flex flex-col gap-2">
            <RouterLink to="/" class="flex items-center gap-4 rounded-xl p-4 text-lg font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" exact-active-class="!text-primary font-bold bg-primary/5">
              <span class="material-symbols-outlined text-2xl">home</span> Home
            </RouterLink>
            <RouterLink to="/explore" class="flex items-center gap-4 rounded-xl p-4 text-lg font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" active-class="!text-primary font-bold bg-primary/5">
              <span class="material-symbols-outlined text-2xl">explore</span> Explore
            </RouterLink>
            <RouterLink to="/categories" class="flex items-center gap-4 rounded-xl p-4 text-lg font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" active-class="!text-primary font-bold bg-primary/5">
              <span class="material-symbols-outlined text-2xl">category</span> Categories
            </RouterLink>
            <RouterLink to="/watchlist" class="flex items-center gap-4 rounded-xl p-4 text-lg font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" active-class="!text-primary font-bold bg-primary/5">
              <span class="material-symbols-outlined text-2xl">bookmark</span> Watchlist
            </RouterLink>
          </nav>

          <div class="mt-auto flex flex-col gap-4 pt-8">
            <div v-if="authStore.isLoggedIn" class="flex flex-col gap-2">
              <RouterLink to="/profile" class="flex items-center gap-4 rounded-xl bg-slate-100 p-4 font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
                <img :src="authStore.user?.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuArpztiDc-i31Sjbyh_a4hUf_uwd-DUrj1ZPj1mfPbgVSxqPEvpPq5I_pQlj0ZbPhfU2J5NdmuSCS9IrQ2L5GN6nKoCsbINfvKEbIqQJb8XrLphD0bAPZ5KxPXyE8AqVrmYAZfSDkEenma9NATBYYhBKkHniqEkGbw9R_Ei9FG03U6bC-AVe_luFl7QmWqLw0Gw2h10m6wosBW7GolA4JiAHhmlo6od3g3TlvgGnHGIqYJswJGrxsPjqREaKpMx7StWcSGyYAwZJQ'" class="size-10 rounded-full border border-slate-300 object-cover dark:border-slate-600" />
                <span>My Account</span>
              </RouterLink>
              <button @click="logout" class="flex items-center gap-4 rounded-xl p-4 font-bold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/10">
                <span class="material-symbols-outlined text-2xl">logout</span> Logout
              </button>
            </div>
            <div v-else>
              <RouterLink to="/login" class="flex items-center justify-center rounded-xl bg-primary p-4 font-bold text-white transition-colors hover:bg-primary/90">
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
