const Comment = require('../models/comment.model');
const Category = require('../models/category.model');
const Country = require('../models/country.model');
const Movie = require('../models/movie.model');
const Setting = require('../models/setting.model');
const User = require('../models/user.model');
const Watchlist = require('../models/watchlist.model');
const Transaction = require('../models/transaction.model');
const { normalizeMongoTimezone } = require('../utils/timezone');

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseRange(query) {
  const range = typeof query?.range === 'string' ? query.range.trim() : '';
  const fromRaw = typeof query?.from === 'string' ? query.from.trim() : '';
  const toRaw = typeof query?.to === 'string' ? query.to.trim() : '';

  let to = null;
  let from = null;
  let key = '';

  if (toRaw) {
    const parsed = new Date(toRaw);
    if (!Number.isNaN(parsed.getTime())) to = parsed;
  }

  if (fromRaw) {
    const parsed = new Date(fromRaw);
    if (!Number.isNaN(parsed.getTime())) from = parsed;
  }

  const now = new Date();
  if (!to) {
    // Default to an exclusive end boundary at the start of tomorrow (local server time).
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    to = startOfLocalDay(tomorrow);
  }

  if (!from) {
    if (range === 'today') {
      key = 'today';
      from = startOfLocalDay(now);
    } else if (range === '7d') {
      key = '7d';
      const d = new Date(now);
      // Inclusive last 7 days (including today).
      d.setDate(d.getDate() - 6);
      from = startOfLocalDay(d);
    } else if (range === '30d') {
      key = '30d';
      const d = new Date(now);
      // Inclusive last 30 days (including today).
      d.setDate(d.getDate() - 29);
      from = startOfLocalDay(d);
    }
  } else {
    key = range || 'custom';
  }

  if (!from) return null;
  return { key: key || 'custom', from, to };
}

async function getDashboardTimezone() {
  try {
    const settings = await Setting.findOne({ key: 'default' }, { timezone: 1 }).lean();
    return normalizeMongoTimezone(settings?.timezone, 'UTC');
  } catch {
    return 'UTC';
  }
}

async function aggregateWatchBuckets(match, timezone) {
  const rows = await Watchlist.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$lastWatchedAt',
            timezone: timezone || 'UTC'
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const buckets = {};
  for (const row of rows) {
    if (!row || !row._id) continue;
    buckets[String(row._id)] = Number(row.count) || 0;
  }
  return buckets;
}

function buildPreviousPeriod(from, to) {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const span = Math.max(toMs - fromMs, 0);
  const prevTo = new Date(fromMs);
  const prevFrom = new Date(fromMs - span);
  return { prevFrom, prevTo };
}

async function aggregateDistinctUserCount(match) {
  const rows = await Watchlist.aggregate([
    { $match: match },
    { $group: { _id: '$user' } },
    { $count: 'count' }
  ]);
  return rows[0] ? Number(rows[0].count) || 0 : 0;
}

async function aggregateProgressStats(match) {
  const avgRows = await Watchlist.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        avgProgressSeconds: { $avg: '$progressSeconds' },
        count: { $sum: 1 }
      }
    }
  ]);

  const avg = avgRows[0] ? Number(avgRows[0].avgProgressSeconds) || 0 : 0;
  const count = avgRows[0] ? Number(avgRows[0].count) || 0 : 0;

  // Median (approx): sort and take up to 10k samples to avoid huge memory usage.
  const medianRows = await Watchlist.aggregate([
    { $match: match },
    { $project: { progressSeconds: 1 } },
    { $sort: { progressSeconds: 1 } },
    { $limit: 10_000 },
    { $group: { _id: null, values: { $push: '$progressSeconds' } } }
  ]);

  const values = medianRows[0]?.values || [];
  let median = 0;
  if (values.length > 0) {
    const mid = Math.floor(values.length / 2);
    median =
      values.length % 2 === 1
        ? Number(values[mid]) || 0
        : ((Number(values[mid - 1]) || 0) + (Number(values[mid]) || 0)) / 2;
  }

  return {
    count,
    avgProgressSeconds: Math.round(avg),
    medianProgressSeconds: Math.round(median)
  };
}

async function aggregateDeviceDistribution(match) {
  const rows = await Watchlist.aggregate([
    { $match: match },
    { $group: { _id: '$deviceType', count: { $sum: 1 } } }
  ]);

  const byKey = new Map();
  for (const row of rows) {
    const key = String(row?._id || 'unknown').trim().toLowerCase() || 'unknown';
    const safeKey = ['desktop', 'mobile', 'tv', 'unknown'].includes(key) ? key : 'unknown';
    byKey.set(safeKey, (byKey.get(safeKey) || 0) + (Number(row.count) || 0));
  }

  return ['mobile', 'desktop', 'tv', 'unknown'].map((key) => ({
    key,
    count: byKey.get(key) || 0
  }));
}

