<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { requestClient } from '#/api/request';
import { message } from 'ant-design-vue';

const plans = ref({
  standard: { monthly: 0, annual: 0 },
  premium: { monthly: 0, annual: 0 },
  ultimate: { monthly: 0, annual: 0 }
});
const loading = ref(false);
const saving = ref(false);

async function fetchPlans() {
  loading.value = true;
  try {
    const res = await requestClient.get('/payment/plans', { responseReturn: 'body' });
    // @ts-ignore
    const body = res || {};
    // @ts-ignore
    plans.value = body.data || body || plans.value;
  } catch (error) {
    message.error('Failed to load pricing plans');
  } finally {
    loading.value = false;
  }
}

async function savePlans() {
  saving.value = true;
  try {
    await requestClient.put('/payment/plans', plans.value);
    message.success('Pricing plans updated successfully');
  } catch (error) {
    message.error('Failed to update pricing plans');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  fetchPlans();
});
</script>

<template>
  <div class="p-6 md:p-8 space-y-6 bg-slate-50 dark:bg-background-dark/50 min-h-full">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Subscription Pricing</h1>
      <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage the monthly and annual prices for streaming packages.</p>
    </div>

    <div v-if="loading" class="py-12 flex justify-center"><span class="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span></div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Standard -->
      <div class="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-widest">Standard</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monthly Price (VND)</label>
            <input type="number" v-model.number="plans.standard.monthly" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-900 dark:text-white" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Annual Price (VND)</label>
            <input type="number" v-model.number="plans.standard.annual" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-900 dark:text-white" />
          </div>
        </div>
      </div>

      <!-- Premium -->
      <div class="bg-white dark:bg-slate-900 p-6 rounded-xl border-2 border-primary/30 shadow-md transform md:-translate-y-2">
        <h2 class="text-lg font-bold text-primary mb-4 uppercase tracking-widest">Premium</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monthly Price (VND)</label>
            <input type="number" v-model.number="plans.premium.monthly" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-900 dark:text-white" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Annual Price (VND)</label>
            <input type="number" v-model.number="plans.premium.annual" class="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-900 dark:text-white" />
          </div>
        </div>
      </div>

      <!-- Ultimate -->
      <div class="bg-slate-900 dark:bg-slate-800 p-6 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
        <h2 class="text-lg font-bold text-amber-500 mb-4 uppercase tracking-widest">Ultimate</h2>
        <div class="space-y-4 relative z-10">
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Monthly Price (VND)</label>
            <input type="number" v-model.number="plans.ultimate.monthly" class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">Annual Price (VND)</label>
            <input type="number" v-model.number="plans.ultimate.annual" class="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-white" />
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
      <button @click="savePlans" :disabled="loading || saving" class="px-6 py-2.5 bg-primary text-white font-medium rounded-lg shadow hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
        <span v-if="saving" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
        {{ saving ? 'Saving...' : 'Save Pricing Plans' }}
      </button>
    </div>
  </div>
</template>
