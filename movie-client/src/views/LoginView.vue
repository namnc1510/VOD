<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { GoogleLogin } from 'vue3-google-login';

import { getApiErrorMessage } from '../services/api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const mode = ref('login');
const form = ref({
  name: '',
  email: '',
  password: '',
});
const loading = ref(false);
const error = ref('');

async function handleGoogleCallback(response) {
  if (!response?.credential) return;

  loading.value = true;
  error.value = '';

  try {
    await authStore.loginWithGoogle(response.credential);
    await authStore.refreshMe();
    router.push({ name: 'home' });
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Google authentication failed');
  } finally {
    loading.value = false;
  }
}

async function submit() {
  loading.value = true;
  error.value = '';

  try {
    if (mode.value === 'login') {
      await authStore.login({
        email: form.value.email,
        password: form.value.password,
      });
    } else {
      await authStore.register({
        name: form.value.name,
        email: form.value.email,
        password: form.value.password,
      });
    }

    await authStore.refreshMe();
    router.push({ name: 'home' });
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Authentication failed');
  } finally {
    loading.value = false;
  }
}

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  error.value = '';
}
</script>

<template>
  <section class="page-shell items-center justify-center py-6">
    <article class="page-hero w-full max-w-6xl overflow-hidden p-0">
      <div class="grid lg:grid-cols-[1.05fr_0.95fr]">
        <div class="relative overflow-hidden bg-slate-950 px-6 py-10 text-white sm:px-8 lg:px-10">
          <div class="absolute inset-0 opacity-90" style="background-image: linear-gradient(145deg, rgba(19, 91, 236, 0.42), rgba(15, 23, 42, 0.92));"></div>
          <div class="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),transparent_70%)] lg:block"></div>
          <div class="relative z-10 flex h-full flex-col justify-between gap-10">
            <div class="space-y-5">
              <span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.28em] text-sky-100">
                StreamVue Access
              </span>
              <h1 class="text-4xl font-black leading-[0.94] tracking-[-0.05em] sm:text-5xl">
                Watchlists, premium plans, and synced history in one account.
              </h1>
              <p class="max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
                Sign in to keep your progress across devices, unlock subscription features, and manage your movie profile from one place.
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <div class="rounded-3xl border border-white/12 bg-white/8 p-4 backdrop-blur-md">
                <p class="text-2xl font-black">4K</p>
                <p class="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Premium Streams</p>
              </div>
              <div class="rounded-3xl border border-white/12 bg-white/8 p-4 backdrop-blur-md">
                <p class="text-2xl font-black">Sync</p>
                <p class="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Watch Progress</p>
              </div>
              <div class="rounded-3xl border border-white/12 bg-white/8 p-4 backdrop-blur-md">
                <p class="text-2xl font-black">VIP</p>
                <p class="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Plan Management</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white/86 px-6 py-10 dark:bg-slate-950/84 sm:px-8 lg:px-10">
          <div class="mx-auto w-full max-w-md space-y-6">
            <div class="space-y-3">
              <span class="page-kicker">{{ mode === 'login' ? 'Sign In' : 'Create Account' }}</span>
              <h2 class="section-title">
                {{ mode === 'login' ? 'Welcome back.' : 'Create your streaming account.' }}
              </h2>
              <p class="section-copy">
                {{ mode === 'login'
                  ? 'Continue to your profile, watchlist, and premium plan dashboard.'
                  : 'Register once to save progress, comment, and purchase subscription plans.' }}
              </p>
            </div>

            <GoogleLogin :callback="handleGoogleCallback" prompt class="block w-full">
              <button type="button" class="action-secondary flex w-full justify-center gap-3">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" class="size-[18px]" loading="lazy" />
                <span>Continue with Google</span>
              </button>
            </GoogleLogin>

            <div class="flex items-center gap-3 opacity-70">
              <div class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
              <span class="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">or email</span>
              <div class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>

            <form class="space-y-4" @submit.prevent="submit">
              <div v-if="mode === 'register'">
                <label class="control-label">Full Name</label>
                <div class="relative">
                  <span class="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">person</span>
                  <input v-model="form.name" class="control-field pl-11" placeholder="John Doe" type="text" required />
                </div>
              </div>

              <div>
                <label class="control-label">Email</label>
                <div class="relative">
                  <span class="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                  <input v-model="form.email" class="control-field pl-11" placeholder="name@example.com" type="email" required />
                </div>
              </div>

              <div>
                <div class="mb-2 flex items-center justify-between">
                  <label class="control-label mb-0">Password</label>
                  <a v-if="mode === 'login'" href="#" class="text-xs font-bold text-primary hover:underline">Forgot?</a>
                </div>
                <div class="relative">
                  <span class="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                  <input v-model="form.password" class="control-field pl-11" placeholder="Enter your password" type="password" required />
                </div>
              </div>

              <button class="action-primary flex w-full justify-center" :disabled="loading" type="submit">
                <span v-if="loading" class="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                <span>{{ loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account' }}</span>
              </button>
            </form>

            <div v-if="error" class="status-card status-error">
              <span class="material-symbols-outlined text-lg">error</span>
              <span>{{ error }}</span>
            </div>

            <div class="border-t border-slate-200 pt-5 text-sm font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {{ mode === 'login' ? "Don't have an account yet?" : 'Already registered?' }}
              <button class="ml-1 font-bold text-primary hover:underline" @click="toggleMode">
                {{ mode === 'login' ? 'Create one' : 'Sign in instead' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
