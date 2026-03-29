<script lang="ts">
import { defineComponent, ref, onMounted, computed, watch } from 'vue';
import { EchartsUI } from '@vben/plugins/echarts';
import { getRevenueApi } from '../../api/core/statistics';
import type { RevenueData } from '../../api/core/statistics';
import dayjs from 'dayjs';

export default defineComponent({
  name: 'RevenueChart',
  components: { EchartsUI },
  props: {
    range: {
      type: String,
      default: '30d'
    }
  },
  setup(props) {
    const loading = ref(false);
    const data = ref<RevenueData | null>(null);

    async function fetchRevenue() {
      loading.value = true;
      try {
        const res = await getRevenueApi({ range: props.range || '30d' });
        data.value = res as unknown as RevenueData;
      } catch (error) {
        console.error('Failed to fetch revenue', error);
      } finally {
        loading.value = false;
      }
    }

    watch(() => props.range, () => {
      fetchRevenue();
    });

    onMounted(() => {
      fetchRevenue();
    });

    const chartOptions = computed(() => {
      if (!data.value?.trends?.current?.buckets) return {};

      const currentBuckets = data.value.trends.current.buckets;
      const previousBuckets = data.value.trends.previous?.buckets || {};

      const dates = Object.keys(currentBuckets).sort();
      const currentValues = dates.map(d => currentBuckets[d] || 0);
      const previousValues = dates.map((d, i) => {
        const pDates = Object.keys(previousBuckets).sort();
        return previousBuckets[pDates[i] || ''] || 0;
      });

      return {
        tooltip: {
          trigger: 'axis',
          formatter: function (params: any) {
            let res = `${dayjs(dates[params[0].dataIndex]).format('DD MMM YYYY')}<br/>`;
            params.forEach((item: any) => {
              res += `${item.marker} ${item.seriesName}: $${Number(item.value).toFixed(2)}<br/>`;
            });
            return res;
          }
        },
        legend: {
          data: ['Current Period', 'Previous Period'],
          bottom: 0,
          textStyle: { color: '#94a3b8' }
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '10%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: dates.map(d => dayjs(d).format('DD MMM')),
          axisLine: { lineStyle: { color: '#334155' } },
          axisLabel: { color: '#64748b' }
        },
        yAxis: {
          type: 'value',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
          axisLabel: { color: '#64748b', formatter: '${value}' }
        },
        series: [
          {
            name: 'Current Period',
            type: 'line',
            itemStyle: { color: '#10b981' },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [{
                    offset: 0, color: 'rgba(16, 185, 129, 0.4)'
                }, {
                    offset: 1, color: 'rgba(16, 185, 129, 0)'
                }]
              }
            },
            data: currentValues,
            smooth: true,
          },
          {
            name: 'Previous Period',
            type: 'line',
            itemStyle: { color: '#94a3b8' },
            lineStyle: { type: 'dashed' },
            data: previousValues,
            smooth: true,
          }
        ]
      };
    });

    const totalRevenue = computed(() => data.value?.metrics?.totalRevenue || 0);
    const allTimeRevenue = computed(() => data.value?.metricsAllTime?.totalRevenue || 0);

    function formatCurrency(val: number) {
      return `$${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    return {
      loading,
      data,
      chartOptions,
      totalRevenue,
      allTimeRevenue,
      formatCurrency,
      dayjs
    };
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- KPIS -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div class="absolute -right-6 -top-6 text-emerald-500/10">
          <span class="material-symbols-outlined text-[100px]">payments</span>
        </div>
        <div class="relative">
          <p class="text-sm font-medium text-slate-500 mb-1">Total Revenue (Selected Period)</p>
          <div class="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            {{ formatCurrency(totalRevenue) }}
            <span v-if="loading" class="material-symbols-outlined animate-spin text-sm text-primary">progress_activity</span>
          </div>
        </div>
      </div>
      <div class="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div class="absolute -right-6 -top-6 text-amber-500/10">
          <span class="material-symbols-outlined text-[100px]">account_balance</span>
        </div>
        <div class="relative">
          <p class="text-sm font-medium text-slate-500 mb-1">All-Time Revenue</p>
          <div class="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            {{ formatCurrency(allTimeRevenue) }}
            <span v-if="loading" class="material-symbols-outlined animate-spin text-sm text-primary">progress_activity</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ECHARTS GRAPH -->
    <div class="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-slate-800 dark:text-white">Revenue Growth</h3>
      </div>
      <div class="h-[350px] w-full">
        <EchartsUI v-if="chartOptions.series" :options="chartOptions" style="width: 100%; height: 100%"></EchartsUI>
        <div v-else class="w-full h-full flex items-center justify-center text-slate-400">Loading chart...</div>
      </div>
    </div>

    <!-- RECENT TRANSACTIONS TABLE -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 class="font-bold text-slate-800 dark:text-white">Recent Transactions</h3>
        <span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Live</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
              <th class="px-6 py-4">Transaction ID</th>
              <th class="px-6 py-4">User</th>
              <th class="px-6 py-4">Plan / Cycle</th>
              <th class="px-6 py-4 text-right">Amount</th>
              <th class="px-6 py-4 text-right">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <tr v-for="tx in data?.recentTransactions" :key="tx.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <td class="px-6 py-4 font-mono text-xs text-slate-500">{{ tx.id }}</td>
              <td class="px-6 py-4">
                <div class="font-semibold text-slate-900 dark:text-slate-100">{{ tx.user?.name || 'Anonymous' }}</div>
                <div class="text-xs text-slate-500">{{ tx.user?.email || '-' }}</div>
              </td>
              <td class="px-6 py-4">
                <span class="px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider bg-primary/10 text-primary mr-2">{{ tx.plan }}</span>
                <span class="text-xs text-slate-500 capitalize">{{ tx.cycle }}</span>
              </td>
              <td class="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                {{ formatCurrency(tx.amount) }}
              </td>
              <td class="px-6 py-4 text-right text-slate-500">
                {{ dayjs(tx.createdAt).format('DD MMM YYYY, HH:mm') }}
              </td>
            </tr>
            <tr v-if="!data?.recentTransactions?.length">
              <td colspan="5" class="px-6 py-8 text-center text-slate-500">No recent transactions found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
