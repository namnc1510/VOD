<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { api, getApiErrorMessage } from '../services/api';

const router = useRouter();
const authStore = useAuthStore();

const currentPlan = computed(() => authStore.user?.plan || 'free');

const planRanks = { free: 0, standard: 1, premium: 2, ultimate: 3 };
const currentPlanRank = computed(() => planRanks[currentPlan.value] || 0);

function isSubscribed(planId) {
  return currentPlanRank.value >= planRanks[planId];
}

function getButtonText(planId) {
  if (currentPlan.value === planId) return 'Current Plan';
  if (currentPlanRank.value > planRanks[planId]) return 'Already Subscribed';
  if (planId === 'premium') return 'Get Premium';
  return `Select ${planId.charAt(0).toUpperCase() + planId.slice(1)}`;
}

const checkoutStartDate = computed(() => {
  return new Date().toLocaleDateString('vi-VN');
});

const checkoutEndDate = computed(() => {
  const d = new Date();
  if (isAnnual.value) {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toLocaleDateString('vi-VN');
});

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
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function handleSelectPlan(planId) {
  if (!authStore.isLoggedIn) {
    router.push('/login?redirect=/pricing');
    return;
  }
  if (isSubscribed(planId)) {
    return;
  }
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
     paymentSuccess.value = true;
     
     // Update user session natively
     if (res.data?.data) {
       authStore.setSession(authStore.token, {
         ...authStore.user,
         plan: res.data.data.plan,
         planStartedAt: res.data.data.planStartedAt,
         planExpiresAt: res.data.data.planExpiresAt
       });
     }

     setTimeout(() => {
       showCheckout.value = false;
       router.push('/profile');
     }, 2000);
  } catch (err) {
     checkoutError.value = getApiErrorMessage(err, 'Payment failed');
  } finally {
     processingPayment.value = false;
  }
}
</script>

