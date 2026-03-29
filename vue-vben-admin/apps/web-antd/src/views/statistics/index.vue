<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { DatePicker, message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { requestClient } from '../../api/request';
import { $t } from '../../locales';
// @ts-ignore: Vetur(1192) incorrect error on Vue 3 SFC
import RevenueChart from './RevenueChart.vue';

type RangeKey = 'today' | '7d' | '30d' | 'custom';

type TrendRange = {
  from: string;
  to: string;
  buckets: Record<string, number>;
};

type TrendsPayload = {
  timezone?: string;
  current: TrendRange;
  previous: TrendRange;
};

type MetricsPayload = {
  totalUsers: number;
  totalMovies: number;
  totalComments: number;
  totalWatchlistItems: number;
  totalCategories: number;
  totalViews: number;
};

type EngagementPayload = {
  activeViewers: number;
  completedCount: number;
  completionRate: number;
  avgProgressSeconds: number;
  medianProgressSeconds: number;
};

type DeviceBucket = {
  key: 'desktop' | 'mobile' | 'tv' | 'unknown';
  count: number;
};

type GrowthMovie = {
  id: string;
  title: string;
  slug: string;
  posterUrl?: string;
  current: number;
  previous: number;
  delta: number;
};

type AlertsPayload = {
  hiddenContent?: {
    total: number;
    items: Array<{
      movieId: string;
      title: string;
      slug: string;
      status: string;
      deletedAt?: string | null;
      count: number;
    }>;
  };
};

type DashboardOverview = {
  range?: { key: string; from: string; to: string } | null;
  trends?: null | TrendsPayload;
  metrics: MetricsPayload;
  metricsPrevious?: MetricsPayload | null;
  metricsAllTime?: MetricsPayload;
  engagement?: EngagementPayload | null;
  engagementPrevious?: EngagementPayload | null;
  deviceDistribution?: DeviceBucket[];
  deviceDistributionPrevious?: DeviceBucket[];
  topMovies: Array<{
    id: string;
    title: string;
    slug: string;
    views: number;
    imdbRating?: number;
    posterUrl?: string;
  }>;
  topGenres: Array<{ id: string; name: string; count: number }>;
  topCountries: Array<{ id: string; name: string; count: number }>;
  topMoviesGrowth?: GrowthMovie[];
  funnel?: null | { signups: number; watchActivities: number; completions: number };
  alerts?: null | AlertsPayload;
  newestUsers?: Array<{
    id: string;
    name: string;
    email: string;
    plan: string;
    watchedCount?: number;
    createdAt: string;
  }>;
  planDistribution?: Array<{ plan: string; count: number }>;
};

const ranges: Array<{ key: RangeKey; labelKey: string; hintKey: string }> = [
  { key: 'today', labelKey: 'views.statistics.ranges.today', hintKey: 'views.statistics.ranges.todayHint' },
  { key: '7d', labelKey: 'views.statistics.ranges.7d', hintKey: 'views.statistics.ranges.7dHint' },
  { key: '30d', labelKey: 'views.statistics.ranges.30d', hintKey: 'views.statistics.ranges.30dHint' },
];

const activeRange = ref<RangeKey>('30d');
const customRangeValue = ref<[Dayjs, Dayjs] | undefined>(undefined);
const customFrom = ref<string | null>(null);
const customTo = ref<string | null>(null);
const showCustomRange = ref(false);

const RangePicker = DatePicker.RangePicker;

const activeRangeLabel = computed(() => {
  if (activeRange.value === 'custom') {
    if (customFrom.value && customTo.value) {
      const fromText = dayjs(customFrom.value).format('DD/MM/YYYY');
      const toText = dayjs(customTo.value)
        .subtract(1, 'day')
        .format('DD/MM/YYYY');
      return `${fromText} - ${toText}`;
    }
    return $t('views.statistics.ranges.custom');
  }

  const match = ranges.find((r) => r.key === activeRange.value);
  return match ? $t(match.labelKey) : $t('views.statistics.ranges.30d');
});

const loading = ref(false);
const overview = ref<DashboardOverview | null>(null);
const loadError = ref<{ status?: number; message?: string } | null>(null);
let overviewRequestId = 0;
const router = useRouter();

function formatCompact(value: number) {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.floor(value));
}

function formatMinutesFromSeconds(seconds: number) {
  const s = Math.max(0, Number(seconds) || 0);
  const minutes = Math.round(s / 60);
  return `${minutes.toLocaleString()} ${$t('views.statistics.meta.minutes')}`;
}

function buildDateSeries(range: TrendRange, timezone?: string) {
  const anyDayjs: any = dayjs;
  const tz = typeof anyDayjs?.tz === 'function' && timezone ? timezone : null;
  const withTz = (value: string) => (tz ? anyDayjs.tz(value, tz) : dayjs(value));

  const start = withTz(range.from).startOf('day');
  // Backend uses an exclusive `to` boundary; render as an inclusive end day for charts.
  const endInclusive = withTz(range.to).subtract(1, 'day').startOf('day');
  const spanDays = Math.max(endInclusive.diff(start, 'day'), 0);

  // Guard against accidental huge ranges breaking the UI.
  const cappedSpanDays = Math.min(spanDays, 366);

  const keys: string[] = [];
  const labels: string[] = [];
  const values: number[] = [];

  for (let i = 0; i <= cappedSpanDays; i++) {
    const d = start.add(i, 'day');
    const key = d.format('YYYY-MM-DD');
    keys.push(key);
    labels.push(d.format('MMM DD'));
    values.push(Number(range.buckets?.[key] ?? 0));
  }

  return { keys, labels, values };
}

