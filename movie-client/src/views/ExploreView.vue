<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import MovieCard from '../components/MovieCard.vue';
import { getApiErrorMessage } from '../services/api';
import { getCatalogFilters, getMovies, getPersons } from '../services/discovery';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const filtersLoading = ref(true);
const error = ref('');
const filters = ref({ genres: [], countries: [], years: [], qualities: [], types: [], persons: [] });
const items = ref([]);
const meta = ref({ page: 1, limit: 12, totalPages: 1, total: 0 });
const showMobileFilters = ref(false);

const form = ref({
  search: '',
  genre: '',
  country: '',
  releaseYear: '',
  quality: '',
  type: '',
  actorSlug: '',
  directorSlug: '',
  sort: '-createdAt',
  page: 1,
  limit: 12
});

const hasFilters = computed(() =>
  Boolean(
    form.value.search ||
      form.value.genre ||
      form.value.country ||
      form.value.releaseYear ||
      form.value.quality ||
      form.value.type ||
      form.value.actorSlug ||
      form.value.directorSlug
  )
);

const activeFilterCount = computed(() =>
  [
    form.value.search,
    form.value.genre,
    form.value.country,
    form.value.releaseYear,
    form.value.quality,
    form.value.type,
    form.value.actorSlug,
    form.value.directorSlug
  ].filter(Boolean).length
);

function syncFromRoute() {
  form.value.search = route.query.search || '';
  form.value.genre = route.query.genre || '';
  form.value.country = route.query.country || '';
  form.value.releaseYear = route.query.releaseYear || '';
  form.value.quality = route.query.quality || '';
  form.value.type = route.query.type || '';
  form.value.actorSlug = route.query.actorSlug || '';
  form.value.directorSlug = route.query.directorSlug || '';
  form.value.sort = route.query.sort || '-createdAt';
  form.value.page = Number.parseInt(route.query.page || '1', 10);
}

async function loadFilters() {
  filtersLoading.value = true;

  try {
    const [filterRes, personRes] = await Promise.all([
      getCatalogFilters(),
      getPersons({ limit: 50, sort: '-views' })
    ]);
    filters.value = {
      ...filterRes,
      persons: personRes.items || []
    };
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Không thể tải bộ lọc');
  } finally {
    filtersLoading.value = false;
  }
}

