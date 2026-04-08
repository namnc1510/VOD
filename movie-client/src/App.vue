<script setup>
import { RouterView } from "vue-router";
import AppHeader from "./components/AppHeader.vue";
import AppSidebar from "./components/AppSidebar.vue";
import AppFooter from "./components/AppFooter.vue";
import { useSettingsStore } from "./stores/settings";

const settingsStore = useSettingsStore();
</script>

<template>
  <div
    class="layout-container flex w-full bg-slate-50 text-slate-900 transition-colors dark:bg-background-dark dark:text-slate-100"
    :class="settingsStore.layout === 'side' ? 'h-screen flex-col overflow-hidden xl:flex-row' : 'min-h-screen flex-col'"
  >
    
    <AppHeader v-if="settingsStore.layout === 'top'" />
    <AppHeader v-if="settingsStore.layout === 'side'" class="xl:hidden shrink-0" />
    
    <AppSidebar v-if="settingsStore.layout === 'side'" class="hidden xl:flex" />
    
    <div class="flex-1 flex min-w-0 flex-col" :class="settingsStore.layout === 'side' ? 'h-full overflow-y-auto' : 'h-full'">
      <main class="flex-1">
        <div
          :class="settingsStore.layout === 'top'
            ? 'mx-auto w-full max-w-[1240px] px-4 pb-12 pt-4 sm:px-5 lg:px-6 lg:pt-5'
            : 'w-full px-4 pb-12 pt-4 md:px-5 xl:px-6'"
        >
          <RouterView />
        </div>
      </main>
      <AppFooter />
    </div>
  </div>
</template>