function toLinePoints(values: number[], maxValue: number) {
  const width = 100;
  const height = 40;
  const paddingTop = 4;
  const paddingBottom = 4;

  const safeMax = Math.max(maxValue, 1);
  const usableHeight = height - paddingTop - paddingBottom;

  const count = values.length;
  if (count === 0) return [];

  const stepX = count === 1 ? 0 : width / (count - 1);
  return values.map((v, i) => {
    const x = count === 1 ? width / 2 : i * stepX;
    const y = paddingTop + (1 - (Number(v) / safeMax)) * usableHeight;
    return { x, y };
  });
}

function pointsToPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  return points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

function pointsToAreaPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  const height = 40;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const line = pointsToPath(points);
  return `${line} L${last.x.toFixed(2)} ${height} L${first.x.toFixed(2)} ${height} Z`;
}

async function fetchOverview() {
  const requestId = ++overviewRequestId;
  loading.value = true;
  loadError.value = null;
  try {
    const params: Record<string, any> = {};

    if (activeRange.value === 'custom') {
      if (customFrom.value && customTo.value) {
        params.range = 'custom';
        params.from = customFrom.value;
        params.to = customTo.value;
      } else {
        // Avoid fetching "all-time" by accident when user hasn't applied a custom range.
        params.range = '30d';
      }
    } else {
      params.range = activeRange.value;
    }

    const data = (await requestClient.get('/dashboard/overview', { params })) as DashboardOverview;

    // Prevent late responses from older requests from causing UI flicker.
    if (requestId !== overviewRequestId) return;
    overview.value = data;
  } catch (err) {
    console.error('Failed to fetch overview:', err);
    const anyErr: any = err;
    const status =
      anyErr?.response?.status ?? anyErr?.status ?? anyErr?.response?.statusCode;
    const apiMessage =
      anyErr?.response?.data?.message ??
      anyErr?.response?.data?.error ??
      anyErr?.message ??
      '';

    loadError.value = {
      status: typeof status === 'number' ? status : undefined,
      message: String(apiMessage || '').trim() || undefined,
    };

    if (status === 401) {
      message.error($t('views.statistics.messages.unauthorized'));
    } else if (status === 403) {
      message.error($t('views.statistics.messages.forbidden'));
    } else {
      message.error($t('views.statistics.messages.loadFailed'));
    }
  } finally {
    if (requestId === overviewRequestId) {
      loading.value = false;
    }
  }
}

watch(activeRange, () => {
  if (activeRange.value === 'custom') {
    // Only fetch after user applies a valid from/to.
    if (customFrom.value && customTo.value) fetchOverview();
    return;
  }

  fetchOverview();
});

onMounted(() => {
  fetchOverview();
});

const trendData = computed(() => {
  const trends = overview.value?.trends;
  if (!trends?.current || !trends?.previous) return null;

  const timezone = trends.timezone;
  const current = buildDateSeries(trends.current, timezone);
  const previous = buildDateSeries(trends.previous, timezone);

  const len = current.values.length;
  let prevValues = previous.values.slice(-len);
  if (prevValues.length < len) {
    prevValues = Array.from({ length: len - prevValues.length }, () => 0).concat(prevValues);
  }

  return {
    labels: current.labels,
    currentValues: current.values,
    previousValues: prevValues,
  };
});

const planDistribution = computed(() => {
  const list = Array.isArray(overview.value?.planDistribution)
    ? overview.value!.planDistribution
    : [];

  const byPlan = new Map<string, number>();
  for (const row of list) {
    const key = String((row as any)?.plan ?? '').trim().toLowerCase();
    const count = Math.max(0, Number((row as any)?.count) || 0);
    if (!key) continue;
    byPlan.set(key, (byPlan.get(key) || 0) + count);
  }

  const premiumCount = byPlan.get('premium') || 0;
  const freeCount = byPlan.get('free') || 0;
  const total = premiumCount + freeCount || 1;

  const premiumPercentRaw = (premiumCount / total) * 100;
  const freePercentRaw = 100 - premiumPercentRaw;

  // Make sure the arc lengths sum to exactly 100 to avoid visual gaps.
  const premiumArc = Math.max(0, Math.min(100, Number(premiumPercentRaw.toFixed(2))));
  const freeArc = Math.max(0, Math.min(100, Number((100 - premiumArc).toFixed(2))));

  return {
    total,
    premium: { count: premiumCount, percent: Math.round(premiumPercentRaw), arc: premiumArc },
    free: { count: freeCount, percent: Math.round(freePercentRaw), arc: freeArc },
    segments: [
      {
        key: 'premium',
        label: $t('views.statistics.charts.premiumPlan'),
        dotClass: 'bg-primary',
        strokeClass: 'text-primary',
        arc: premiumArc,
        offset: 0,
        percent: Math.round(premiumPercentRaw),
      },
      {
        key: 'free',
        label: $t('views.statistics.charts.freePlan'),
        dotClass: 'bg-slate-300 dark:bg-slate-700',
        strokeClass: 'text-slate-300 dark:text-slate-700',
        arc: freeArc,
        offset: premiumArc,
        percent: Math.round(freePercentRaw),
      },
    ],
  };
});

