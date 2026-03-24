<script setup>
import { RouterView } from "vue-router";
import AppHeader from "./components/AppHeader.vue";
import AppSidebar from "./components/AppSidebar.vue";
import AppFooter from "./components/AppFooter.vue";
import { useSettingsStore } from "./stores/settings";

const settingsStore = useSettingsStore();
</script>

<template>
  <div class="layout-container flex w-full transition-all" :class="settingsStore.layout === 'side' ? 'flex-col xl:flex-row h-screen overflow-hidden' : 'flex-col min-h-screen'">
    
    <AppHeader v-if="settingsStore.layout === 'top'" />
    <AppHeader v-if="settingsStore.layout === 'side'" class="xl:hidden shrink-0" />
    
    <AppSidebar v-if="settingsStore.layout === 'side'" class="hidden xl:flex" />
    
    <div class="flex-1 flex flex-col min-w-0" :class="settingsStore.layout === 'side' ? 'overflow-y-auto h-full' : 'h-full'">
      <main class="flex-1 px-6 md:px-20 py-8">
        <RouterView />
      </main>
      <AppFooter />
    </div>
  </div>
</template>
