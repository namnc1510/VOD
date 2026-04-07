<script lang="ts">
import { defineComponent, ref, onMounted, computed, watch, nextTick } from 'vue';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { requestClient } from '#/api/request';
import dayjs from 'dayjs';
import { DatePicker } from 'ant-design-vue';

export default defineComponent({
  name: 'TransactionsDashboard',
  components: { EchartsUI, ARangePicker: DatePicker.RangePicker },
  setup() {
    const loading = ref(false);
    const data = ref<any>(null);
    const dateRange = ref<any>([dayjs().subtract(30, 'day'), dayjs()]);

    const lineChartRef = ref<HTMLElement | null>(null);
    const pieChartRef = ref<HTMLElement | null>(null);
    const { renderEcharts: renderLineChart } = useEcharts(lineChartRef as any);
    const { renderEcharts: renderPieChart } = useEcharts(pieChartRef as any);

    async function fetchAnalytics() {
      loading.value = true;
      try {
        let params = {};
        if (dateRange.value && dateRange.value.length === 2) {
          const start = dateRange.value[0].startOf('day');
          const end = dateRange.value[1].endOf('day');
          params = {
            startDate: start.toISOString(),
            endDate: end.toISOString()
          };
        }
        const res = await requestClient.get('/payment/analytics', { params, responseReturn: 'body' });
        // @ts-ignore
        const body = res || {};
        // @ts-ignore
        data.value = body.data || body;
      } catch (error) {
        console.error('Failed to fetch analytics', error);
      } finally {
        loading.value = false;
      }
    }

    watch(() => dateRange.value, () => {
      fetchAnalytics();
    });

    onMounted(() => {
      fetchAnalytics();
    });

    const summary = computed(() => data.value?.summary || { totalRevenue: 0, totalTransactions: 0 });

    const lineChartOptions = computed<Record<string, any>>(() => {
      if (!data.value?.revenueOverTime || data.value.revenueOverTime.length === 0) return {};
      const arr = data.value.revenueOverTime;
      return {
        tooltip: { trigger: 'axis' as const },
        grid: { left: '1%', right: '3%', bottom: '2%', containLabel: true },
        xAxis: { type: 'category' as const, boundaryGap: false, data: arr.map((item: any) => dayjs(item.date).format('DD MMM')) },
        yAxis: { type: 'value' as const },
        series: [
          {
            name: 'Revenue (VND)',
            type: 'line' as const,
            itemStyle: { color: '#0ea5e9' },
            areaStyle: { opacity: 0.1, color: '#0ea5e9' },
            data: arr.map((item: any) => item.revenue),
            smooth: true,
          }
        ]
      };
    });

    const pieChartOptions = computed<Record<string, any>>(() => {
      if (!data.value?.planDistribution || data.value.planDistribution.length === 0) return {};
      const arr = data.value.planDistribution;
      
      const colorMap: Record<string, string> = {
        ULTIMATE: '#a855f7', // purple-500
        PREMIUM: '#10b981', // emerald-500
        STANDARD: '#64748b' // slate-500
      };

      return {
        tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
        legend: { bottom: '0%', left: 'center' },
        series: [
          {
            name: 'Transactions',
            type: 'pie' as const,
            center: ['50%', '45%'],
            radius: ['45%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' },
            emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
            labelLine: { show: false },
            data: arr.map((item: any) => {
              const name = String(item.name || 'Unknown').toUpperCase();
              return { 
                value: item.count, 
                name,
                itemStyle: { color: colorMap[name] || '#94a3b8' }
              };
            })
          }
        ]
      };
    });

    watch(lineChartOptions, (options) => {
      if (options.series) {
        nextTick(() => {
          renderLineChart(options);
        });
      }
    }, { deep: true, immediate: true });

    watch(pieChartOptions, (options) => {
      if (options.series) {
        nextTick(() => {
          renderPieChart(options);
        });
      }
    }, { deep: true, immediate: true });

    function formatCurrency(val: number) {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    }

    return { loading, data, summary, lineChartOptions, pieChartOptions, formatCurrency, dateRange, dayjs, lineChartRef, pieChartRef };
  }
});
</script>

<template>
  <div class="p-6 md:p-8 space-y-6 bg-slate-50 dark:bg-background-dark/50 min-h-full">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Transactions Dashboard</h1>
        <p class="text-slate-500 text-sm">Overview of revenue and subscription packages.</p>
      </div>
      <div>
        <a-range-picker v-model:value="dateRange" />
      </div>
    </div>

    <!-- KPIS -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div class="absolute -right-4 -top-4 text-emerald-500/10">
          <span class="material-symbols-outlined text-[80px]">payments</span>
        </div>
        <p class="text-sm font-medium text-slate-500 mb-2 uppercase tracking-widest relative">Total Revenue</p>
        <div class="text-3xl font-black text-emerald-600 dark:text-emerald-400 relative">{{ formatCurrency(summary.totalRevenue) }}</div>
      </div>
      <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div class="absolute -right-4 -top-4 text-blue-500/10">
          <span class="material-symbols-outlined text-[80px]">receipt_long</span>
        </div>
        <p class="text-sm font-medium text-slate-500 mb-2 uppercase tracking-widest relative">Total Transactions</p>
        <div class="text-3xl font-black text-blue-600 dark:text-blue-400 relative">{{ summary.totalTransactions }}</div>
      </div>
      <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div class="absolute -right-4 -top-4 text-amber-500/10">
          <span class="material-symbols-outlined text-[80px]">trending_up</span>
        </div>
        <p class="text-sm font-medium text-slate-500 mb-2 uppercase tracking-widest relative">Average Transaction</p>
        <div class="text-3xl font-black text-amber-500 dark:text-amber-400 relative">{{ formatCurrency(summary.totalTransactions ? summary.totalRevenue / summary.totalTransactions : 0) }}</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 class="font-bold text-slate-800 dark:text-white mb-6">Revenue Over Time</h3>
        <div class="h-[300px] w-full">
           <EchartsUI v-show="lineChartOptions.series" ref="lineChartRef" style="width: 100%; height: 100%"></EchartsUI>
           <div v-show="!lineChartOptions.series" class="w-full h-full flex flex-col items-center justify-center text-slate-400">
             <span class="material-symbols-outlined text-4xl mb-2 opacity-50">analytics</span>
             No data available
           </div>
        </div>
      </div>

      <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 class="font-bold text-slate-800 dark:text-white mb-6">Plan Distribution</h3>
        <div class="h-[300px] w-full">
           <EchartsUI v-show="pieChartOptions.series" ref="pieChartRef" style="width: 100%; height: 100%"></EchartsUI>
           <div v-show="!pieChartOptions.series" class="w-full h-full flex flex-col items-center justify-center text-slate-400">
             <span class="material-symbols-outlined text-4xl mb-2 opacity-50">donut_large</span>
             No data available
           </div>
        </div>
      </div>
    </div>
  </div>
</template>