const deviceDistribution = computed(() => {
  const list = Array.isArray(overview.value?.deviceDistribution)
    ? overview.value!.deviceDistribution
    : [];

  const byKey = new Map<string, number>();
  for (const row of list) {
    const key = String((row as any)?.key ?? '').trim().toLowerCase();
    const count = Math.max(0, Number((row as any)?.count) || 0);
    if (!key) continue;
    byKey.set(key, (byKey.get(key) || 0) + count);
  }

  const mobileCount = byKey.get('mobile') || 0;
  const desktopCount = byKey.get('desktop') || 0;
  const tvCount = byKey.get('tv') || 0;
  const unknownCount = byKey.get('unknown') || 0;
  const total = mobileCount + desktopCount + tvCount + unknownCount || 1;

  const segmentsRaw = [
    { key: 'mobile', label: $t('views.statistics.charts.device.mobile'), count: mobileCount, strokeClass: 'text-purple-500', dotClass: 'bg-purple-500' },
    { key: 'desktop', label: $t('views.statistics.charts.device.desktop'), count: desktopCount, strokeClass: 'text-orange-400', dotClass: 'bg-orange-400' },
    { key: 'tv', label: $t('views.statistics.charts.device.tv'), count: tvCount, strokeClass: 'text-emerald-500', dotClass: 'bg-emerald-500' },
    { key: 'unknown', label: $t('views.statistics.charts.device.unknown'), count: unknownCount, strokeClass: 'text-slate-300 dark:text-slate-700', dotClass: 'bg-slate-300 dark:bg-slate-700' },
  ];

  let offset = 0;
  const segments = segmentsRaw.map((s) => {
    const percentRaw = (s.count / total) * 100;
    const arc = Number(percentRaw.toFixed(2));
    const out = {
      ...s,
      percent: Math.round(percentRaw),
      arc,
      offset,
    };
    offset += arc;
    return out;
  });

  // Normalize arcs to sum to 100.
  const sumArc = segments.reduce((acc, s) => acc + s.arc, 0);
  if (sumArc > 0) {
    const scale = 100 / sumArc;
    let running = 0;
    for (const seg of segments) {
      seg.arc = Number((seg.arc * scale).toFixed(2));
      seg.offset = Number((running).toFixed(2));
      running += seg.arc;
    }
  }

  const top = segments.slice().sort((a, b) => b.count - a.count)[0];

  return {
    total,
    top: top ? { label: top.label, percent: top.percent } : { label: '-', percent: 0 },
    segments,
  };
});

const hasDeviceData = computed(() => {
  const list = Array.isArray(overview.value?.deviceDistribution)
    ? overview.value!.deviceDistribution
    : [];
  return list.some((r: any) => (Number(r?.count) || 0) > 0);
});

const engagement = computed(() => overview.value?.engagement ?? null);

const funnel = computed(() => overview.value?.funnel ?? null);

const alerts = computed(() => overview.value?.alerts ?? null);