async function loadMovies() {
  loading.value = true;
  error.value = '';

  try {
    const params = {
      search: form.value.search || undefined,
      genre: form.value.genre || undefined,
      country: form.value.country || undefined,
      releaseYear: form.value.releaseYear || undefined,
      quality: form.value.quality || undefined,
      type: form.value.type || undefined,
      actorSlug: form.value.actorSlug || undefined,
      directorSlug: form.value.directorSlug || undefined,
      sort: form.value.sort || undefined,
      page: form.value.page,
      limit: form.value.limit
    };

    const result = await getMovies(params);
    items.value = result.items;
    meta.value = result.meta || meta.value;
  } catch (err) {
    error.value = getApiErrorMessage(err, 'Không thể tải danh sách phim');
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  const query = {
    ...(form.value.search ? { search: form.value.search } : {}),
    ...(form.value.genre ? { genre: form.value.genre } : {}),
    ...(form.value.country ? { country: form.value.country } : {}),
    ...(form.value.releaseYear ? { releaseYear: form.value.releaseYear } : {}),
    ...(form.value.quality ? { quality: form.value.quality } : {}),
    ...(form.value.type ? { type: form.value.type } : {}),
    ...(form.value.actorSlug ? { actorSlug: form.value.actorSlug } : {}),
    ...(form.value.directorSlug ? { directorSlug: form.value.directorSlug } : {}),
    ...(form.value.sort ? { sort: form.value.sort } : {}),
    page: String(form.value.page)
  };

  router.push({ name: 'explore', query });
}

function clearFilters() {
  form.value = {
    search: '',
    genre: '',
    country: '',
    releaseYear: '',
    quality: '',
    type: '',
    actorSlug: '',
    directorSlug: '',
    sort: '-createdAt',
    page: 1,
    limit: 12
  };

  router.push({ name: 'explore' });
}

function changeSort(sort) {
  form.value.sort = sort;
  form.value.page = 1;
  applyFilters();
}

function goPage(offset) {
  const nextPage = Math.max(1, (meta.value.page || 1) + offset);
  if (nextPage > (meta.value.totalPages || 1)) return;
  form.value.page = nextPage;
  applyFilters();
}

watch(
  () => route.query,
  () => {
    syncFromRoute();
    loadMovies();
  },
  { immediate: true }
);

onMounted(loadFilters);
</script>

<template>
  <div class="page-shell">
    <section class="page-hero">
      <div class="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
        <div class="space-y-6">
          <span class="page-kicker">
            <span class="material-symbols-outlined text-base">travel_explore</span>
            Explore
          </span>
          <div class="space-y-4">
            <h1 class="page-title">Tìm phim theo thể loại, diễn viên, năm phát hành và chất lượng.</h1>
            <p class="page-copy">
              Toàn bộ thư viện được gom về một giao diện lọc rõ ràng hơn, giúp bạn tìm nhanh phim đúng gu mà không phải đi qua nhiều màn hình.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="button" class="action-primary lg:hidden" @click="showMobileFilters = !showMobileFilters">
              <span class="material-symbols-outlined text-[18px]">{{ showMobileFilters ? 'close' : 'tune' }}</span>
              {{ showMobileFilters ? 'Ẩn bộ lọc' : 'Mở bộ lọc' }}
            </button>
            <button v-if="hasFilters" type="button" class="action-secondary" @click="clearFilters">
              <span class="material-symbols-outlined text-[18px]">restart_alt</span>
              Xóa bộ lọc
            </button>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <article class="panel-muted p-5">
            <p class="control-label">Kết quả</p>
            <p class="text-3xl font-black text-slate-900 dark:text-white">{{ meta.total || 0 }}</p>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Tổng số phim khớp điều kiện hiện tại.</p>
          </article>
          <article class="panel-muted p-5">
            <p class="control-label">Bộ lọc đang bật</p>
            <p class="text-3xl font-black text-slate-900 dark:text-white">{{ activeFilterCount }}</p>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Tính cả từ khóa tìm kiếm và bộ lọc nâng cao.</p>
          </article>
          <article class="panel-muted p-5">
            <p class="control-label">Trang hiện tại</p>
            <p class="text-3xl font-black text-slate-900 dark:text-white">{{ meta.page || 1 }}</p>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Trên tổng {{ meta.totalPages || 1 }} trang kết quả.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside
        :class="[
          'space-y-5 xl:sticky xl:top-24 xl:self-start',
          showMobileFilters ? 'block' : 'hidden xl:block'
        ]"
      >
        <article class="panel-surface p-5">
          <div class="section-head mb-5">
            <div>
              <h2 class="text-xl font-black text-slate-900 dark:text-white">Sắp xếp</h2>
              <p class="section-copy mt-1 text-sm">Ưu tiên phim mới, phổ biến hoặc rating cao.</p>
            </div>
          </div>

          <div class="grid gap-2">
            <button
              type="button"
              class="flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition-colors"
              :class="form.sort === '-createdAt' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'"
              @click="changeSort('-createdAt')"
            >
              <span>Mới nhất</span>
              <span class="material-symbols-outlined text-[18px]">schedule</span>
            </button>
            <button
              type="button"
              class="flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition-colors"
              :class="form.sort === '-views' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'"
              @click="changeSort('-views')"
            >
              <span>Xem nhiều</span>
              <span class="material-symbols-outlined text-[18px]">trending_up</span>
            </button>
            <button
              type="button"
              class="flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition-colors"
              :class="form.sort === '-imdbRating' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'"
              @click="changeSort('-imdbRating')"
            >
              <span>IMDb cao nhất</span>
              <span class="material-symbols-outlined text-[18px]">star</span>
            </button>
            <button
              type="button"
              class="flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-bold transition-colors"
              :class="form.sort === 'title' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'"
              @click="changeSort('title')"
            >
              <span>A-Z</span>
              <span class="material-symbols-outlined text-[18px]">sort_by_alpha</span>
            </button>
          </div>
        </article>

        <article class="panel-surface p-5">
          <div class="section-head mb-5">
            <div>
              <h2 class="text-xl font-black text-slate-900 dark:text-white">Bộ lọc</h2>
              <p class="section-copy mt-1 text-sm">Lọc nhanh theo metadata chính của phim.</p>
            </div>
            <button type="button" class="text-sm font-bold text-primary hover:underline" @click="clearFilters">Reset</button>
          </div>

          <div class="grid gap-4">
            <label>
              <span class="control-label">Tìm kiếm</span>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  v-model="form.search"
                  type="search"
                  class="control-field pl-12"
                  placeholder="Tên phim, diễn viên..."
                  @keyup.enter="applyFilters"
                />
              </div>
            </label>

            <div v-if="filtersLoading" class="status-card status-info">
              <span class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              <span>Đang tải danh sách bộ lọc...</span>
            </div>

            <template v-else>
              <label>
                <span class="control-label">Thể loại</span>
                <select v-model="form.genre" class="control-field" @change="applyFilters">
                  <option value="">Tất cả thể loại</option>
                  <option v-for="genre in filters.genres" :key="genre" :value="genre">{{ genre }}</option>
                </select>
              </label>

              <label>
                <span class="control-label">Quốc gia</span>
                <select v-model="form.country" class="control-field" @change="applyFilters">
                  <option value="">Tất cả quốc gia</option>
                  <option v-for="country in filters.countries" :key="country" :value="country">{{ country }}</option>
                </select>
              </label>

              <label>
                <span class="control-label">Diễn viên</span>
                <select v-model="form.actorSlug" class="control-field" @change="applyFilters">
                  <option value="">Tất cả diễn viên</option>
                  <option v-for="person in filters.persons" :key="`actor-${person._id}`" :value="person.slug">
                    {{ person.name }}
                  </option>
                </select>
              </label>

              <label>
                <span class="control-label">Đạo diễn</span>
                <select v-model="form.directorSlug" class="control-field" @change="applyFilters">
                  <option value="">Tất cả đạo diễn</option>
                  <option v-for="person in filters.persons" :key="`director-${person._id}`" :value="person.slug">
                    {{ person.name }}
                  </option>
                </select>
              </label>

              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label>
                  <span class="control-label">Năm</span>
                  <select v-model="form.releaseYear" class="control-field" @change="applyFilters">
                    <option value="">Tất cả năm</option>
                    <option v-for="year in filters.years" :key="year" :value="year">{{ year }}</option>
                  </select>
                </label>

                <label>
                  <span class="control-label">Chất lượng</span>
                  <select v-model="form.quality" class="control-field" @change="applyFilters">
                    <option value="">Tất cả</option>
                    <option v-for="quality in filters.qualities" :key="quality" :value="quality">{{ quality }}</option>
                  </select>
                </label>
              </div>

              <label>
                <span class="control-label">Loại nội dung</span>
                <select v-model="form.type" class="control-field" @change="applyFilters">
                  <option value="">Tất cả</option>
                  <option v-for="type in filters.types" :key="type" :value="type">{{ type }}</option>
                </select>
              </label>

              <button type="button" class="action-primary w-full" @click="applyFilters">
                <span class="material-symbols-outlined text-[18px]">filter_alt</span>
                Áp dụng bộ lọc
              </button>
            </template>
          </div>
        </article>
      </aside>

      <div class="space-y-5">
        <div v-if="error" class="status-card status-error">
          <span class="material-symbols-outlined text-[18px]">error</span>
          <span>{{ error }}</span>
        </div>

        <section v-if="loading" class="panel-surface flex min-h-[420px] flex-col items-center justify-center gap-3 p-10 text-center">
          <span class="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          <p class="text-base font-semibold text-slate-600 dark:text-slate-300">Đang tải thư viện phim...</p>
        </section>

        <template v-else>
          <section class="panel-surface p-5 sm:p-6">
            <div class="section-head">
              <div>
                <h2 class="section-title">Kết quả tìm thấy</h2>
                <p class="section-copy">
                  {{ hasFilters ? 'Danh sách đã được lọc theo điều kiện bạn chọn.' : 'Toàn bộ thư viện phim hiện có trên hệ thống.' }}
                </p>
              </div>
              <div class="rounded-full bg-primary/10 px-4 py-2 text-sm font-black text-primary">
                {{ meta.total || 0 }} phim
              </div>
            </div>

            <div v-if="!items.length" class="empty-state mt-6">
              <div class="flex size-18 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <span class="material-symbols-outlined text-4xl">video_search</span>
              </div>
              <h3 class="section-title">Không tìm thấy phim phù hợp.</h3>
              <p class="page-copy text-center">
                Hãy thử đổi từ khóa hoặc bỏ bớt điều kiện lọc để mở rộng kết quả.
              </p>
              <button type="button" class="action-primary" @click="clearFilters">Xóa tất cả bộ lọc</button>
            </div>

            <div v-else class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              <MovieCard v-for="movie in items" :key="movie.id" :movie="movie" :compact="true" />
            </div>
          </section>

          <div v-if="meta.totalPages > 1" class="flex justify-center">
            <nav class="panel-surface flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                class="action-secondary min-w-[48px] px-3"
                :disabled="meta.page <= 1"
                @click="goPage(-1)"
              >
                <span class="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              <div class="px-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                Trang {{ meta.page }} / {{ meta.totalPages }}
              </div>

              <button
                type="button"
                class="action-secondary min-w-[48px] px-3"
                :disabled="meta.page >= meta.totalPages"
                @click="goPage(1)"
              >
                <span class="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </nav>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
