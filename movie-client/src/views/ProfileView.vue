<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { changePassword, updateProfile, deleteAccount } from '../services/auth';
import { getApiErrorMessage } from '../services/api';

const authStore = useAuthStore();
const router = useRouter();

onMounted(() => {
  if (authStore.isLoggedIn) {
    authStore.refreshMe();
  }
});

const showPasswordModal = ref(false);
const passForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' });
const passError = ref('');
const passSuccess = ref('');
const passLoading = ref(false);

async function submitPasswordChange() {
  passError.value = '';
  passSuccess.value = '';
  
  if (passForm.value.newPassword !== passForm.value.confirmPassword) {
    passError.value = 'Mật khẩu mới không khớp (Passwords do not match).';
    return;
  }
  
  passLoading.value = true;
  try {
    await changePassword({ 
      oldPassword: passForm.value.oldPassword, 
      newPassword: passForm.value.newPassword 
    });
    passSuccess.value = 'Đổi mật khẩu thành công! (Password updated)';
    passForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
    setTimeout(() => { showPasswordModal.value = false; passSuccess.value = ''; }, 2000);
  } catch (err) {
    passError.value = getApiErrorMessage(err, 'Đổi mật khẩu thất bại');
  } finally {
    passLoading.value = false;
  }
}

const showEditModal = ref(false);
const editForm = ref({ name: '', avatarUrl: '' });
const editError = ref('');
const editLoading = ref(false);

function openEdit() {
  editForm.value = { name: authStore.user?.name || '', avatarUrl: authStore.user?.avatarUrl || '' };
  editError.value = '';
  showEditModal.value = true;
}

async function submitEdit() {
  editError.value = '';
  editLoading.value = true;
  try {
    const updatedUser = await updateProfile(editForm.value);
    authStore.setSession(authStore.token, updatedUser);
    showEditModal.value = false;
  } catch (err) {
    editError.value = getApiErrorMessage(err, 'Lỗi cập nhật hồ sơ');
  } finally {
    editLoading.value = false;
  }
}

const showDeleteModal = ref(false);
const deleteLoading = ref(false);
const deleteError = ref('');

async function confirmDelete() {
  deleteLoading.value = true;
  deleteError.value = '';
  try {
    await deleteAccount();
    authStore.logout();
    router.push('/');
  } catch (err) {
    deleteError.value = getApiErrorMessage(err, 'Lỗi xóa tài khoản');
    deleteLoading.value = false;
  }
}
const PRESET_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuArpztiDc-i31Sjbyh_a4hUf_uwd-DUrj1ZPj1mfPbgVSxqPEvpPq5I_pQlj0ZbPhfU2J5NdmuSCS9IrQ2L5GN6nKoCsbINfvKEbIqQJb8XrLphD0bAPZ5KxPXyE8AqVrmYAZfSDkEenma9NATBYYhBKkHniqEkGbw9R_Ei9FG03U6bC-AVe_luFl7QmWqLw0Gw2h10m6wosBW7GolA4JiAHhmlo6od3g3TlvgGnHGIqYJswJGrxsPjqREaKpMx7StWcSGyYAwZJQ',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Destiny',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver'
];

const planName = computed(() => {
  const p = authStore.user?.plan;
  if (!p || p === 'free') return 'Gói Cơ Bản (Free)';
  return 'Gói ' + p.charAt(0).toUpperCase() + p.slice(1);
});

const planStartedAtText = computed(() => {
  const start = authStore.user?.planStartedAt || (authStore.user?.plan !== 'free' ? authStore.user?.updatedAt : null);
  if (!start) return '-';
  return new Date(start).toLocaleDateString('vi-VN');
});

const planExpireText = computed(() => {
  const p = authStore.user?.plan;
  const exp = authStore.user?.planExpiresAt;
  if (!p || p === 'free' || !exp) return 'Không giới hạn';
  return new Date(exp).toLocaleDateString('vi-VN');
});
</script>