const rangeSummary = computed(() => {
  const trends = overview.value?.trends;
  if (!trends?.current?.from || !trends?.current?.to) return null;

  const from = dayjs(trends.current.from).startOf('day');
  const toExclusive = dayjs(trends.current.to).startOf('day');
  const toInclusive = toExclusive.subtract(1, 'day');
  const days = Math.max(toExclusive.diff(from, 'day'), 1);

  return {
    timezone: trends.timezone || 'UTC',
    fromText: from.format('DD/MM/YYYY'),
    toText: toInclusive.format('DD/MM/YYYY'),
    days,
  };
});

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escapeCell = (value: any) => {
    const s = String(value ?? '');
    if (/[",\n]/.test(s)) return `"${s.split('"').join('""')}"`;
    return s;
  };

  const csv = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportTopMovies() {
  const list = Array.isArray(overview.value?.topMovies) ? overview.value!.topMovies : [];
  downloadCsv(
    `top-movies-${activeRange.value}.csv`,
    ['id', 'title', 'slug', 'views'],
    list.map((m) => [m.id, m.title, m.slug, m.views ?? 0]),
  );
}

function exportTopGenres() {
  const list = Array.isArray(overview.value?.topGenres) ? overview.value!.topGenres : [];
  downloadCsv(
    `top-genres-${activeRange.value}.csv`,
    ['id', 'name', 'count'],
    list.map((g) => [g.id, g.name, g.count ?? 0]),
  );
}

function exportTopCountries() {
  const list = Array.isArray(overview.value?.topCountries) ? overview.value!.topCountries : [];
  downloadCsv(
    `top-countries-${activeRange.value}.csv`,
    ['id', 'name', 'count'],
    list.map((c) => [c.id, c.name, c.count ?? 0]),
  );
}

function exportTopGrowth() {
  const list = Array.isArray(overview.value?.topMoviesGrowth) ? overview.value!.topMoviesGrowth : [];
  downloadCsv(
    `top-growth-${activeRange.value}.csv`,
    ['id', 'title', 'slug', 'current', 'previous', 'delta'],
    list.map((m) => [m.id, m.title, m.slug, m.current ?? 0, m.previous ?? 0, m.delta ?? 0]),
  );
}

function openMovieLibrary(title: string) {
  const q = String(title || '').trim();
  router.push({
    name: 'MovieList',
    query: q ? { search: q } : {},
  });
}
function formatSignedPercent(value: number) {
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  const rounded = Math.round(v);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '' : '';
  return `${sign}${rounded}%`;
}

function calcPercentChange(current: number, previous: null | number | undefined) {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev <= 0) return null;
  return ((curr - prev) / prev) * 100;
}

const kpis = computed(() => {
  const m = overview.value?.metrics;
  const prev = overview.value?.metricsPrevious ?? null;
  const rangeText = activeRangeLabel.value;

  const makeBadge = (current: number, previous: null | number | undefined) => {
    const change = calcPercentChange(current, previous);
    if (change === null) {
      return {
        text: rangeText,
        class: 'text-slate-600 bg-slate-400/10 dark:text-slate-300',
        icon: null as null | string,
      };
    }

    const isUp = change > 0;
    const isDown = change < 0;
    return {
      text: formatSignedPercent(change) ?? rangeText,
      class: isUp
        ? 'text-emerald-700 bg-emerald-500/10 dark:text-emerald-300'
        : isDown
          ? 'text-rose-700 bg-rose-500/10 dark:text-rose-300'
          : 'text-slate-600 bg-slate-400/10 dark:text-slate-300',
      icon: isUp ? 'north_east' : isDown ? 'south_east' : null,
    };
  };

  return [
    {
      key: 'views',
      icon: 'visibility',
      iconClass: 'bg-primary/10 text-primary',
      badge: makeBadge(m?.totalViews ?? 0, prev?.totalViews),
      label: $t('views.statistics.kpis.views'),
      value: (m?.totalViews ?? 0).toLocaleString(),
      sub: $t('views.statistics.kpis.byRange', { range: activeRangeLabel.value }),
    },
    {
      key: 'movies',
      icon: 'movie',
      iconClass: 'bg-purple-500/10 text-purple-500',
      badge: makeBadge(m?.totalMovies ?? 0, prev?.totalMovies),
      label: $t('views.statistics.kpis.movies'),
      value: (m?.totalMovies ?? 0).toLocaleString(),
      sub: $t('views.statistics.kpis.byRange', { range: activeRangeLabel.value }),
    },
    {
      key: 'users',
      icon: 'group',
      iconClass: 'bg-orange-500/10 text-orange-500',
      badge: makeBadge(m?.totalUsers ?? 0, prev?.totalUsers),
      label: $t('views.statistics.kpis.users'),
      value: (m?.totalUsers ?? 0).toLocaleString(),
      sub: $t('views.statistics.kpis.byRange', { range: activeRangeLabel.value }),
    },
    {
      key: 'comments',
      icon: 'forum',
      iconClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      badge: makeBadge(m?.totalComments ?? 0, prev?.totalComments),
      label: $t('views.statistics.kpis.comments'),
      value: (m?.totalComments ?? 0).toLocaleString(),
      sub: $t('views.statistics.kpis.byRange', { range: activeRangeLabel.value }),
    },
    {
      key: 'watchlist',
      icon: 'bookmark',
      iconClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-200',
      badge: makeBadge(m?.totalWatchlistItems ?? 0, prev?.totalWatchlistItems),
      label: $t('views.statistics.kpis.watchlist'),
      value: (m?.totalWatchlistItems ?? 0).toLocaleString(),
      sub: $t('views.statistics.kpis.byRange', { range: activeRangeLabel.value }),
    },
    {
      key: 'categories',
      icon: 'category',
      iconClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      badge: makeBadge(m?.totalCategories ?? 0, prev?.totalCategories),
      label: $t('views.statistics.kpis.categories'),
      value: (m?.totalCategories ?? 0).toLocaleString(),
      sub: $t('views.statistics.kpis.byRange', { range: activeRangeLabel.value }),
    },
  ];
});

const topMovies = computed(() => {
  const list = Array.isArray(overview.value?.topMovies) ? overview.value!.topMovies : [];
  return list.slice(0, 5).map((m) => {
    const rating = typeof m.imdbRating === 'number' ? m.imdbRating : null;
    const note = rating !== null ? `IMDb ${rating.toFixed(1)}` : formatCompact(m.views ?? 0);
    const noteClass = rating !== null
      ? rating >= 7.5
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-500 dark:text-slate-400'
      : 'text-slate-500 dark:text-slate-400';

    return {
      id: m.id,
      slug: m.slug,
      title: m.title,
      meta: $t('views.statistics.meta.viewsDot', { views: formatCompact(m.views ?? 0) }),
      views: formatCompact(m.views ?? 0),
      note,
      noteClass,
      cover: m.posterUrl || 'https://via.placeholder.com/120x180?text=Poster',
    };
  });
});

const topGrowthMovies = computed(() => {
  const list = Array.isArray(overview.value?.topMoviesGrowth)
    ? overview.value!.topMoviesGrowth
    : [];

  return list.slice(0, 6).map((m) => {
    const delta = Number(m.delta) || 0;
    const isUp = delta > 0;
    return {
      id: m.id,
      slug: m.slug,
      title: m.title,
      cover: m.posterUrl || 'https://via.placeholder.com/120x180?text=Poster',
      deltaText: `${isUp ? '+' : ''}${delta}`,
      deltaClass: isUp
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-500 dark:text-slate-400',
      current: formatCompact(m.current ?? 0),
      previous: formatCompact(m.previous ?? 0),
    };
  });
});

const topGenres = computed(() => {
  const list = Array.isArray(overview.value?.topGenres) ? overview.value!.topGenres : [];
  const max = Math.max(...list.map((i) => Number(i.count) || 0), 1);
  return list.slice(0, 6).map((g, idx) => {
    const rawName = String(g.name || '').trim();
    const title =
      !rawName || rawName.toLowerCase() === 'unknown'
        ? $t('views.statistics.meta.unknown')
        : rawName;

    return {
      rank: idx + 1,
      title,
      meta: $t('views.statistics.meta.moviesCount', {
        count: (g.count ?? 0).toLocaleString(),
      }),
      completion: Math.round(((Number(g.count) || 0) / max) * 100),
    };
  });
});

const countries = computed(() => {
  const list = Array.isArray(overview.value?.topCountries) ? overview.value!.topCountries : [];
  const total = list.reduce((sum, c) => sum + (Number(c.count) || 0), 0) || 1;
  return list.slice(0, 6).map((c) => ({
    name: (() => {
      const rawName = String(c.name || '').trim();
      if (!rawName || rawName.toLowerCase() === 'unknown') {
        return $t('views.statistics.meta.unknown');
      }
      return rawName;
    })(),
    value: (Number(c.count) || 0).toLocaleString(),
    percent: Number((((Number(c.count) || 0) / total) * 100).toFixed(1)),
  }));
});

const mapHighlight = computed(() => countries.value[0] ?? null);

function openCustomRange() {
  if (customFrom.value && customTo.value) {
    const start = dayjs(customFrom.value).startOf('day');
    // `customTo` is exclusive; show an inclusive end date in the picker.
    const endInclusive = dayjs(customTo.value).subtract(1, 'day').startOf('day');
    customRangeValue.value = [start, endInclusive];
    showCustomRange.value = true;
    return;
  }

  if (!customRangeValue.value) {
    const end = dayjs().startOf('day');
    const start = end.subtract(7, 'day');
    customRangeValue.value = [start, end];
  }
  showCustomRange.value = true;
}

function cancelCustomRange() {
  showCustomRange.value = false;
}

function applyCustomRange() {
  const value = customRangeValue.value;
  if (!value || !value[0] || !value[1]) {
    message.error($t('views.statistics.messages.selectRangeRequired'));
    return;
  }

  const start = value[0].startOf('day');
  // Exclusive end: start of the next day (so the end date is inclusive for users).
  const endExclusive = value[1].add(1, 'day').startOf('day');

  customFrom.value = start.toISOString();
  customTo.value = endExclusive.toISOString();
  const wasCustom = activeRange.value === 'custom';
  activeRange.value = 'custom';
  showCustomRange.value = false;
  if (wasCustom) fetchOverview();
}

/** ECHARTS INIT **/
const trendChartRef = ref<HTMLElement | null>(null);
const planChartRef = ref<HTMLElement | null>(null);
const deviceChartRef = ref<HTMLElement | null>(null);

const { renderEcharts: renderTrendChart } = useEcharts(trendChartRef as any);
const { renderEcharts: renderPlanChart } = useEcharts(planChartRef as any);
const { renderEcharts: renderDeviceChart } = useEcharts(deviceChartRef as any);

const trendChartOptions = computed(() => {
  const data = trendData.value;
  if (!data) return {};
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: data.labels },
    yAxis: { type: 'value' },
    series: [
      {
        name: $t('views.statistics.charts.currentPeriod'),
        type: 'line',
        itemStyle: { color: '#0ea5e9' },
        areaStyle: { opacity: 0.1, color: '#0ea5e9' },
        data: data.currentValues,
        smooth: true,
      },
      {
        name: $t('views.statistics.charts.previous'),
        type: 'line',
        itemStyle: { color: '#94a3b8' },
        lineStyle: { type: 'dashed' },
        data: data.previousValues,
        smooth: true,
      }
    ]
  };
});

