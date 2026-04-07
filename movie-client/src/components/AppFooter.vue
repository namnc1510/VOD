<script setup>
import { computed } from 'vue';
import { RouterLink } from "vue-router";
import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();
const siteName = computed(() => settingsStore.siteName);
const description = computed(() => settingsStore.description);
const logoUrl = computed(() => settingsStore.resolveAssetUrl(settingsStore.logoUrl));
const year = new Date().getFullYear();
</script>

<template>
  <footer
    class="border-t border-slate-200 bg-white py-12 transition-colors dark:border-slate-800 dark:bg-background-dark"
  >
    <div class="mx-auto flex w-full max-w-[1440px] flex-col justify-between gap-10 px-4 sm:px-6 md:flex-row lg:px-8">
      <div class="flex flex-col gap-4 max-w-sm">
        <div class="flex items-center gap-3 text-primary">
          <div class="size-6 overflow-hidden rounded-md">
            <img v-if="logoUrl" :src="logoUrl" loading="lazy" :alt="siteName" class="w-full h-full object-cover" />
            <svg v-else fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
            </svg>
          </div>
          <h2 class="text-slate-900 dark:text-slate-100 text-lg font-bold">
            {{ siteName }}
          </h2>
        </div>
        <p class="text-slate-500 dark:text-slate-400 text-sm">
          {{ description || 'The best streaming experience for movies and TV series. Unlimited content, high quality, and no hidden fees.' }}
        </p>
      </div>
      <div class="grid grid-cols-2 gap-8 sm:grid-cols-3">
        <div class="flex flex-col gap-4">
          <h4
            class="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider"
          >
            Navigation
          </h4>
          <ul
            class="flex flex-col gap-2 text-sm text-slate-500 dark:text-slate-400"
          >
            <li>
              <RouterLink class="hover:text-primary" to="/">Home</RouterLink>
            </li>
            <li>
              <RouterLink class="hover:text-primary" to="/explore"
                >Explore</RouterLink
              >
            </li>
            <li>
              <RouterLink class="hover:text-primary" to="/categories"
                >Categories</RouterLink
              >
            </li>
            <li>
              <RouterLink class="hover:text-primary" to="/watchlist"
                >Watchlist</RouterLink
              >
            </li>
          </ul>
        </div>
        <div class="flex flex-col gap-4">
          <h4
            class="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider"
          >
            Support
          </h4>
          <ul
            class="flex flex-col gap-2 text-sm text-slate-500 dark:text-slate-400"
          >
            <li><a class="hover:text-primary" href="#">Help Center</a></li>
            <li><a class="hover:text-primary" href="#">Terms of Service</a></li>
            <li><a class="hover:text-primary" href="#">Privacy Policy</a></li>
          </ul>
        </div>
        <div v-if="settingsStore.facebookUrl || settingsStore.twitterUrl || settingsStore.instagramUrl || settingsStore.youtubeUrl" class="flex flex-col gap-4">
          <h4
            class="text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wider"
          >
            Social
          </h4>
          <div class="flex gap-4">
            <a v-if="settingsStore.facebookUrl"
              class="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:-translate-y-1 hover:bg-primary hover:text-white dark:bg-slate-800"
              :href="settingsStore.facebookUrl" target="_blank" rel="noopener noreferrer" title="Facebook"
            >
              <span class="material-symbols-outlined text-[20px]">facebook</span>
            </a>
            <a v-if="settingsStore.twitterUrl"
              class="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:-translate-y-1 hover:bg-primary hover:text-white dark:bg-slate-800"
              :href="settingsStore.twitterUrl" target="_blank" rel="noopener noreferrer" title="Twitter"
            >
              <span class="material-symbols-outlined text-[20px]">alternate_email</span>
            </a>
            <a v-if="settingsStore.instagramUrl"
              class="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:-translate-y-1 hover:bg-primary hover:text-white dark:bg-slate-800"
              :href="settingsStore.instagramUrl" target="_blank" rel="noopener noreferrer" title="Instagram"
            >
              <span class="material-symbols-outlined text-[20px]">photo_camera</span>
            </a>
             <a v-if="settingsStore.youtubeUrl"
              class="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:-translate-y-1 hover:bg-primary hover:text-white dark:bg-slate-800"
              :href="settingsStore.youtubeUrl" target="_blank" rel="noopener noreferrer" title="YouTube"
            >
              <span class="material-symbols-outlined text-[20px]">play_circle</span>
            </a>
          </div>
        </div>
      </div>
    </div>
    <div
      class="mx-auto mt-12 w-full max-w-[1440px] border-t border-slate-200 px-4 pt-8 text-center dark:border-slate-800 sm:px-6 lg:px-8"
    >
      <p class="text-slate-400 text-xs">
        (c) {{ year }} {{ siteName }}. All rights reserved.
      </p>
    </div>
  </footer>
</template>
