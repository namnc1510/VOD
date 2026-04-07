<script setup>
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const loading = ref(false);
const refreshError = ref('');

const currentPlanLabel = computed(() => {
  const plan = String(authStore.user?.plan || 'vip');
  return plan.toUpperCase();
});

onMounted(async () => {
  if (!authStore.token) return;

  loading.value = true;
  try {
    await authStore.refreshMe();
  } catch (error) {
    console.error('Failed to refresh profile after payment success', error);
    refreshError.value = 'Thanh toan da hoan tat, nhung khong dong bo duoc goi tai khoan. Hay mo trang profile de kiem tra lai.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="page-shell items-center justify-center py-8">
    <article class="page-hero w-full max-w-3xl overflow-hidden">
      <div class="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div class="space-y-5">
          <span class="page-kicker">Payment Success</span>
          <h1 class="page-title max-w-[12ch]">Your subscription is now active.</h1>
          <p class="page-copy">
            The backend has confirmed the VNPAY transaction. Your account is now using the
            <strong class="text-slate-900 dark:text-white">{{ currentPlanLabel }}</strong>
            plan.
          </p>

          <div v-if="loading" class="status-card status-info">
            <span class="material-symbols-outlined animate-spin text-lg">progress_activity</span>
            <span>Syncing your profile with the latest subscription state...</span>
          </div>
          <div v-else-if="refreshError" class="status-card status-warning">
            <span class="material-symbols-outlined text-lg">warning</span>
            <span>{{ refreshError }}</span>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <RouterLink to="/profile" class="action-primary">Open Profile</RouterLink>
            <RouterLink to="/pricing" class="action-secondary">Back to Pricing</RouterLink>
          </div>
        </div>

        <div class="panel-muted flex min-h-[280px] items-center justify-center p-8">
          <div class="text-center">
            <div class="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <span class="material-symbols-outlined text-[42px]">check_circle</span>
            </div>
            <p class="mt-6 text-sm font-black uppercase tracking-[0.32em] text-emerald-600 dark:text-emerald-400">
              Confirmed
            </p>
            <p class="mt-3 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Your upgraded access is ready to use across the client app.
            </p>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
