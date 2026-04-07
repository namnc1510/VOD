<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import MovieCard from '../components/MovieCard.vue';
import { getApiErrorMessage } from '../services/api';
import { getPersonBySlug } from '../services/discovery';

const route = useRoute();
const person = ref(null);
const loading = ref(true);
const error = ref('');

async function loadPerson() {
  loading.value = true;
  error.value = '';

  try {
    const slug = route.params.slug;
    person.value = await getPersonBySlug(slug);
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Không thể tải thông tin nghệ sĩ');
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'Chưa có dữ liệu';
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

watch(() => route.params.slug, loadPerson);
onMounted(loadPerson);
</script>

<template>
  <div class="page-shell">
    <section v-if="loading" class="panel-surface flex min-h-[420px] flex-col items-center justify-center gap-3 p-10 text-center">
      <span class="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      <p class="text-base font-semibold text-slate-600 dark:text-slate-300">Đang tải hồ sơ nghệ sĩ...</p>
    </section>

    <div v-else-if="error" class="status-card status-error">
      <span class="material-symbols-outlined text-[18px]">error</span>
      <span>{{ error }}</span>
    </div>

    <template v-else-if="person">
      <section class="page-hero overflow-hidden">
        <div class="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-end">
          <div class="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/70 shadow-sm dark:border-slate-800 dark:bg-slate-900/65">
            <div class="aspect-[3/4] bg-slate-100 dark:bg-slate-800">
              <img
                v-if="person.avatarUrl"
                :src="person.avatarUrl"
                :alt="person.name"
                class="h-full w-full object-cover"
              />
              <div v-else class="flex h-full items-center justify-center text-slate-400 dark:text-slate-500">
                <span class="material-symbols-outlined text-8xl">person</span>
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <span class="page-kicker">
              <span class="material-symbols-outlined text-base">theater_comedy</span>
              Cast & Crew
            </span>
            <div class="space-y-4">
              <h1 class="page-title">{{ person.name }}</h1>
              <p class="page-copy">
                {{ person.biography || `Hiện chưa có tiểu sử chi tiết cho ${person.name}.` }}
              </p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article class="panel-muted p-5">
                <p class="control-label">Vai trò</p>
                <p class="text-lg font-black capitalize text-slate-900 dark:text-white">{{ person.knownFor || 'N/A' }}</p>
              </article>
              <article class="panel-muted p-5">
                <p class="control-label">Ngày sinh</p>
                <p class="text-lg font-black text-slate-900 dark:text-white">{{ formatDate(person.birthDate) }}</p>
              </article>
              <article class="panel-muted p-5">
                <p class="control-label">Giới tính</p>
                <p class="text-lg font-black text-slate-900 dark:text-white">{{ person.gender || 'N/A' }}</p>
              </article>
              <article class="panel-muted p-5">
                <p class="control-label">Quốc tịch / Nơi sinh</p>
                <p class="text-lg font-black text-slate-900 dark:text-white">{{ person.placeOfBirth || person.nationality || 'N/A' }}</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_360px]">
        <article class="panel-surface p-6 sm:p-7">
          <div class="section-head">
            <div>
              <h2 class="section-title">Tiểu sử</h2>
              <p class="section-copy">Thông tin chi tiết hơn về nghệ sĩ và vai trò trong thư viện phim.</p>
            </div>
          </div>

          <p class="mt-6 text-base leading-8 text-slate-600 dark:text-slate-300 whitespace-pre-line">
            {{ person.biography || `Hiện chưa có dữ liệu tiểu sử cho ${person.name}.` }}
          </p>
        </article>

        <article class="panel-surface p-6 sm:p-7">
          <div class="section-head">
            <div>
              <h2 class="section-title">Thông tin nhanh</h2>
              <p class="section-copy">Một số metadata cơ bản để đọc nhanh ngay trong sidebar.</p>
            </div>
          </div>

          <div class="mt-6 space-y-4">
            <div class="status-card status-info">
              <span class="material-symbols-outlined text-[18px]">movie</span>
              <span>{{ person.movies?.length || 0 }} phim liên quan hiện có trong thư viện.</span>
            </div>
            <div class="status-card status-success">
              <span class="material-symbols-outlined text-[18px]">visibility</span>
              <span>{{ person.views || 0 }} lượt xem hồ sơ đã được ghi nhận.</span>
            </div>
          </div>
        </article>
      </section>

      <section class="space-y-5">
        <div class="section-head">
          <div>
            <h2 class="section-title">Filmography</h2>
            <p class="section-copy">Danh sách các phim liên quan được hiển thị theo cùng nhịp grid với phần còn lại của client.</p>
          </div>
          <div class="rounded-full bg-primary/10 px-4 py-2 text-sm font-black text-primary">
            {{ person.movies?.length || 0 }} phim
          </div>
        </div>

        <div v-if="person.movies?.length" class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <MovieCard
            v-for="movie in person.movies"
            :key="movie._id || movie.id"
            :movie="movie"
            :compact="true"
          />
        </div>

        <div v-else class="empty-state">
          <div class="flex size-18 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <span class="material-symbols-outlined text-4xl">search_off</span>
          </div>
          <h3 class="section-title">Chưa có phim liên quan.</h3>
          <p class="page-copy text-center">Hệ thống hiện chưa gắn phim nào với hồ sơ nghệ sĩ này.</p>
        </div>
      </section>
    </template>
  </div>
</template>
