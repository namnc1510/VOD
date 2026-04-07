<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { deleteAccount, changePassword, updateProfile } from '../services/auth';
import { getApiErrorMessage } from '../services/api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuArpztiDc-i31Sjbyh_a4hUf_uwd-DUrj1ZPj1mfPbgVSxqPEvpPq5I_pQlj0ZbPhfU2J5NdmuSCS9IrQ2L5GN6nKoCsbINfvKEbIqQJb8XrLphD0bAPZ5KxPXyE8AqVrmYAZfSDkEenma9NATBYYhBKkHniqEkGbw9R_Ei9FG03U6bC-AVe_luFl7QmWqLw0Gw2h10m6wosBW7GolA4JiAHhmlo6od3g3TlvgGnHGIqYJswJGrxsPjqREaKpMx7StWcSGyYAwZJQ';

const profileRefreshError = ref('');

const showPasswordModal = ref(false);
const passForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' });
const passError = ref('');
const passSuccess = ref('');
const passLoading = ref(false);

const showEditModal = ref(false);
const editForm = ref({ name: '', avatarUrl: '' });
const editError = ref('');
const editLoading = ref(false);

const showDeleteModal = ref(false);
const deleteLoading = ref(false);
const deleteError = ref('');

const PRESET_AVATARS = [
  DEFAULT_AVATAR,
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Destiny',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Jack',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver'
];

const currentAvatar = computed(() => authStore.user?.avatarUrl || DEFAULT_AVATAR);

const planName = computed(() => {
  const plan = String(authStore.user?.plan || 'free');
  if (plan === 'free') return 'Free';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
});

const memberSinceText = computed(() => {
  const raw = authStore.user?.createdAt || authStore.user?.updatedAt;
  if (!raw) return 'Chưa có dữ liệu';
  return new Date(raw).toLocaleDateString('vi-VN');
});

const planStartedAtText = computed(() => {
  const start = authStore.user?.planStartedAt || (authStore.user?.plan !== 'free' ? authStore.user?.updatedAt : null);
  if (!start) return 'Chưa kích hoạt';
  return new Date(start).toLocaleDateString('vi-VN');
});

const planExpireText = computed(() => {
  const plan = authStore.user?.plan;
  const expire = authStore.user?.planExpiresAt;
  if (!plan || plan === 'free' || !expire) return 'Không giới hạn';
  return new Date(expire).toLocaleDateString('vi-VN');
});

onMounted(async () => {
  if (!authStore.isLoggedIn) return;

  try {
    await authStore.refreshMe();
  } catch (err) {
    profileRefreshError.value = getApiErrorMessage(err, 'Không thể đồng bộ hồ sơ tài khoản');
  }
});

function openEdit() {
  editForm.value = {
    name: authStore.user?.name || '',
    avatarUrl: authStore.user?.avatarUrl || DEFAULT_AVATAR
  };
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
    editError.value = getApiErrorMessage(err, 'Không thể cập nhật hồ sơ');
  } finally {
    editLoading.value = false;
  }
}

async function submitPasswordChange() {
  passError.value = '';
  passSuccess.value = '';

  if (passForm.value.newPassword !== passForm.value.confirmPassword) {
    passError.value = 'Mật khẩu xác nhận không khớp.';
    return;
  }

  passLoading.value = true;

  try {
    await changePassword({
      oldPassword: passForm.value.oldPassword,
      newPassword: passForm.value.newPassword
    });
    passSuccess.value = 'Đổi mật khẩu thành công.';
    passForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
    window.setTimeout(() => {
      showPasswordModal.value = false;
      passSuccess.value = '';
    }, 1400);
  } catch (err) {
    passError.value = getApiErrorMessage(err, 'Không thể đổi mật khẩu');
  } finally {
    passLoading.value = false;
  }
}

async function confirmDelete() {
  deleteLoading.value = true;
  deleteError.value = '';

  try {
    await deleteAccount();
    authStore.logout();
    router.push('/');
  } catch (err) {
    deleteError.value = getApiErrorMessage(err, 'Không thể xóa tài khoản');
    deleteLoading.value = false;
  }
}
</script>

