<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  buildPaymentActivity,
  buildPaymentReceipt,
  getPaymentFlow,
  getPaymentHighlights,
  getPaymentMethods
} from '../data/showcase';
import { api, getApiErrorMessage } from '../services/api';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const currentPlan = computed(() => authStore.user?.plan || 'free');

const planRanks = { free: 0, standard: 1, premium: 2, ultimate: 3 };
const currentPlanRank = computed(() => planRanks[currentPlan.value] || 0);

const isAnnual = ref(false);
const showCheckout = ref(false);
const processingPayment = ref(false);
const paymentSuccess = ref(false);
const checkoutError = ref('');
const selectedPlanId = ref('');

const plans = ref({
  standard: { monthly: 0, annual: 0 },
  premium: { monthly: 0, annual: 0 },
  ultimate: { monthly: 0, annual: 0 }
});
const plansLoaded = ref(false);

function isSubscribed(planId) {
  return currentPlanRank.value >= planRanks[planId];
}

function getButtonText(planId) {
  if (currentPlan.value === planId) return 'Gói hiện tại';
  if (currentPlanRank.value > planRanks[planId]) return 'Đã sở hữu';
  return `Chọn gói ${planId.charAt(0).toUpperCase() + planId.slice(1)}`;
}

const checkoutStartDate = computed(() => new Date().toLocaleDateString('vi-VN'));

const checkoutEndDate = computed(() => {
  const date = new Date();
  if (isAnnual.value) date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return date.toLocaleDateString('vi-VN');
});

const planCards = computed(() => [
  {
    id: 'standard',
    label: 'Standard',
    accent: 'slate',
    badge: 'Khởi đầu',
    description: 'Xem phim HD cơ bản cho một thiết bị, phù hợp nhu cầu cá nhân.',
    features: ['720p HD', '1 thiết bị', 'Kho phim cơ bản', 'Streaming ổn định']
  },
  {
    id: 'premium',
    label: 'Premium',
    accent: 'primary',
    badge: 'Phổ biến nhất',
    description: 'Gói cân bằng giữa chất lượng, giá tiền và trải nghiệm không quảng cáo.',
    features: ['1080p Full HD', '2 thiết bị', 'Không quảng cáo', 'Ưu tiên nội dung VIP']
  },
  {
    id: 'ultimate',
    label: 'Ultimate',
    accent: 'amber',
    badge: 'Cao cấp nhất',
    description: 'Toàn bộ trải nghiệm 4K Ultra HD cho người dùng xem phim thường xuyên.',
    features: ['4K Ultra HD', '4 thiết bị', 'Không quảng cáo', 'Quyền lợi xem trước']
  }
]);

const selectedPlan = computed(() => planCards.value.find((plan) => plan.id === selectedPlanId.value) || null);
const selectedPrice = computed(() => {
  const id = selectedPlanId.value;
  if (!id || !plans.value[id]) return 0;
  return isAnnual.value ? plans.value[id].annual : plans.value[id].monthly;
});
const paymentHighlights = computed(() => getPaymentHighlights());
const paymentMethods = computed(() => getPaymentMethods());
const paymentFlow = computed(() => getPaymentFlow());
const paymentActivity = computed(() => buildPaymentActivity(
  planCards.value.map((plan) => ({
    label: plan.label,
    price: isAnnual.value ? plans.value[plan.id].annual : plans.value[plan.id].monthly
  })),
  isAnnual.value
));
const checkoutReceipt = computed(() => buildPaymentReceipt(selectedPlan.value, selectedPrice.value, isAnnual.value));

onMounted(async () => {
  try {
    const res = await api.get('/payment/plans');
    if (res.data?.data) {
      plans.value = res.data.data;
    }
  } catch (err) {
    console.error('Failed to load plans from backend', err);
  } finally {
    plansLoaded.value = true;
  }
});