<template>
  <div class="relative flex-1 flex flex-col items-center justify-center py-6 px-4 md:px-8 bg-[#F4F7F9] dark:bg-[#0A0E17] min-h-[calc(100vh-[header-height]-[footer-height]-2rem)]">
    <!-- Header -->
    <div class="relative z-10 text-center max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
      
      <!-- Billing Toggle matching image exactly -->
      <div class="flex items-center justify-center gap-3">
        <span :class="['text-[13px] font-black tracking-wide transition-colors', !isAnnual ? 'text-[#2B384A] dark:text-white' : 'text-slate-400']">Monthly</span>
        <button 
          @click="isAnnual = !isAnnual"
          class="relative w-[46px] h-[24px] rounded-full bg-[#E2E8F0] dark:bg-slate-700 transition-colors focus:outline-none"
        >
          <div :class="['absolute top-1/2 -translate-y-1/2 size-4 rounded-full bg-[#C0C86D] transition-transform duration-300 shadow-md', isAnnual ? 'translate-x-[26px]' : 'translate-x-[4px]']"></div>
        </button>
        <span :class="['text-[13px] font-black tracking-wide transition-colors flex items-center gap-2', isAnnual ? 'text-[#2B384A] dark:text-white' : 'text-slate-400']">
          Annually <span class="bg-[#DDF4E4] text-[#2EAI5B] text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest text-[#249553]">Save 20%</span>
        </span>
      </div>
    </div>
    
    <!-- Pricing Cards Grid -->
    <div class="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-5xl mx-auto w-full">
      
      <!-- STANDARD Plan -->
      <div class="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none flex flex-col">
         <h3 class="text-xl font-black text-[#3F4B5B] dark:text-white mb-3 uppercase tracking-widest">Standard</h3>
         <p class="text-[#7A8A9E] mb-6 text-[13px] leading-relaxed font-bold">720p resolution. Good for mobile devices and small screens.</p>
         <div class="text-[36px] font-black text-[#2B384A] dark:text-white mb-8 tracking-tight whitespace-nowrap">
            {{ isAnnual ? formatPrice(plans.standard.annual) : formatPrice(plans.standard.monthly) }}
            <span class="text-[12px] text-[#7A8A9E] font-bold ml-1">{{ isAnnual ? '/năm' : '/tháng' }}</span>
         </div>
         <ul class="space-y-4 mb-8 flex-1 text-[#3F4B5B] dark:text-slate-300 font-bold text-[13px]">
            <li class="flex items-center gap-3"><span class="flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[#10B981] text-[#10B981]"><span class="material-symbols-outlined text-[14px] font-black">check</span></span> 720p HD Quality</li>
            <li class="flex items-center gap-3"><span class="flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[#10B981] text-[#10B981]"><span class="material-symbols-outlined text-[14px] font-black">check</span></span> Watch on 1 Device</li>
            <li class="flex items-center gap-3 text-[#B0BCC9]"><span class="flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[#E2E8F0] text-[#E2E8F0]"><span class="material-symbols-outlined text-[14px] font-black">close</span></span> Ad-free viewing</li>
            <li class="flex items-center gap-3 text-[#B0BCC9]"><span class="flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[#E2E8F0] text-[#E2E8F0]"><span class="material-symbols-outlined text-[14px] font-black">close</span></span> 4K Ultra HD</li>
         </ul>
         <button @click="handleSelectPlan('standard')" :disabled="isSubscribed('standard')" :class="[isSubscribed('standard') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#E5E7EB] dark:hover:bg-slate-700']" class="w-full py-4 rounded-xl bg-[#F4F7F9] dark:bg-slate-800 text-[#1F2937] dark:text-white font-black uppercase tracking-widest transition-colors text-xs">{{ getButtonText('standard') }}</button>
      </div>

      <!-- PREMIUM Plan -->
      <div class="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border-[3px] border-[#C0C86D] shadow-[0_20px_50px_rgba(192,200,109,0.15)] flex flex-col relative transform lg:-translate-y-2">
         <!-- Most Popular Pill -->
         <div class="absolute -top-[14px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#C0C86D] to-[#E3EABC] text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Most Popular</div>
         
         <h3 class="text-xl font-black text-[#A5B345] mb-3 uppercase tracking-widest">Premium</h3>
         <p class="text-[#7A8A9E] mb-6 text-[13px] leading-relaxed font-bold">1080p resolution. Best value for everyday home viewing.</p>
         <div class="text-[36px] font-black text-[#2B384A] dark:text-white mb-8 tracking-tight whitespace-nowrap">
            {{ isAnnual ? formatPrice(plans.premium.annual) : formatPrice(plans.premium.monthly) }}
            <span class="text-[12px] text-[#7A8A9E] font-bold ml-1">{{ isAnnual ? '/năm' : '/tháng' }}</span>
         </div>
         <ul class="space-y-4 mb-8 flex-1 text-[#3F4B5B] dark:text-slate-300 font-bold text-[13px]">
            <li class="flex items-center gap-3"><span class="flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[#D4DC8A] text-[#C0C86D]"><span class="material-symbols-outlined text-[14px] font-black text-[#C0C86D]">check</span></span> 1080p Full HD Quality</li>
            <li class="flex items-center gap-3"><span class="flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[#D4DC8A] text-[#C0C86D]"><span class="material-symbols-outlined text-[14px] font-black text-[#C0C86D]">check</span></span> Watch on 2 Devices</li>
            <li class="flex items-center gap-3"><span class="flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[#D4DC8A] text-[#C0C86D]"><span class="material-symbols-outlined text-[14px] font-black text-[#C0C86D]">check</span></span> Ad-free experience</li>
            <li class="flex items-center gap-3 text-[#B0BCC9]"><span class="flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[#E2E8F0] text-[#E2E8F0]"><span class="material-symbols-outlined text-[14px] font-black">close</span></span> 4K Ultra HD</li>
         </ul>
         <button @click="handleSelectPlan('premium')" :disabled="isSubscribed('premium')" :class="[isSubscribed('premium') ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90']" class="w-full py-4 rounded-xl bg-gradient-to-r from-[#BBC55E] to-[#E3EABC] text-white font-black uppercase tracking-widest transition-all text-xs shadow-md">{{ getButtonText('premium') }}</button>
      </div>

      <!-- ULTIMATE Plan -->
      <div class="bg-[#111621] p-8 rounded-[2rem] shadow-2xl flex flex-col relative overflow-hidden">
         <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-[#FF9900]/5 pointer-events-none"></div>
         <h3 class="text-xl font-black text-[#FF9E0D] mb-3 uppercase tracking-widest relative z-10">Ultimate</h3>
         <p class="text-[#899AB0] mb-6 text-[13px] leading-relaxed font-bold relative z-10">4K Ultra HD. The absolute ultimate home theater experience.</p>
         <div class="text-[36px] font-black text-white mb-8 tracking-tight whitespace-nowrap relative z-10">
            {{ isAnnual ? formatPrice(plans.ultimate.annual) : formatPrice(plans.ultimate.monthly) }}
            <span class="text-[12px] text-[#899AB0] font-bold ml-1">{{ isAnnual ? '/năm' : '/tháng' }}</span>
         </div>
         <ul class="space-y-4 mb-8 flex-1 text-[#D1DBE6] font-bold text-[13px] relative z-10">
            <li class="flex items-center gap-3"><span class="flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[#FF9E0D] text-[#FF9E0D]"><span class="material-symbols-outlined text-[14px] font-black">check</span></span> 4K Ultra HD + HDR</li>
            <li class="flex items-center gap-3"><span class="flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[#FF9E0D] text-[#FF9E0D]"><span class="material-symbols-outlined text-[14px] font-black">check</span></span> Watch on 4 Devices</li>
            <li class="flex items-center gap-3"><span class="flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[#FF9E0D] text-[#FF9E0D]"><span class="material-symbols-outlined text-[14px] font-black">check</span></span> Ad-free experience</li>
            <li class="flex items-center gap-3"><span class="flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-[#FF9E0D] text-[#FF9E0D]"><span class="material-symbols-outlined text-[14px] font-black">check</span></span> Offline downloads</li>
         </ul>
         <button @click="handleSelectPlan('ultimate')" :disabled="isSubscribed('ultimate')" :class="[isSubscribed('ultimate') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#F29306] shadow-[#FF9E0D]/20 shadow-lg']" class="w-full py-4 rounded-xl bg-[#FF9E0D] text-[#111621] font-black uppercase tracking-widest transition-all relative z-10 text-xs">{{ getButtonText('ultimate') }}</button>
      </div>
    </div>

    <!-- Mock Checkout Modal -->
    <div v-if="showCheckout" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in max-h-screen overflow-y-auto">
      <div class="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-auto">
        <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
           <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">credit_card</span>
              Secure Checkout
           </h3>
           <button v-if="!processingPayment && !paymentSuccess" @click="showCheckout = false" class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
             <span class="material-symbols-outlined">close</span>
           </button>
        </div>
        
        <div class="p-6">
           <div v-if="paymentSuccess" class="py-8 text-center flex flex-col items-center">
              <div class="size-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4 animate-[bounce_1s_ease-in-out]">
                 <span class="material-symbols-outlined text-3xl font-bold">check</span>
              </div>
              <h4 class="text-xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful!</h4>
              <p class="text-slate-500 dark:text-slate-400">Your account has been upgraded to {{ selectedPlanId.toUpperCase() }}. Redirecting...</p>
           </div>
           
           <div v-else>
               <div class="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4 flex justify-between tracking-tight text-slate-800 dark:text-white">
                 <div>
                    <div class="font-bold uppercase tracking-widest text-xs text-primary mb-1">{{ selectedPlanId }} Plan</div>
                    <div class="text-sm font-semibold opacity-80">{{ isAnnual ? 'Annual Billing' : 'Monthly Billing' }}</div>
                 </div>
                 <div class="text-right">
                    <div class="text-2xl font-black">${{ isAnnual ? plans[selectedPlanId].annual : plans[selectedPlanId].monthly }}</div>
                 </div>
               </div>

               <div class="mb-6 flex justify-between text-sm px-2">
                 <div>
                   <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Thời gian bắt đầu</div>
                   <div class="font-bold text-slate-800 dark:text-white">{{ checkoutStartDate }}</div>
                 </div>
                 <div class="text-right">
                   <div class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Thời gian kết thúc</div>
                   <div class="font-bold text-slate-800 dark:text-white">{{ checkoutEndDate }}</div>
                 </div>
               </div>

               <div class="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-100 p-4 rounded-xl text-sm leading-relaxed mb-6 font-medium border border-blue-100 dark:border-blue-800 text-center">
                  Bạn đang chuẩn bị nâng cấp gói xem phim <strong>{{ selectedPlanId.toUpperCase() }}</strong> bằng thẻ VNPAY.<br/>
                  Vui lòng kiểm tra kỹ thông tin trước khi thanh toán.
               </div>

               <form @submit.prevent="processPayment" class="space-y-4">
                 <div v-if="checkoutError" class="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg text-sm font-bold border border-red-200 dark:border-red-900/50 flex items-center gap-2">
                    <span class="material-symbols-outlined text-lg">error</span> {{ checkoutError }}
                 </div>

                 <div class="pt-4">
                    <button type="submit" :disabled="processingPayment" class="w-full py-3.5 rounded-xl bg-primary text-white font-bold tracking-wide hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center shadow-lg shadow-primary/20">
                       <span v-if="processingPayment" class="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                       {{ processingPayment ? 'Đang thanh toán bằng VNPAY...' : 'Thanh Toán Ngay qua VNPAY' }}
                    </button>
                 </div>
              </form>
              <p class="text-[11px] text-center text-slate-400 mt-4 leading-relaxed font-medium">
                 Giao dịch trực tiếp với hệ thống Backend thông qua API VNPAY đã được cấu hình. Cảm ơn bạn.
              </p>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>