<template>
  <div class="page-shell">
    <section v-if="!authStore.isLoggedIn" class="empty-state">
      <div class="flex size-18 items-center justify-center rounded-full bg-primary/12 text-primary">
        <span class="material-symbols-outlined text-4xl">account_circle</span>
      </div>
      <h1 class="section-title">Bạn cần đăng nhập để xem hồ sơ.</h1>
      <p class="page-copy text-center">
        Đăng nhập để cập nhật thông tin tài khoản, gói dịch vụ và bảo mật đăng nhập.
      </p>
      <RouterLink to="/login" class="action-primary">
        <span class="material-symbols-outlined text-[18px]">login</span>
        Đi tới đăng nhập
      </RouterLink>
    </section>

    <template v-else>
      <section class="page-hero overflow-hidden">
        <div class="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-end">
          <div class="flex flex-col items-center rounded-[28px] border border-slate-200/80 bg-white/70 p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/65">
            <div class="size-36 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-xl dark:border-slate-800 dark:bg-slate-800">
              <img :src="currentAvatar" :alt="authStore.user?.name || 'Avatar'" class="h-full w-full object-cover" />
            </div>
            <h2 class="mt-5 text-2xl font-black text-slate-900 dark:text-white">{{ authStore.user?.name || 'Cinema member' }}</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ authStore.user?.email }}</p>
            <span class="mt-4 rounded-full bg-primary/12 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-primary">
              {{ planName }}
            </span>
          </div>

          <div class="space-y-6">
            <span class="page-kicker">
              <span class="material-symbols-outlined text-base">manage_accounts</span>
              Profile
            </span>
            <div class="space-y-4">
              <h1 class="page-title">Quản lý tài khoản, bảo mật và gói xem phim trong một trang duy nhất.</h1>
              <p class="page-copy">
                Giao diện hồ sơ đã được gom lại thành các khối rõ ràng hơn để bạn dễ cập nhật tên hiển thị, avatar, mật khẩu và trạng thái gói VIP.
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article class="panel-muted p-5">
                <p class="control-label">Thành viên từ</p>
                <p class="text-lg font-black text-slate-900 dark:text-white">{{ memberSinceText }}</p>
              </article>
              <article class="panel-muted p-5">
                <p class="control-label">Gói hiện tại</p>
                <p class="text-lg font-black text-slate-900 dark:text-white">{{ planName }}</p>
              </article>
              <article class="panel-muted p-5">
                <p class="control-label">Bắt đầu gói</p>
                <p class="text-lg font-black text-slate-900 dark:text-white">{{ planStartedAtText }}</p>
              </article>
              <article class="panel-muted p-5">
                <p class="control-label">Hết hạn</p>
                <p class="text-lg font-black text-slate-900 dark:text-white">{{ planExpireText }}</p>
              </article>
            </div>

            <div class="flex flex-wrap gap-3">
              <button type="button" class="action-primary" @click="openEdit">
                <span class="material-symbols-outlined text-[18px]">edit</span>
                Chỉnh sửa hồ sơ
              </button>
              <button type="button" class="action-secondary" @click="showPasswordModal = true">
                <span class="material-symbols-outlined text-[18px]">password</span>
                Đổi mật khẩu
              </button>
              <RouterLink to="/pricing" class="action-secondary">
                <span class="material-symbols-outlined text-[18px]">workspace_premium</span>
                Quản lý gói
              </RouterLink>
              <button type="button" class="action-danger" @click="showDeleteModal = true">
                <span class="material-symbols-outlined text-[18px]">delete_forever</span>
                Xóa tài khoản
              </button>
            </div>
          </div>
        </div>
      </section>

      <div v-if="profileRefreshError" class="status-card status-warning">
        <span class="material-symbols-outlined text-[18px]">warning</span>
        <span>{{ profileRefreshError }}</span>
      </div>

      <section class="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <article class="panel-surface p-6 sm:p-7">
          <div class="section-head">
            <div>
              <h2 class="section-title">Thông tin tài khoản</h2>
              <p class="section-copy">Tóm tắt dữ liệu chính của tài khoản hiện tại và trạng thái truy cập.</p>
            </div>
          </div>

          <div class="mt-6 grid gap-5 sm:grid-cols-2">
            <div class="panel-muted p-5">
              <p class="control-label">Tên hiển thị</p>
              <p class="text-lg font-bold text-slate-900 dark:text-white">{{ authStore.user?.name || '-' }}</p>
            </div>
            <div class="panel-muted p-5">
              <p class="control-label">Email</p>
              <p class="text-lg font-bold text-slate-900 dark:text-white break-all">{{ authStore.user?.email || '-' }}</p>
            </div>
            <div class="panel-muted p-5">
              <p class="control-label">Vai trò</p>
              <p class="text-lg font-bold text-slate-900 capitalize dark:text-white">{{ authStore.user?.role || 'user' }}</p>
            </div>
            <div class="panel-muted p-5">
              <p class="control-label">Trạng thái VIP</p>
              <p class="text-lg font-bold text-slate-900 dark:text-white">
                {{ authStore.user?.plan && authStore.user.plan !== 'free' ? 'Đang hoạt động' : 'Gói miễn phí' }}
              </p>
            </div>
          </div>
        </article>

        <article class="panel-surface p-6 sm:p-7">
          <div class="section-head">
            <div>
              <h2 class="section-title">Bảo mật & gói dịch vụ</h2>
              <p class="section-copy">Các thao tác thường dùng để quản lý truy cập và quyền lợi xem phim.</p>
            </div>
          </div>

          <div class="mt-6 space-y-4">
            <div class="status-card status-info">
              <span class="material-symbols-outlined text-[18px]">verified_user</span>
              <span>Mật khẩu và hồ sơ tài khoản có thể cập nhật trực tiếp từ trang này.</span>
            </div>
            <div class="status-card status-success">
              <span class="material-symbols-outlined text-[18px]">workspace_premium</span>
              <span>Gói hiện tại: <strong>{{ planName }}</strong>. Bạn có thể nâng cấp hoặc gia hạn bất kỳ lúc nào.</span>
            </div>
            <div class="status-card status-warning">
              <span class="material-symbols-outlined text-[18px]">warning</span>
              <span>Xóa tài khoản là thao tác vĩnh viễn và không thể hoàn tác.</span>
            </div>
          </div>
        </article>
      </section>

      <div v-if="showPasswordModal" class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
        <div class="panel-surface w-full max-w-lg p-6 sm:p-7">
          <div class="section-head">
            <div>
              <h2 class="section-title">Đổi mật khẩu</h2>
              <p class="section-copy">Cập nhật mật khẩu để tăng an toàn cho tài khoản xem phim của bạn.</p>
            </div>
            <button type="button" class="action-ghost min-w-[48px] px-3" @click="showPasswordModal = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div v-if="passError" class="status-card status-error mt-5">
            <span class="material-symbols-outlined text-[18px]">error</span>
            <span>{{ passError }}</span>
          </div>
          <div v-if="passSuccess" class="status-card status-success mt-5">
            <span class="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{{ passSuccess }}</span>
          </div>

          <form class="mt-6 grid gap-4" @submit.prevent="submitPasswordChange">
            <label>
              <span class="control-label">Mật khẩu hiện tại</span>
              <input v-model="passForm.oldPassword" type="password" class="control-field" required />
            </label>
            <label>
              <span class="control-label">Mật khẩu mới</span>
              <input v-model="passForm.newPassword" type="password" class="control-field" required minlength="6" />
            </label>
            <label>
              <span class="control-label">Xác nhận mật khẩu mới</span>
              <input v-model="passForm.confirmPassword" type="password" class="control-field" required minlength="6" />
            </label>
            <button type="submit" class="action-primary mt-2 w-full" :disabled="passLoading">
              <span v-if="passLoading" class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              <span v-else>Lưu mật khẩu mới</span>
            </button>
          </form>
        </div>
      </div>

      <div v-if="showEditModal" class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
        <div class="panel-surface w-full max-w-2xl p-6 sm:p-7">
          <div class="section-head">
            <div>
              <h2 class="section-title">Chỉnh sửa hồ sơ</h2>
              <p class="section-copy">Cập nhật tên hiển thị và chọn avatar phù hợp với tài khoản của bạn.</p>
            </div>
            <button type="button" class="action-ghost min-w-[48px] px-3" @click="showEditModal = false">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div v-if="editError" class="status-card status-error mt-5">
            <span class="material-symbols-outlined text-[18px]">error</span>
            <span>{{ editError }}</span>
          </div>

          <form class="mt-6 grid gap-5" @submit.prevent="submitEdit">
            <label>
              <span class="control-label">Tên hiển thị</span>
              <input v-model="editForm.name" type="text" class="control-field" required />
            </label>

            <div>
              <span class="control-label">Avatar</span>
              <div class="grid grid-cols-3 gap-3 sm:grid-cols-6">
                <button
                  v-for="(avatar, idx) in PRESET_AVATARS"
                  :key="idx"
                  type="button"
                  class="aspect-square overflow-hidden rounded-2xl border-2 transition-all"
                  :class="editForm.avatarUrl === avatar ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-700'"
                  @click="editForm.avatarUrl = avatar"
                >
                  <img :src="avatar" :alt="`Avatar ${idx + 1}`" class="h-full w-full object-cover" />
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row">
              <button type="button" class="action-secondary flex-1" @click="showEditModal = false">Hủy</button>
              <button type="submit" class="action-primary flex-1" :disabled="editLoading">
                <span v-if="editLoading" class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                <span v-else>Lưu thay đổi</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div v-if="showDeleteModal" class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
        <div class="panel-surface w-full max-w-md p-6 text-center sm:p-7">
          <div class="mx-auto flex size-18 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <span class="material-symbols-outlined text-4xl">warning</span>
          </div>
          <h2 class="mt-5 text-2xl font-black text-slate-900 dark:text-white">Xóa tài khoản?</h2>
          <p class="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Hành động này sẽ đăng xuất và xóa toàn bộ dữ liệu tài khoản của bạn khỏi hệ thống.
          </p>

          <div v-if="deleteError" class="status-card status-error mt-5 text-left">
            <span class="material-symbols-outlined text-[18px]">error</span>
            <span>{{ deleteError }}</span>
          </div>

          <div class="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" class="action-secondary flex-1" :disabled="deleteLoading" @click="showDeleteModal = false">Hủy</button>
            <button type="button" class="action-danger flex-1" :disabled="deleteLoading" @click="confirmDelete">
              <span v-if="deleteLoading" class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              <span v-else>Xóa tài khoản</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