function formatPrice(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function formatReceiptValue(row) {
  if (row.type === 'money') {
    return Number(row.value) === 0 ? 'Da bao gom' : formatPrice(row.value);
  }

  if (row.type === 'discount') {
    return Number(row.value) > 0 ? `- ${formatPrice(row.value)}` : '0';
  }

  return row.value;
}

function handleSelectPlan(planId) {
  if (!authStore.isLoggedIn) {
    router.push('/login?redirect=/pricing');
    return;
  }

  if (isSubscribed(planId)) return;

  selectedPlanId.value = planId;
  paymentSuccess.value = false;
  checkoutError.value = '';
  showCheckout.value = true;
}

async function processPayment() {
  processingPayment.value = true;
  checkoutError.value = '';

  try {
    const res = await api.post('/payment/checkout', {
      plan: selectedPlanId.value,
      billingCycle: isAnnual.value ? 'annual' : 'monthly'
    });
    const checkoutData = res.data?.data || {};

    if (checkoutData.status === 'redirect' && checkoutData.paymentUrl) {
      window.location.href = checkoutData.paymentUrl;
      return;
    }

    if (checkoutData.status === 'success') {
      paymentSuccess.value = true;
      await authStore.refreshMe();

      window.setTimeout(() => {
        showCheckout.value = false;
        router.push('/profile');
      }, 1500);
      return;
    }

    checkoutError.value = 'Không thể khởi tạo phiên thanh toán.';
  } catch (err) {
    checkoutError.value = getApiErrorMessage(err, 'Thanh toán thất bại');
  } finally {
    processingPayment.value = false;
  }
}
</script>

<template>
  <div class="page-shell">
    <section class="page-hero">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-end">
        <div class="space-y-6">
          <span class="page-kicker">
            <span class="material-symbols-outlined text-base">workspace_premium</span>
            Pricing
          </span>
          <div class="space-y-4">
            <h1 class="page-title">Chọn gói xem phim phù hợp và nâng cấp trực tiếp qua VNPAY.</h1>
            <p class="page-copy">
              Trang gói dịch vụ đã được sắp lại để dễ so sánh lợi ích, rõ giá theo chu kỳ và liền mạch hơn khi chuyển sang bước thanh toán.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-4">
            <div class="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-200" :class="!isAnnual ? 'text-slate-900 dark:text-white' : 'opacity-55'">Hàng tháng</span>
              <button type="button" class="relative h-7 w-14 rounded-full bg-slate-200 dark:bg-slate-700" @click="isAnnual = !isAnnual">
                <span
                  class="absolute top-1/2 size-5 -translate-y-1/2 rounded-full bg-primary transition-transform"
                  :class="isAnnual ? 'translate-x-8' : 'translate-x-1'"
                ></span>
              </button>
              <span class="text-sm font-bold text-slate-700 dark:text-slate-200" :class="isAnnual ? 'text-slate-900 dark:text-white' : 'opacity-55'">
                Hàng năm
              </span>
            </div>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              Tiết kiệm hơn với chu kỳ năm
            </span>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <article class="panel-muted p-5">
            <p class="control-label">Gói hiện tại</p>
            <p class="text-2xl font-black text-slate-900 dark:text-white">{{ currentPlan.toUpperCase() }}</p>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Đồng bộ trực tiếp từ hồ sơ tài khoản.</p>
          </article>
          <article
            v-for="item in paymentHighlights"
            :key="item.label"
            class="panel-muted p-5"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="control-label">{{ item.label }}</p>
                <p class="text-2xl font-black text-slate-900 dark:text-white">{{ item.value }}</p>
              </div>
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <span class="material-symbols-outlined text-[20px]">{{ item.icon }}</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-3">
      <article
        v-for="plan in planCards"
        :key="plan.id"
        class="panel-surface relative overflow-hidden p-6 sm:p-7"
        :class="
          plan.accent === 'primary'
            ? 'ring-2 ring-primary/35 shadow-[0_28px_80px_-42px_rgba(19,91,236,0.55)]'
            : plan.accent === 'amber'
              ? 'bg-slate-950 text-slate-100 dark:bg-slate-950'
              : ''
        "
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <span
              class="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em]"
              :class="
                plan.accent === 'primary'
                  ? 'bg-primary/12 text-primary'
                  : plan.accent === 'amber'
                    ? 'bg-amber-500/18 text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              {{ plan.badge }}
            </span>
            <h2 class="mt-5 text-3xl font-black" :class="plan.accent === 'amber' ? 'text-white' : 'text-slate-900 dark:text-white'">
              {{ plan.label }}
            </h2>
            <p class="mt-3 text-sm leading-6" :class="plan.accent === 'amber' ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'">
              {{ plan.description }}
            </p>
          </div>

          <div
            class="flex h-13 w-13 items-center justify-center rounded-2xl"
            :class="
              plan.accent === 'primary'
                ? 'bg-primary text-white'
                : plan.accent === 'amber'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
            "
          >
            <span class="material-symbols-outlined text-[22px]">workspace_premium</span>
          </div>
        </div>

        <div class="mt-8">
          <p class="text-4xl font-black tracking-tight" :class="plan.accent === 'amber' ? 'text-white' : 'text-slate-900 dark:text-white'">
            {{ formatPrice(isAnnual ? plans[plan.id].annual : plans[plan.id].monthly) }}
          </p>
          <p class="mt-2 text-sm font-semibold" :class="plan.accent === 'amber' ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'">
            {{ isAnnual ? 'Theo năm' : 'Theo tháng' }}
          </p>
        </div>

        <div class="mt-8 space-y-3">
          <div
            v-for="feature in plan.features"
            :key="feature"
            class="flex items-center gap-3 rounded-2xl px-4 py-3"
            :class="plan.accent === 'amber' ? 'bg-white/6 text-slate-200' : 'bg-slate-50 text-slate-700 dark:bg-slate-900/75 dark:text-slate-200'"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full"
              :class="
                plan.accent === 'primary'
                  ? 'bg-primary/12 text-primary'
                  : plan.accent === 'amber'
                    ? 'bg-amber-500/18 text-amber-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              "
            >
              <span class="material-symbols-outlined text-[18px]">check</span>
            </span>
            <span class="text-sm font-bold">{{ feature }}</span>
          </div>
        </div>

        <button
          type="button"
          class="mt-8 w-full rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.18em] transition-all"
          :class="
            isSubscribed(plan.id)
              ? 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              : plan.accent === 'primary'
                ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/92'
                : plan.accent === 'amber'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400'
                  : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
          "
          :disabled="isSubscribed(plan.id) || !plansLoaded"
          @click="handleSelectPlan(plan.id)"
        >
          {{ plansLoaded ? getButtonText(plan.id) : 'Đang tải giá...' }}
        </button>
      </article>
    </section>

    <section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <article class="panel-surface p-6 sm:p-7">
        <div class="section-head">
          <div>
            <h2 class="section-title">Lợi ích sau khi nâng cấp</h2>
            <p class="section-copy">Những quyền lợi chính sẽ được kích hoạt ngay khi backend xác nhận thanh toán.</p>
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <div class="panel-muted p-5">
            <p class="control-label">Truy cập nội dung</p>
            <p class="text-base font-bold text-slate-900 dark:text-white">Mở khóa phim VIP và phim độc quyền</p>
          </div>
          <div class="panel-muted p-5">
            <p class="control-label">Chất lượng</p>
            <p class="text-base font-bold text-slate-900 dark:text-white">HD, Full HD hoặc 4K theo từng gói</p>
          </div>
          <div class="panel-muted p-5">
            <p class="control-label">Thiết bị</p>
            <p class="text-base font-bold text-slate-900 dark:text-white">Số thiết bị xem đồng thời tăng theo gói</p>
          </div>
          <div class="panel-muted p-5">
            <p class="control-label">Đồng bộ hồ sơ</p>
            <p class="text-base font-bold text-slate-900 dark:text-white">Trạng thái gói được cập nhật lại ngay trong client</p>
          </div>
        </div>

        <div class="mt-8 space-y-3">
          <div
            v-for="(step, index) in paymentFlow"
            :key="step.id"
            class="panel-muted flex items-start gap-4 p-4"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-sm font-black text-primary">
              {{ index + 1 }}
            </div>
            <div>
              <p class="text-sm font-black text-slate-900 dark:text-white">{{ step.title }}</p>
              <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{{ step.copy }}</p>
            </div>
          </div>
        </div>
      </article>

      <article class="panel-surface p-6 sm:p-7">
        <div class="section-head">
          <div>
            <h2 class="section-title">Thông tin thanh toán</h2>
            <p class="section-copy">Luồng checkout hiện trả về backend và redirect lại client qua trang thành công hoặc lỗi.</p>
          </div>
        </div>

        <div class="mt-6 space-y-4">
          <div class="status-card status-info">
            <span class="material-symbols-outlined text-[18px]">sync_alt</span>
            <span>Client gọi `/payment/checkout`, sau đó backend điều phối redirect sang VNPAY.</span>
          </div>
          <div class="status-card status-success">
            <span class="material-symbols-outlined text-[18px]">check_circle</span>
            <span>Khi thành công, hồ sơ người dùng sẽ được refresh để hiển thị đúng plan mới.</span>
          </div>
          <div class="status-card status-warning">
            <span class="material-symbols-outlined text-[18px]">payments</span>
            <span>Nếu giao dịch thất bại, không có thay đổi nào được áp dụng cho tài khoản.</span>
          </div>
        </div>

        <div class="mt-8 space-y-3">
          <article
            v-for="method in paymentMethods"
            :key="method.id"
            class="panel-muted flex items-start gap-4 p-4"
          >
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              :class="
                method.accent === 'primary'
                  ? 'bg-primary/12 text-primary'
                  : method.accent === 'amber'
                    ? 'bg-amber-500/12 text-amber-600 dark:text-amber-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              "
            >
              <span class="material-symbols-outlined text-[20px]">{{ method.icon }}</span>
            </div>
            <div>
              <p class="text-sm font-black text-slate-900 dark:text-white">{{ method.title }}</p>
              <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{{ method.note }}</p>
            </div>
          </article>
        </div>

        <div class="mt-8">
          <p class="control-label">Giao dịch gần đây</p>
          <div class="mt-3 space-y-3">
            <article
              v-for="item in paymentActivity"
              :key="item.id"
              class="panel-muted flex items-center justify-between gap-4 p-4"
            >
              <div>
                <p class="text-sm font-black text-slate-900 dark:text-white">{{ item.customer }} nâng cấp {{ item.plan }}</p>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ item.cycle }} • {{ item.time }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-black text-slate-900 dark:text-white">{{ formatPrice(item.amount) }}</p>
                <p class="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">{{ item.status }}</p>
              </div>
            </article>
          </div>
        </div>
      </article>
    </section>

    <div v-if="showCheckout" class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div class="panel-surface w-full max-w-lg overflow-hidden p-6 sm:p-7">
        <div class="section-head">
          <div>
            <h2 class="section-title">Xác nhận thanh toán</h2>
            <p class="section-copy">Kiểm tra lại gói và chu kỳ trước khi chuyển sang VNPAY.</p>
          </div>
          <button
            v-if="!processingPayment && !paymentSuccess"
            type="button"
            class="action-ghost min-w-[48px] px-3"
            @click="showCheckout = false"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div v-if="paymentSuccess" class="mt-6 text-center">
          <div class="mx-auto flex size-18 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <span class="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <h3 class="mt-5 text-2xl font-black text-slate-900 dark:text-white">Thanh toán thành công</h3>
          <p class="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Gói {{ selectedPlan?.label || selectedPlanId }} đã được kích hoạt. Hệ thống đang chuyển bạn về trang hồ sơ.
          </p>
        </div>

        <template v-else>
          <div class="mt-6 rounded-[24px] border border-primary/18 bg-primary/8 p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-black uppercase tracking-[0.2em] text-primary">{{ selectedPlan?.label || selectedPlanId }}</p>
                <p class="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {{ isAnnual ? 'Chu kỳ năm' : 'Chu kỳ tháng' }}
                </p>
              </div>
              <p class="text-2xl font-black text-slate-900 dark:text-white">{{ formatPrice(selectedPrice) }}</p>
            </div>
          </div>

          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <div class="panel-muted p-4">
              <p class="control-label">Bắt đầu</p>
              <p class="text-base font-bold text-slate-900 dark:text-white">{{ checkoutStartDate }}</p>
            </div>
            <div class="panel-muted p-4">
              <p class="control-label">Kết thúc</p>
              <p class="text-base font-bold text-slate-900 dark:text-white">{{ checkoutEndDate }}</p>
            </div>
          </div>

          <div class="mt-5 rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p class="control-label">Receipt preview</p>
            <div class="mt-3 space-y-3">
              <div
                v-for="row in checkoutReceipt"
                :key="row.label"
                class="flex items-center justify-between gap-4 text-sm"
              >
                <span class="text-slate-500 dark:text-slate-400">{{ row.label }}</span>
                <span
                  class="font-bold"
                  :class="row.emphasis ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'"
                >
                  {{ formatReceiptValue(row) }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="checkoutError" class="status-card status-error mt-5">
            <span class="material-symbols-outlined text-[18px]">error</span>
            <span>{{ checkoutError }}</span>
          </div>

          <div class="status-card status-info mt-5">
            <span class="material-symbols-outlined text-[18px]">shield</span>
            <span>Bạn sẽ được chuyển tới cổng VNPAY để hoàn tất giao dịch một cách bảo mật.</span>
          </div>

          <div class="mt-5 flex flex-wrap gap-2">
            <span
              v-for="method in paymentMethods"
              :key="`checkout-${method.id}`"
              class="rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {{ method.title }}
            </span>
          </div>

          <form class="mt-6" @submit.prevent="processPayment">
            <button type="submit" class="action-primary w-full" :disabled="processingPayment || !selectedPlanId">
              <span v-if="processingPayment" class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              <span v-else>Tiếp tục thanh toán qua VNPAY</span>
            </button>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>