async function aggregateHiddenContentAlerts(match, limit) {
  const pipeline = [
    { $match: match },
    { $group: { _id: '$movie', count: { $sum: 1 } } },
    {
      $lookup: {
        from: 'movies',
        localField: '_id',
        foreignField: '_id',
        as: 'movie'
      }
    },
    { $unwind: '$movie' },
    {
      $match: {
        $or: [
          { 'movie.status': 'hidden' },
          { 'movie.deletedAt': { $ne: null } }
        ]
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        movieId: '$_id',
        title: '$movie.title',
        slug: '$movie.slug',
        status: '$movie.status',
        deletedAt: '$movie.deletedAt',
        count: 1
      }
    }
  ];

  const [items, totalRows] = await Promise.all([
    Watchlist.aggregate(pipeline),
    Watchlist.aggregate([...pipeline.slice(0, -3), { $count: 'count' }])
  ]);

  const total = totalRows[0] ? Number(totalRows[0].count) || 0 : 0;
  return { total, items };
}

async function aggregateTopFromWatchlists(match, limit) {
  return Watchlist.aggregate([
    { $match: match },
    { $group: { _id: '$movie', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'movies',
        localField: '_id',
        foreignField: '_id',
        as: 'movie'
      }
    },
    { $unwind: '$movie' },
    { $match: { 'movie.deletedAt': null } },
    {
      $project: {
        _id: 0,
        movieId: '$_id',
        count: 1,
        title: '$movie.title',
        slug: '$movie.slug',
        imdbRating: '$movie.imdbRating',
        posterUrl: '$movie.posterUrl',
        genres: '$movie.genres',
        countries: '$movie.countries'
      }
    }
  ]);
}

