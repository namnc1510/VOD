<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { getApiErrorMessage } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { GoogleLogin } from 'vue3-google-login';

const authStore = useAuthStore();
const router = useRouter();

const mode = ref('login');
const form = ref({
  name: '',
  email: '',
  password: ''
});
const loading = ref(false);
const error = ref('');

async function handleGoogleCallback(response) {
  if (response && response.credential) {
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
}

async function submit() {
  loading.value = true;
  error.value = '';

  try {
    if (mode.value === 'login') {
      await authStore.login({
        email: form.value.email,
        password: form.value.password
      });
    } else {
      await authStore.register({
        name: form.value.name,
        email: form.value.email,
        password: form.value.password
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
</script>

<template>
  <div class="flex flex-col flex-1 items-center justify-center p-4 -mt-8 min-h-[calc(100vh-[header-height]-[footer-height]-2rem)]">
    
    <div class="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div class="flex justify-center mb-6">
        <div class="size-12 bg-primary/10 dark:bg-primary/20 text-primary rounded-xl flex items-center justify-center">
          <span class="material-symbols-outlined text-[24px]">lock</span>
        </div>
      </div>

      <div class="text-center mb-6">
        <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{{ mode === 'login' ? 'Welcome Back' : 'Create Account' }}</h2>
        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">{{ mode === 'login' ? 'Sign in to access your library' : 'Join us to start streaming 4K' }}</p>
      </div>

      <!-- Google Login Button -->
      <GoogleLogin :callback="handleGoogleCallback" prompt class="w-full mb-5">
        <button type="button" class="w-full h-[46px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold rounded-xl shadow-sm transition-all text-[13px] tracking-wide flex justify-center items-center gap-2">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" class="size-[18px]" loading="lazy" />
          <span>Continue with Google</span>
        </button>
      </GoogleLogin>

      <!-- Divider -->
      <div class="flex items-center gap-3 mb-5 opacity-60">
        <div class="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Or email</span>
        <div class="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
      </div>

      <form @submit.prevent="submit" class="flex flex-col gap-4">
        
        <!-- Name Field for Register -->
        <div v-if="mode === 'register'" class="flex flex-col gap-[6px] group animate-in fade-in slide-in-from-top-2 duration-300">
          <label class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Name</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] group-focus-within:text-primary transition-colors">person</span>
            <input v-model="form.name" class="w-full pl-[38px] pr-4 h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium" placeholder="John Doe" type="text" required />
          </div>
        </div>

        <!-- Email Field -->
        <div class="flex flex-col gap-[6px] group">
          <label class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Email</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] group-focus-within:text-primary transition-colors">mail</span>
            <input v-model="form.email" class="w-full pl-[38px] pr-4 h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium" placeholder="name@example.com" type="email" required />
          </div>
        </div>

        <!-- Password Field -->
        <div class="flex flex-col gap-[6px] group">
          <div class="flex justify-between items-center px-1">
            <label class="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Password</label>
            <a v-if="mode === 'login'" class="text-[11px] font-bold text-primary hover:underline" href="#">Forgot?</a>
          </div>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] group-focus-within:text-primary transition-colors">lock</span>
            <input v-model="form.password" class="w-full pl-[38px] pr-4 h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium" placeholder="••••••••" type="password" required />
          </div>
        </div>

        <!-- Submit Button -->
        <button class="w-full h-[46px] mt-1 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all text-[13px] tracking-wide flex justify-center items-center gap-2" :disabled="loading" type="submit">
          <span v-if="loading" class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
          <span>{{ loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account' }}</span>
        </button>
      </form>

      <!-- Error Message -->
      <p v-if="error" class="mt-4 flex items-center justify-center gap-2 text-center text-red-500 text-sm font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50 animate-in fade-in slide-in-from-bottom-2">
        <span class="material-symbols-outlined text-[16px]">error</span>
        <span>{{ error }}</span>
      </p>

      <!-- Toggle Mode Link -->
      <div class="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/50 text-center">
        <p class="text-slate-500 dark:text-slate-400 text-[13px] font-medium">
          {{ mode === 'login' ? "Don't have an account?" : "Already have an account?" }}
          <button @click="mode = mode === 'login' ? 'register' : 'login'; error = ''" class="text-primary font-bold hover:underline transition-colors ml-1 focus:outline-none">
            {{ mode === 'login' ? 'Sign up' : 'Sign in' }}
          </button>
        </p>
      </div>

    </div>
  </div>
</template>
