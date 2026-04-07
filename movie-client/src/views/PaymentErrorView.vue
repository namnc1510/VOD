<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const errorCode = computed(() => {
  const status = route.query.status || route.query.error;
  return status ? String(status) : 'unknown';
});
</script>

<template>
  <section class="page-shell items-center justify-center py-8">
    <article class="page-hero w-full max-w-3xl overflow-hidden">
      <div class="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div class="space-y-5">
          <span class="page-kicker">Payment Failed</span>
          <h1 class="page-title max-w-[12ch]">This transaction was not completed.</h1>
          <p class="page-copy">
            VNPAY did not confirm the order. You can return to the pricing page and retry the purchase flow.
          </p>

          <div class="status-card status-error">
            <span class="material-symbols-outlined text-lg">cancel</span>
            <span>Status code: <strong class="uppercase">{{ errorCode }}</strong></span>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <RouterLink to="/pricing" class="action-primary">Try Again</RouterLink>
            <RouterLink to="/profile" class="action-secondary">Open Profile</RouterLink>
          </div>
        </div>

        <div class="panel-muted flex min-h-[280px] items-center justify-center p-8">
          <div class="text-center">
            <div class="mx-auto flex size-20 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <span class="material-symbols-outlined text-[42px]">cancel</span>
            </div>
            <p class="mt-6 text-sm font-black uppercase tracking-[0.32em] text-rose-600 dark:text-rose-400">
              Declined
            </p>
            <p class="mt-3 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              No subscription change has been applied to your account.
            </p>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