const planChartOptions = computed(() => {
  const pd = planDistribution.value;
  if (!pd || pd.total <= 0) return {};
  
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: '0%', left: 'center' },
    series: [
      {
        name: $t('views.statistics.charts.planDistribution'),
        type: 'pie',
        radius: ['50%', '75%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
        labelLine: { show: false },
        data: [
          { value: pd.premium.count, name: $t('views.statistics.charts.premiumPlan'), itemStyle: { color: '#10b981' } },
          { value: pd.free.count, name: $t('views.statistics.charts.freePlan'), itemStyle: { color: '#cbd5e1' } }
        ]
      }
    ]
  };
});

const deviceChartOptions = computed(() => {
  const dd = deviceDistribution.value;
  if (!dd || dd.total <= 0) return {};

  const colorMap: any = {
    mobile: '#a855f7',
    desktop: '#fb923c',
    tv: '#10b981',
    unknown: '#cbd5e1'
  };

  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: '0%', left: 'center' },
    series: [
      {
        name: $t('views.statistics.charts.deviceDistribution'),
        type: 'pie',
        radius: ['50%', '75%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
        labelLine: { show: false },
        data: dd.segments.map(s => ({
          value: s.count,
          name: s.label,
          itemStyle: { color: colorMap[s.key] || colorMap.unknown }
        }))
      }
    ]
  };
});

watch(trendChartOptions, (options) => { if (options.series) nextTick(() => renderTrendChart(options)); }, { deep: true, immediate: true });
watch(planChartOptions, (options) => { if (options.series) nextTick(() => renderPlanChart(options)); }, { deep: true, immediate: true });
watch(deviceChartOptions, (options) => { if (options.series) nextTick(() => renderDeviceChart(options)); }, { deep: true, immediate: true });

</script>