<template>
  <div class="flex flex-col flex-1 max-w-[1024px] mx-auto w-full px-6 lg:px-20 py-10">
     <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight">Account Profile</h1>
     <div class="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-10 items-start">
        <div class="size-40 rounded-full border-4 border-slate-50 dark:border-slate-800 bg-center bg-cover shrink-0 relative group shadow-inner" :style="{ backgroundImage: `url('${authStore.user?.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuArpztiDc-i31Sjbyh_a4hUf_uwd-DUrj1ZPj1mfPbgVSxqPEvpPq5I_pQlj0ZbPhfU2J5NdmuSCS9IrQ2L5GN6nKoCsbINfvKEbIqQJb8XrLphD0bAPZ5KxPXyE8AqVrmYAZfSDkEenma9NATBYYhBKkHniqEkGbw9R_Ei9FG03U6bC-AVe_luFl7QmWqLw0Gw2h10m6wosBW7GolA4JiAHhmlo6od3g3TlvgGnHGIqYJswJGrxsPjqREaKpMx7StWcSGyYAwZJQ'}')` }">
        </div>
        
        <div class="flex-1 space-y-6 w-full">
           <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
             <div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Full Name</p>
                <p class="text-xl font-bold text-slate-900 dark:text-white border-b border-transparent">{{ authStore.user?.name || 'Alex Johnson' }}</p>
             </div>
             <div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Email Address</p>
                <p class="text-lg text-slate-700 dark:text-slate-300">{{ authStore.user?.email || 'alex.johnson@example.com' }}</p>
             </div>
             <div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Member Since</p>
                <p class="text-lg text-slate-700 dark:text-slate-300">September 2023</p>
             </div>
              <div>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1 mt-1">Gói Tài Khoản</p>
                <div class="flex items-center gap-3 mt-1">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold shadow-sm uppercase tracking-widest">
                    <span class="material-symbols-outlined text-[16px]">workspace_premium</span> {{ planName }}
                  </span>
                </div>
             </div>
             
             <div class="col-span-1 sm:col-span-2" v-if="authStore.user?.plan && authStore.user?.plan !== 'free'">
                <div class="flex flex-wrap gap-8 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Thời gian bắt đầu</p>
                    <p class="text-sm font-bold text-slate-800 dark:text-white">{{ planStartedAtText }}</p>
                  </div>
                  <div>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Thời gian kết thúc</p>
                    <p class="text-sm font-bold text-slate-800 dark:text-white">{{ planExpireText }}</p>
                  </div>
                </div>
             </div>
           </div>
           
           <div class="pt-8 mt-4 border-t border-slate-100 dark:border-slate-800/50 flex flex-col sm:flex-row gap-4">
              <button @click="openEdit" class="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2">
                <span class="material-symbols-outlined text-[20px]">manage_accounts</span>
                Edit Profile
              </button>
              <button @click="showPasswordModal = true" class="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex justify-center items-center gap-2">
                <span class="material-symbols-outlined text-[20px]">password</span>
                Change Password
              </button>
              <button @click="showDeleteModal = true" class="px-6 py-3 border-2 border-red-500/20 text-red-500 rounded-xl font-bold hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-500 transition-all flex justify-center items-center gap-2">
                <span class="material-symbols-outlined text-[20px]">delete_forever</span>
                Delete Account
              </button>
           </div>
        </div>
     </div>

     <!-- Password Modal -->
     <div v-if="showPasswordModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div class="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
         <button @click="showPasswordModal = false" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 dark:bg-slate-800 size-8 rounded-full flex items-center justify-center transition-colors">
           <span class="material-symbols-outlined text-lg">close</span>
         </button>

         <h2 class="text-2xl font-black mb-6 text-slate-900 dark:text-white flex items-center gap-3">
            <span class="material-symbols-outlined text-primary text-3xl">key</span>
            Change Password
         </h2>
         
         <div v-if="passError" class="mb-5 p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-sm border border-red-100 dark:border-red-900/50 flex gap-3 items-start font-medium">
            <span class="material-symbols-outlined shrink-0 text-lg">error</span>
            <span>{{ passError }}</span>
         </div>
         <div v-if="passSuccess" class="mb-5 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm border border-emerald-100 dark:border-emerald-900/50 flex gap-3 items-start font-bold">
            <span class="material-symbols-outlined shrink-0 text-lg">check_circle</span>
            <span>{{ passSuccess }}</span>
         </div>
         
         <form @submit.prevent="submitPasswordChange" class="space-y-4">
           <div>
             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Current Password</label>
             <input v-model="passForm.oldPassword" type="password" required class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none font-medium transition-all shadow-inner">
           </div>
           <div>
             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">New Password</label>
             <input v-model="passForm.newPassword" type="password" required minlength="6" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none font-medium transition-all shadow-inner">
           </div>
           <div>
             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Confirm New Password</label>
             <input v-model="passForm.confirmPassword" type="password" required minlength="6" class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none font-medium transition-all shadow-inner">
           </div>
           
           <div class="pt-4">
              <button type="submit" :disabled="passLoading" class="w-full bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all flex justify-center items-center gap-2">
                <span v-if="passLoading" class="material-symbols-outlined animate-spin">progress_activity</span>
                <span v-else>Update Password</span>
              </button>
           </div>
         </form>
       </div>
     </div>

     <!-- Edit Profile Modal -->
     <div v-if="showEditModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div class="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
         <button @click="showEditModal = false" class="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 dark:bg-slate-800 size-8 rounded-full flex items-center justify-center transition-colors">
           <span class="material-symbols-outlined text-lg">close</span>
         </button>

         <h2 class="text-2xl font-black mb-6 text-slate-900 dark:text-white flex items-center gap-3">
            <span class="material-symbols-outlined text-primary text-3xl">manage_accounts</span>
            Edit Profile
         </h2>
         
         <div v-if="editError" class="mb-5 p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-sm border border-red-100 dark:border-red-900/50 flex gap-3 items-start font-medium">
            <span class="material-symbols-outlined shrink-0 text-lg">error</span>
            <span>{{ editError }}</span>
         </div>
         
         <form @submit.prevent="submitEdit" class="space-y-4">
           <div>
             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
             <input v-model="editForm.name" type="text" required class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white outline-none font-medium transition-all shadow-inner">
           </div>
           
           <div>
             <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">Select Avatar</label>
             <div class="grid grid-cols-3 gap-3">
               <button 
                 type="button" 
                 v-for="(avatar, idx) in PRESET_AVATARS" 
                 :key="idx" 
                 @click="editForm.avatarUrl = avatar"
                 :class="[
                   'size-16 w-full rounded-2xl bg-center bg-cover border-4 transition-all',
                   editForm.avatarUrl === avatar ? 'border-primary shadow-lg scale-105' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 opacity-70 hover:opacity-100'
                 ]"
                 :style="{ backgroundImage: `url('${avatar}')` }"
                 :title="'Avatar ' + (idx + 1)"
               ></button>
             </div>
           </div>
           
           <div class="pt-4 flex gap-3">
              <button type="button" @click="showEditModal = false" class="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
              <button type="submit" :disabled="editLoading" class="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all flex justify-center items-center gap-2">
                <span v-if="editLoading" class="material-symbols-outlined animate-spin">progress_activity</span>
                <span v-else>Save Changes</span>
              </button>
           </div>
         </form>
       </div>
     </div>

     <!-- Delete Account Modal -->
     <div v-if="showDeleteModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
       <div class="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative text-center">
         <div class="mx-auto size-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4">
           <span class="material-symbols-outlined text-3xl">warning</span>
         </div>
         <h2 class="text-2xl font-black mb-2 text-slate-900 dark:text-white text-center">Delete Account?</h2>
         <p class="text-slate-500 dark:text-slate-400 mb-6">Are you sure you want to permanently delete your account? This action cannot be undone.</p>
         
         <div v-if="deleteError" class="mb-5 p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl text-sm border border-red-100 dark:border-red-900/50 text-left flex gap-3 items-start font-medium">
            <span class="material-symbols-outlined shrink-0 text-lg">error</span>
            <span>{{ deleteError }}</span>
         </div>
         
         <div class="flex gap-3">
            <button @click="showDeleteModal = false" :disabled="deleteLoading" class="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
            <button @click="confirmDelete" :disabled="deleteLoading" class="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex justify-center items-center gap-2">
              <span v-if="deleteLoading" class="material-symbols-outlined animate-spin">progress_activity</span>
              <span v-else>Yes, Delete</span>
            </button>
         </div>
       </div>
     </div>

  </div>
</template>