async function aggregateTaxonomyFromWatchlists(match, field, limit) {
  const unwindPath = field === 'genres' ? '$genres' : '$countries';
  const groupId = field === 'genres' ? '$genres' : '$countries';

  return Watchlist.aggregate([
    { $match: match },
    { $group: { _id: '$movie', views: { $sum: 1 } } },
    {
      $lookup: {
        from: 'movies',
        localField: '_id',
        foreignField: '_id',
        as: 'movie'
      }
    },
    { $unwind: '$movie' },
    { $match: { 'movie.deletedAt': null } },
    { $project: { views: 1, genres: '$movie.genres', countries: '$movie.countries' } },
    { $unwind: unwindPath },
    { $group: { _id: groupId, count: { $sum: '$views' } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
}

async function getOverview(query) {
  const range = parseRange(query);
  const timezone = await getDashboardTimezone();
  const previousPeriod = range ? buildPreviousPeriod(range.from, range.to) : null;

  // All-time metrics are useful for dashboard; range metrics are for filters in Statistics page.
  const allTimePromises = [
    Movie.countDocuments({ deletedAt: null }),
    User.countDocuments(),
    Comment.countDocuments({ deletedAt: null }),
    Watchlist.countDocuments(),
    Category.countDocuments(),
    Movie.aggregate([
      { $match: { deletedAt: null } },
      { $unwind: '$genres' },
      { $group: { _id: '$genres', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]),
    Movie.aggregate([
      { $match: { deletedAt: null } },
      { $unwind: '$countries' },
      { $group: { _id: '$countries', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]),
    Movie.find({ deletedAt: null }, { title: 1, slug: 1, views: 1, imdbRating: 1, posterUrl: 1 })
      .sort({ views: -1, imdbRating: -1 })
      .limit(10)
      .lean(),
    User.find({}, { name: 1, email: 1, plan: 1, createdAt: 1, watchedCount: 1 })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    User.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $project: { _id: 0, plan: '$_id', count: 1 } }
    ]),
    Movie.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ])
  ];

  const matchWatch = range
    ? { lastWatchedAt: { $gte: range.from, $lt: range.to }, progressSeconds: { $gt: 0 } }
    : { progressSeconds: { $gt: 0 } };

  const matchPrevWatch = previousPeriod
    ? { lastWatchedAt: { $gte: previousPeriod.prevFrom, $lt: previousPeriod.prevTo }, progressSeconds: { $gt: 0 } }
    : null;

  const rangePromises = range
    ? [
        Movie.countDocuments({ deletedAt: null, createdAt: { $gte: range.from, $lt: range.to } }),
        User.countDocuments({ createdAt: { $gte: range.from, $lt: range.to } }),
        Comment.countDocuments({ deletedAt: null, createdAt: { $gte: range.from, $lt: range.to } }),
        Watchlist.countDocuments(matchWatch),
        Category.countDocuments({ createdAt: { $gte: range.from, $lt: range.to } }),
        aggregateTopFromWatchlists(matchWatch, 10),
        aggregateTaxonomyFromWatchlists(matchWatch, 'genres', 8),
        aggregateTaxonomyFromWatchlists(matchWatch, 'countries', 8),
        aggregateDistinctUserCount(matchWatch),
        Watchlist.countDocuments({ ...matchWatch, isCompleted: true }),
        aggregateProgressStats(matchWatch),
        aggregateDeviceDistribution(matchWatch),
        aggregateHiddenContentAlerts(matchWatch, 5),
        // Growth comparison inputs (top by activity within each period)
        aggregateTopFromWatchlists(matchWatch, 30),
        matchPrevWatch ? aggregateTopFromWatchlists(matchPrevWatch, 30) : Promise.resolve([]),
        // Previous period metrics (for KPI deltas)
        matchPrevWatch ? Movie.countDocuments({ deletedAt: null, createdAt: { $gte: previousPeriod.prevFrom, $lt: previousPeriod.prevTo } }) : Promise.resolve(0),
        matchPrevWatch ? User.countDocuments({ createdAt: { $gte: previousPeriod.prevFrom, $lt: previousPeriod.prevTo } }) : Promise.resolve(0),
        matchPrevWatch ? Comment.countDocuments({ deletedAt: null, createdAt: { $gte: previousPeriod.prevFrom, $lt: previousPeriod.prevTo } }) : Promise.resolve(0),
        matchPrevWatch ? Watchlist.countDocuments(matchPrevWatch) : Promise.resolve(0),
        matchPrevWatch ? Category.countDocuments({ createdAt: { $gte: previousPeriod.prevFrom, $lt: previousPeriod.prevTo } }) : Promise.resolve(0),
        matchPrevWatch ? aggregateDistinctUserCount(matchPrevWatch) : Promise.resolve(0),
        matchPrevWatch ? Watchlist.countDocuments({ ...matchPrevWatch, isCompleted: true }) : Promise.resolve(0),
        matchPrevWatch ? aggregateProgressStats(matchPrevWatch) : Promise.resolve({ count: 0, avgProgressSeconds: 0, medianProgressSeconds: 0 }),
        matchPrevWatch ? aggregateDeviceDistribution(matchPrevWatch) : Promise.resolve([])
      ]
    : [];

  const [
    movieCountAll,
    userCountAll,
    commentCountAll,
    watchlistCountAll,
    categoryCountAll,
    topGenresAll,
    topCountriesAll,
    topMoviesAll,
    newestUsersAll,
    planDistributionAll,
    viewsSummaryAll,
    movieCountRange,
    userCountRange,
    commentCountRange,
    watchlistCountRange,
    categoryCountRange,
    topMoviesRangeAgg,
    topGenresRangeAgg,
    topCountriesRangeAgg,
    activeViewersRange,
    completedCountRange,
    progressStatsRange,
    deviceDistributionRange,
    hiddenAlertsRange,
    growthCurrentAgg,
    growthPreviousAgg,
    movieCountPrev,
    userCountPrev,
    commentCountPrev,
    watchlistCountPrev,
    categoryCountPrev,
    activeViewersPrev,
    completedCountPrev,
    progressStatsPrev,
    deviceDistributionPrev
  ] = await Promise.all([...allTimePromises, ...rangePromises]);

  const trends = range
    ? (() => {
        const { prevFrom, prevTo } = previousPeriod;
        const matchCurrent = matchWatch;
        const matchPrev = matchPrevWatch;
        return Promise.all([
          aggregateWatchBuckets(matchCurrent, timezone),
          matchPrev ? aggregateWatchBuckets(matchPrev, timezone) : Promise.resolve({})
        ]).then(([currentBuckets, previousBuckets]) => ({
          timezone,
          current: { from: range.from.toISOString(), to: range.to.toISOString(), buckets: currentBuckets },
          previous: { from: prevFrom.toISOString(), to: prevTo.toISOString(), buckets: previousBuckets }
        }));
      })()
    : Promise.resolve(null);

  const topMoviesAgg = range ? topMoviesRangeAgg : null;
  const topGenresAgg = range ? topGenresRangeAgg : null;
  const topCountriesAgg = range ? topCountriesRangeAgg : null;

  const genreIds = (range ? topGenresAgg : topGenresAll).map((g) => g._id).filter(Boolean);
  const countryIds = (range ? topCountriesAgg : topCountriesAll).map((c) => c._id).filter(Boolean);

  const [genreDocs, countryDocs] = await Promise.all([
    genreIds.length > 0 ? Category.find({ _id: { $in: genreIds } }, { name: 1 }).lean() : [],
    countryIds.length > 0 ? Country.find({ _id: { $in: countryIds } }, { name: 1, slug: 1 }).lean() : []
  ]);

  const genreNameById = new Map(genreDocs.map((d) => [d._id.toString(), d.name]));
  const countryNameById = new Map(countryDocs.map((d) => [d._id.toString(), d.name]));

  const metricsAllTime = {
    totalMovies: movieCountAll,
    totalUsers: userCountAll,
    totalComments: commentCountAll,
    totalWatchlistItems: watchlistCountAll,
    totalCategories: categoryCountAll,
    totalViews: viewsSummaryAll[0] ? viewsSummaryAll[0].totalViews : 0
  };

  const metrics = range
    ? {
        totalMovies: movieCountRange,
        totalUsers: userCountRange,
        totalComments: commentCountRange,
        totalWatchlistItems: watchlistCountRange,
        totalCategories: categoryCountRange,
        // Views in range is approximated by watch activity count.
        totalViews: watchlistCountRange
      }
    : metricsAllTime;

  const metricsPrevious = range
    ? {
        totalMovies: movieCountPrev,
        totalUsers: userCountPrev,
        totalComments: commentCountPrev,
        totalWatchlistItems: watchlistCountPrev,
        totalCategories: categoryCountPrev,
        totalViews: watchlistCountPrev
      }
    : null;

  const engagement = range
    ? {
        activeViewers: activeViewersRange,
        completedCount: completedCountRange,
        completionRate: watchlistCountRange > 0 ? completedCountRange / watchlistCountRange : 0,
        avgProgressSeconds: progressStatsRange.avgProgressSeconds,
        medianProgressSeconds: progressStatsRange.medianProgressSeconds
      }
    : null;

  const engagementPrevious = range
    ? {
        activeViewers: activeViewersPrev,
        completedCount: completedCountPrev,
        completionRate: watchlistCountPrev > 0 ? completedCountPrev / watchlistCountPrev : 0,
        avgProgressSeconds: progressStatsPrev.avgProgressSeconds,
        medianProgressSeconds: progressStatsPrev.medianProgressSeconds
      }
    : null;

  const deviceDistribution = range
    ? deviceDistributionRange
    : [];

  const deviceDistributionPrevious = range
    ? deviceDistributionPrev
    : [];

  const topMoviesGrowth = range
    ? (() => {
        const prevById = new Map((growthPreviousAgg || []).map((r) => [String(r.movieId || ''), Number(r.count) || 0]));
        const rows = (growthCurrentAgg || [])
          .map((r) => {
            const id = String(r.movieId || '');
            const current = Number(r.count) || 0;
            const previous = prevById.get(id) || 0;
            const delta = current - previous;
            return {
              id,
              title: r.title,
              slug: r.slug,
              posterUrl: r.posterUrl,
              current,
              previous,
              delta
            };
          })
          .filter((r) => r.delta > 0)
          .sort((a, b) => b.delta - a.delta)
          .slice(0, 10);

        return rows;
      })()
    : [];

  const funnel = range
    ? {
        signups: userCountRange,
        watchActivities: watchlistCountRange,
        completions: completedCountRange
      }
    : null;

  const topMovies = range
    ? (topMoviesAgg || []).map((row) => ({
        id: row.movieId ? row.movieId.toString() : '',
        title: row.title,
        slug: row.slug,
        // "views" is watch activity count in range.
        views: row.count,
        imdbRating: row.imdbRating,
        posterUrl: row.posterUrl
      }))
    : topMoviesAll.map((movie) => ({
        id: movie._id.toString(),
        title: movie.title,
        slug: movie.slug,
        views: movie.views,
        imdbRating: movie.imdbRating,
        posterUrl: movie.posterUrl
      }));

  const topGenres = (range ? topGenresAgg : topGenresAll).map((g) => ({
    id: g._id ? g._id.toString() : '',
    name: g._id ? genreNameById.get(g._id.toString()) || 'Unknown' : 'Unknown',
    count: g.count
  }));

  const topCountries = (range ? topCountriesAgg : topCountriesAll).map((c) => ({
    id: c._id ? c._id.toString() : '',
    name: c._id ? countryNameById.get(c._id.toString()) || 'Unknown' : 'Unknown',
    count: c.count
  }));

  return {
    range: range
      ? {
          key: range.key,
          from: range.from.toISOString(),
          to: range.to.toISOString()
        }
      : null,
    trends: await trends,
    metrics,
    metricsPrevious,
    metricsAllTime,
    engagement,
    engagementPrevious,
    deviceDistribution,
    deviceDistributionPrevious,
    topGenres,
    topCountries,
    topMovies,
    topMoviesGrowth,
    funnel,
    alerts: range ? { hiddenContent: hiddenAlertsRange } : null,
    newestUsers: newestUsersAll.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      plan: user.plan,
      watchedCount: user.watchedCount,
      createdAt: user.createdAt
    })),
    planDistribution: planDistributionAll
  };
}