<template>
  <div class="flex-1 overflow-y-auto bg-slate-50 dark:bg-background-dark/50">
    <div class="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      <div class="relative">
        <div
          v-if="loading"
          class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-50/60 dark:bg-background-dark/30 backdrop-blur-sm"
        >
          <span class="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
        </div>

        <div :class="['space-y-8 transition-opacity', loading ? 'pointer-events-none opacity-60' : '']">
        <!-- Hero -->
      <div class="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div class="absolute inset-0 pointer-events-none">
          <div class="absolute -top-24 -right-24 size-72 rounded-full blur-3xl opacity-25" style="background: radial-gradient(circle at center, #1f90f9, transparent 60%);"></div>
          <div class="absolute -bottom-28 -left-24 size-80 rounded-full blur-3xl opacity-20" style="background: radial-gradient(circle at center, #f59e0b, transparent 60%);"></div>
          <div class="absolute inset-0 opacity-[0.06] dark:opacity-[0.08]" style="background-image: radial-gradient(#0f172a 1px, transparent 1px); background-size: 18px 18px;"></div>
        </div>

        <div class="relative p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 class="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">{{ $t('views.statistics.title') }}</h2>
            <p class="text-slate-500 mt-1">{{ $t('views.statistics.subtitle') }}</p>
            <p v-if="rangeSummary" class="text-xs text-slate-400 mt-2 font-semibold">
              {{ $t('views.statistics.meta.rangeSummary', { from: rangeSummary.fromText, to: rangeSummary.toText, days: rangeSummary.days, tz: rangeSummary.timezone }) }}
            </p>
            <div
              v-if="loadError"
              class="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200"
            >
              <span class="material-symbols-outlined text-sm">error</span>
              <span>
                {{ $t('views.statistics.messages.loadFailed') }}
                <span v-if="loadError.status">({{ loadError.status }})</span>
                <span v-if="loadError.message">: {{ loadError.message }}</span>
              </span>
              <button
                type="button"
                class="ml-2 rounded-lg bg-white/70 px-2 py-1 text-rose-700 hover:bg-white dark:bg-rose-900/30 dark:text-rose-200 dark:hover:bg-rose-900/40"
                @click="fetchOverview"
              >
                {{ $t('views.statistics.actions.retry') }}
              </button>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div class="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1 border border-slate-200 dark:border-slate-700">
              <button
                v-for="r in ranges"
                :key="r.key"
                @click="activeRange = r.key"
                :disabled="loading"
                :title="$t(r.hintKey)"
                :class="[
                  'px-4 py-2 text-sm font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed',
                  activeRange === r.key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
                ]"
              >
                {{ $t(r.labelKey) }}
              </button>
            </div>
            <button
              @click="openCustomRange"
              :disabled="loading"
              class="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-outlined text-sm">calendar_month</span>
              <span class="truncate max-w-[14rem]">
                {{ activeRange === 'custom' ? activeRangeLabel : $t('views.statistics.ranges.custom') }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- KPIs Row -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
        <div v-for="k in kpis" :key="k.key" class="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div class="flex items-center justify-between mb-4">
            <div class="p-2 rounded-lg" :class="k.iconClass">
              <span class="material-symbols-outlined">{{ k.icon }}</span>
            </div>
            <span class="text-xs font-bold px-2 py-1 rounded-full inline-flex items-center gap-1" :class="k.badge.class">
              <span v-if="k.badge.icon" class="material-symbols-outlined text-[12px]">{{ k.badge.icon }}</span>
              {{ k.badge.text }}
            </span>
          </div>
          <p class="text-slate-500 text-sm font-medium">{{ k.label }}</p>
          <p class="text-2xl font-black mt-1 text-slate-900 dark:text-white">{{ k.value }}</p>
          <p class="text-xs mt-2 text-slate-400 font-semibold">{{ k.sub }}</p>
        </div>
      </div>

      <!-- Main Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Total Views Chart -->
        <div class="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between mb-8">
            <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ $t('views.statistics.charts.viewershipTrends') }}</h3>
            <div class="flex items-center gap-4 text-xs">
              <div class="flex items-center gap-1.5">
                <span class="size-2 rounded-full bg-primary"></span>
                <span class="text-slate-500">{{ $t('views.statistics.charts.currentPeriod') }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="size-2 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                <span class="text-slate-500">{{ $t('views.statistics.charts.previous') }}</span>
              </div>
            </div>
          </div>
          <div class="h-[300px] w-full relative">
             <EchartsUI v-show="trendData?.currentValues?.length" ref="trendChartRef" style="width: 100%; height: 100%"></EchartsUI>
             <div v-show="!trendData?.currentValues?.length" class="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
               {{ $t('views.statistics.charts.noData') }}
             </div>
          </div>
	      </div>
        
        <div class="flex flex-col gap-6">
          <!-- Plan Distribution -->
          <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <div class="flex items-center justify-between mb-6">
              <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ $t('views.statistics.charts.planDistribution') }}</h3>
              <button
                type="button"
                class="text-xs font-bold text-slate-500 hover:text-primary transition-colors inline-flex items-center gap-1"
                @click="() => downloadCsv(`plan-distribution.csv`, ['plan', 'count'], (overview?.planDistribution || []).map((p) => [p.plan, p.count]))"
              >
                <span class="material-symbols-outlined text-sm">download</span>
                {{ $t('views.statistics.actions.exportCsv') }}
              </button>
            </div>
            <div class="flex-1 w-full flex flex-col items-center justify-center min-h-[300px] mt-4">
              <EchartsUI v-show="planDistribution?.total" ref="planChartRef" style="width: 100%; height: 100%"></EchartsUI>
              <div v-show="!planDistribution?.total" class="flex flex-col items-center text-slate-400">
                 <span class="material-symbols-outlined text-4xl mb-2 opacity-50">donut_large</span>
                 {{ $t('views.statistics.charts.noData') }}
              </div>
            </div>
          </div>

          <!-- Device Distribution -->
          <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <div class="flex items-center justify-between mb-6">
              <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ $t('views.statistics.charts.deviceDistribution') }}</h3>
              <button
                type="button"
                class="text-xs font-bold text-slate-500 hover:text-primary transition-colors inline-flex items-center gap-1"
                @click="() => downloadCsv(`device-distribution-${activeRange}.csv`, ['device', 'count'], (overview?.deviceDistribution || []).map((d) => [d.key, d.count]))"
              >
                <span class="material-symbols-outlined text-sm">download</span>
                {{ $t('views.statistics.actions.exportCsv') }}
              </button>
            </div>

            <div v-if="hasDeviceData" class="flex-1 w-full flex flex-col items-center justify-center min-h-[300px] mt-4">
               <EchartsUI ref="deviceChartRef" style="width: 100%; height: 100%"></EchartsUI>
            </div>

            <div v-else class="flex-1 flex flex-col items-center justify-center text-xs text-slate-500 min-h-[300px]">
              <span class="material-symbols-outlined text-4xl mb-2 opacity-50">data_alert</span>
              {{ $t('views.statistics.charts.noData') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Content Rankings Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Top Movies -->
        <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ $t('views.statistics.rankings.topContent') }}</h3>
              <p class="text-xs text-slate-500">{{ $t('views.statistics.rankings.byViewsIn', { range: activeRangeLabel }) }}</p>
            </div>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="text-primary text-xs font-bold hover:underline"
                @click="exportTopMovies"
              >
                {{ $t('views.statistics.actions.exportCsv') }}
              </button>
              <a class="text-primary text-xs font-bold hover:underline cursor-pointer">{{ $t('views.statistics.rankings.viewMore') }}</a>
            </div>
          </div>
          <div class="space-y-4">
            <div
              v-for="m in topMovies"
              :key="m.id"
              class="flex items-center gap-4 group cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              @click="openMovieLibrary(m.title)"
            >
              <div class="size-12 rounded bg-slate-200 dark:bg-slate-800 bg-center bg-cover flex-shrink-0" :style="{ backgroundImage: `url('${m.cover}')` }"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold truncate text-slate-900 dark:text-white">{{ m.title }}</p>
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{{ m.meta }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-bold text-slate-900 dark:text-white">{{ m.views }}</p>
                <p class="text-[10px] font-bold" :class="m.noteClass">{{ m.note }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Growth -->
        <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ $t('views.statistics.rankings.topGrowing') }}</h3>
              <p class="text-xs text-slate-500">{{ $t('views.statistics.rankings.byGrowthIn', { range: activeRangeLabel }) }}</p>
            </div>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="text-primary text-xs font-bold hover:underline"
                @click="exportTopGrowth"
              >
                {{ $t('views.statistics.actions.exportCsv') }}
              </button>
              <a class="text-primary text-xs font-bold hover:underline cursor-pointer">{{ $t('views.statistics.rankings.viewMore') }}</a>
            </div>
          </div>

          <div v-if="topGrowthMovies.length > 0" class="space-y-4">
            <div
              v-for="m in topGrowthMovies"
              :key="m.id"
              class="flex items-center gap-4 group cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              @click="openMovieLibrary(m.title)"
            >
              <div class="size-12 rounded bg-slate-200 dark:bg-slate-800 bg-center bg-cover flex-shrink-0" :style="{ backgroundImage: `url('${m.cover}')` }"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold truncate text-slate-900 dark:text-white">{{ m.title }}</p>
                <p class="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  {{ $t('views.statistics.meta.growthMeta', { current: m.current, previous: m.previous }) }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm font-black" :class="m.deltaClass">{{ m.deltaText }}</p>
                <p class="text-[10px] font-bold text-slate-500">{{ $t('views.statistics.meta.deltaLabel') }}</p>
              </div>
            </div>
          </div>
          <div v-else class="text-xs text-slate-500">
            {{ $t('views.statistics.charts.noData') }}
          </div>
        </div>

        <!-- Viral Episodes -->
        <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ $t('views.statistics.rankings.topGenres') }}</h3>
              <p class="text-xs text-slate-500">{{ $t('views.statistics.rankings.byMovieCount') }}</p>
            </div>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="text-primary text-xs font-bold hover:underline"
                @click="exportTopGenres"
              >
                {{ $t('views.statistics.actions.exportCsv') }}
              </button>
              <a class="text-primary text-xs font-bold hover:underline cursor-pointer">{{ $t('views.statistics.rankings.viewMore') }}</a>
            </div>
          </div>
          <div class="space-y-4">
            <div
              v-for="e in topGenres"
              :key="e.rank"
              class="flex items-center gap-4 p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div class="size-10 flex items-center justify-center font-black rounded-lg shrink-0" :class="e.rank === 1 ? 'text-primary bg-primary/10' : 'text-slate-500 bg-slate-100 dark:bg-slate-800'">
                {{ e.rank }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold truncate text-slate-900 dark:text-white">{{ e.title }}</p>
                <p class="text-xs text-slate-500">{{ e.meta }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs font-bold text-slate-900 dark:text-white">{{ e.completion }}%</p>
                <div class="w-20 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1">
                  <div class="h-full bg-primary rounded-full" :style="{ width: `${e.completion}%` }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Engagement / Funnel / Alerts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ $t('views.statistics.sections.engagement') }}</h3>
          <p class="text-xs text-slate-500 mt-1">{{ $t('views.statistics.sections.engagementDesc') }}</p>

          <div v-if="engagement" class="mt-6 grid grid-cols-2 gap-4">
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <p class="text-xs text-slate-500 font-semibold">{{ $t('views.statistics.engagement.activeViewers') }}</p>
              <p class="text-xl font-black text-slate-900 dark:text-white mt-1">{{ (engagement.activeViewers ?? 0).toLocaleString() }}</p>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <p class="text-xs text-slate-500 font-semibold">{{ $t('views.statistics.engagement.completionRate') }}</p>
              <p class="text-xl font-black text-slate-900 dark:text-white mt-1">{{ Math.round((engagement.completionRate ?? 0) * 100) }}%</p>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <p class="text-xs text-slate-500 font-semibold">{{ $t('views.statistics.engagement.avgProgress') }}</p>
              <p class="text-xl font-black text-slate-900 dark:text-white mt-1">{{ formatMinutesFromSeconds(engagement.avgProgressSeconds ?? 0) }}</p>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <p class="text-xs text-slate-500 font-semibold">{{ $t('views.statistics.engagement.medianProgress') }}</p>
              <p class="text-xl font-black text-slate-900 dark:text-white mt-1">{{ formatMinutesFromSeconds(engagement.medianProgressSeconds ?? 0) }}</p>
            </div>
          </div>
          <div v-else class="mt-6 text-xs text-slate-500">
            {{ $t('views.statistics.charts.noData') }}
          </div>
        </div>

        <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ $t('views.statistics.sections.funnel') }}</h3>
          <p class="text-xs text-slate-500 mt-1">{{ $t('views.statistics.sections.funnelDesc') }}</p>

          <div v-if="funnel" class="mt-6 space-y-4">
            <div class="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
              <span>{{ $t('views.statistics.funnel.signups') }}</span>
              <span>{{ (funnel.signups ?? 0).toLocaleString() }}</span>
            </div>
            <div class="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
              <span>{{ $t('views.statistics.funnel.watchActivities') }}</span>
              <span>{{ (funnel.watchActivities ?? 0).toLocaleString() }}</span>
            </div>
            <div class="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
              <span>{{ $t('views.statistics.funnel.completions') }}</span>
              <span>{{ (funnel.completions ?? 0).toLocaleString() }}</span>
            </div>

            <div class="pt-2 grid grid-cols-2 gap-4 text-xs text-slate-500 font-semibold">
              <div>
                {{ $t('views.statistics.funnel.signupToWatch') }}:
                <span class="text-slate-900 dark:text-white font-black">
                  {{ funnel.signups > 0 ? Math.round((funnel.watchActivities / funnel.signups) * 100) : 0 }}%
                </span>
              </div>
              <div>
                {{ $t('views.statistics.funnel.watchToComplete') }}:
                <span class="text-slate-900 dark:text-white font-black">
                  {{ funnel.watchActivities > 0 ? Math.round((funnel.completions / funnel.watchActivities) * 100) : 0 }}%
                </span>
              </div>
            </div>
          </div>
          <div v-else class="mt-6 text-xs text-slate-500">
            {{ $t('views.statistics.charts.noData') }}
          </div>
        </div>

        <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ $t('views.statistics.sections.alerts') }}</h3>
              <p class="text-xs text-slate-500 mt-1">{{ $t('views.statistics.sections.alertsDesc') }}</p>
            </div>
          </div>

          <div class="mt-6">
            <div v-if="alerts?.hiddenContent">
              <div class="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white mb-3">
                <span>{{ $t('views.statistics.alerts.hiddenContent') }}</span>
                <span>{{ (alerts.hiddenContent.total ?? 0).toLocaleString() }}</span>
              </div>
              <div class="space-y-2">
                <div
                  v-for="item in alerts.hiddenContent.items"
                  :key="item.movieId"
                  class="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800"
                >
                  <div class="min-w-0">
                    <p class="text-sm font-bold truncate text-slate-900 dark:text-white">{{ item.title }}</p>
                    <p class="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      {{ item.status }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-black text-rose-600 dark:text-rose-400">{{ item.count }}</p>
                    <p class="text-[10px] text-slate-500 font-semibold">{{ $t('views.statistics.meta.watchActivities') }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-xs text-slate-500">
              {{ $t('views.statistics.charts.noData') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Regional Views -->
      <div class="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h3 class="font-bold text-lg text-slate-900 dark:text-white">{{ $t('views.statistics.sections.topCountries') }}</h3>
            <p class="text-xs text-slate-500">{{ $t('views.statistics.sections.topCountriesDesc') }}</p>
          </div>
          <button
            type="button"
            class="text-slate-500 hover:text-primary flex items-center gap-1 text-sm font-medium transition-colors"
            @click="exportTopCountries"
          >
            {{ $t('views.statistics.actions.exportCsv') }}
            <span class="material-symbols-outlined text-sm">download</span>
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div class="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center relative group overflow-hidden">
            <span class="material-symbols-outlined text-slate-400 text-6xl opacity-30">public</span>
            <!-- Mock Map Placeholder -->
            <div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image: radial-gradient(#1f90f9 1px, transparent 1px); background-size: 20px 20px;"></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="relative">
                <span class="absolute top-0 left-0 animate-ping size-3 bg-primary rounded-full"></span>
                <span class="size-3 bg-primary rounded-full border-2 border-white dark:border-slate-900 relative block"></span>
	                <div class="absolute top-4 left-4 bg-white dark:bg-slate-900 shadow-xl rounded-lg p-2 border border-slate-200 dark:border-slate-800 text-[10px] whitespace-nowrap z-20">
	                  <p class="font-bold text-slate-900 dark:text-white">
	                    {{ mapHighlight ? `${mapHighlight.name}: ${mapHighlight.percent}%` : '-' }}
	                  </p>
	                  <p v-if="mapHighlight" class="text-slate-500">{{ $t('views.statistics.meta.viewsCount', { count: mapHighlight.value }) }}</p>
	                </div>
              </div>
            </div>
          </div>
          
          <div class="space-y-6">
            <div v-for="(c, idx) in countries" :key="c.name" class="space-y-2">
              <div class="flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                <span>{{ c.name }}</span>
                <span>{{ c.value }} ({{ c.percent }}%)</span>
              </div>
              <div class="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full rounded-full" :class="idx === 0 ? 'bg-primary' : idx === 1 ? 'bg-primary/80' : idx === 2 ? 'bg-primary/60' : 'bg-primary/40'" :style="{ width: `${c.percent}%` }"></div>
              </div>
            </div>
          </div>
        </div> <!-- Closes grid grid-cols-1 md:grid-cols-2 gap-10 items-center -->
      </div> <!-- Closes Regional Views -->

      <!-- Revenue / Additional Charts (Always Visible) -->
      <div>
        <RevenueChart class="mt-8" :range="activeRange" />
      </div>
    </div> <!-- Closes Main Transition block -->
  </div> <!-- Closes Wrapper -->
</div> <!-- Closes Container -->

    <!-- Custom range picker (kept outside the loading overlay to avoid layout shift). -->
    <div
      v-if="showCustomRange"
      class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      @click.self="cancelCustomRange"
    >
      <div
        class="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        <div class="px-5 pt-5 flex items-start justify-between gap-4">
          <div>
            <h3 class="text-base font-black text-slate-900 dark:text-white">{{ $t('views.statistics.customRange.title') }}</h3>
            <p class="text-xs text-slate-500 mt-1">{{ $t('views.statistics.customRange.subtitle') }}</p>
          </div>
          <button
            type="button"
            class="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            @click="cancelCustomRange"
          >
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div class="px-5 pb-5 pt-4 space-y-3">
          <!-- eslint-disable-next-line vue/no-v-model-argument -->
          <RangePicker v-model:value="customRangeValue" :allowClear="false" class="w-full" />
          <p class="text-[11px] text-slate-500">
            {{ $t('views.statistics.customRange.hint') }}
          </p>

          <div class="pt-2 flex justify-end gap-2">
            <button
              type="button"
              class="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              @click="cancelCustomRange"
            >
              {{ $t('views.statistics.actions.cancel') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:opacity-90 transition-opacity"
              @click="applyCustomRange"
            >
              {{ $t('views.statistics.actions.apply') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
