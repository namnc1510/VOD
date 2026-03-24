import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createHead } from '@vueuse/head';

import App from './App.vue';
import router from './router';
import './style.css';
import { useSettingsStore } from './stores/settings';
import vue3GoogleLogin from 'vue3-google-login';

const app = createApp(App);
const pinia = createPinia();
const head = createHead();
app.use(pinia);
app.use(head);
app.use(router);
app.use(vue3GoogleLogin, {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'PENDING_GOOGLE_CLIENT_ID'
});
useSettingsStore(pinia).init();
app.mount('#app');