async function aggregateRevenueBuckets(match, timezone) {
  const rows = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: timezone || 'UTC' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  const buckets = {};
  for (const row of rows) {
    if (!row || !row._id) continue;
    buckets[String(row._id)] = Number(row.revenue) || 0;
  }
  return buckets;
}

async function getRevenue(query) {
  const range = parseRange(query);
  const timezone = await getDashboardTimezone();
  const previousPeriod = range ? buildPreviousPeriod(range.from, range.to) : null;

  const matchTx = range ? { createdAt: { $gte: range.from, $lt: range.to }, status: 'completed' } : { status: 'completed' };
  const matchPrevTx = previousPeriod ? { createdAt: { $gte: previousPeriod.prevFrom, $lt: previousPeriod.prevTo }, status: 'completed' } : null;

  const [totalAggAll, planAggAll, txRange, planAggRange, prevTxAgg] = await Promise.all([
    Transaction.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Transaction.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: '$planPurchased', revenue: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    range ? Transaction.aggregate([{ $match: matchTx }, { $group: { _id: null, total: { $sum: '$amount' } } }]) : Promise.resolve([{ total: 0 }]),
    range ? Transaction.aggregate([{ $match: matchTx }, { $group: { _id: '$planPurchased', revenue: { $sum: '$amount' }, count: { $sum: 1 } } }]) : Promise.resolve([]),
    matchPrevTx ? Transaction.aggregate([{ $match: matchPrevTx }, { $group: { _id: null, total: { $sum: '$amount' } } }]) : Promise.resolve([{ total: 0 }]),
  ]);

  const trends = range ? (() => {
    const { prevFrom, prevTo } = previousPeriod;
    return Promise.all([
      aggregateRevenueBuckets(matchTx, timezone),
      matchPrevTx ? aggregateRevenueBuckets(matchPrevTx, timezone) : Promise.resolve({})
    ]).then(([currentBuckets, prevBuckets]) => ({
      timezone,
      current: { from: range.from.toISOString(), to: range.to.toISOString(), buckets: currentBuckets },
      previous: { from: prevFrom.toISOString(), to: prevTo.toISOString(), buckets: prevBuckets }
    }));
  })() : Promise.resolve(null);

  const recentTransactions = await Transaction.find(matchTx, { _id: 1, amount: 1, planPurchased: 1, billingCycle: 1, createdAt: 1, user: 1 })
    .populate('user', 'name email avatarUrl')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return {
    range: range ? { key: range.key, from: range.from.toISOString(), to: range.to.toISOString() } : null,
    metricsAllTime: {
      totalRevenue: totalAggAll[0] ? totalAggAll[0].total : 0,
    },
    metrics: range ? {
      totalRevenue: txRange[0] ? txRange[0].total : 0,
    } : { totalRevenue: totalAggAll[0] ? totalAggAll[0].total : 0 },
    metricsPrevious: range ? {
      totalRevenue: prevTxAgg[0] ? prevTxAgg[0].total : 0,
    } : null,
    trends: await trends,
    planDistribution: (range ? planAggRange : planAggAll).map(g => ({ plan: g._id, revenue: g.revenue, count: g.count })),
    recentTransactions: recentTransactions.map(t => ({
      id: t._id.toString(),
      amount: t.amount,
      plan: t.planPurchased,
      cycle: t.billingCycle,
      createdAt: t.createdAt,
      user: t.user ? { id: t.user._id.toString(), name: t.user.name, email: t.user.email, avatar: t.user.avatarUrl } : null
    }))
  };
}

module.exports = {
  getOverview,
  getRevenue
};
