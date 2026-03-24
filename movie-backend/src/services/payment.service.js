const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');
const Setting = require('../models/setting.model');
const HttpError = require('../utils/http-error');
const { parsePagination, parseSort } = require('../utils/query');

async function getPlans() {
  let setting = await Setting.findOne({ key: 'pricing' });
  if (!setting) {
    setting = await Setting.create({ 
      key: 'pricing', 
      subscriptionPlans: {
        standard: { monthly: 49000, annual: 470000 },
        premium: { monthly: 89000, annual: 850000 },
        ultimate: { monthly: 149000, annual: 1430000 }
      } 
    });
  }
  return setting.subscriptionPlans;
}

async function updatePlans(payload) {
  const setting = await Setting.findOneAndUpdate(
    { key: 'pricing' },
    { $set: { subscriptionPlans: payload } },
    { new: true, upsert: true }
  );
  return setting.subscriptionPlans;
}

async function processCheckout(userId, plan, billingCycle) {
  const validPlans = ['free', 'standard', 'premium', 'ultimate'];
  if (!validPlans.includes(plan)) {
    throw new HttpError(400, 'Invalid subscription plan selected');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  // Calculate expiration
  const now = new Date();
  if (billingCycle === 'annual') {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    now.setMonth(now.getMonth() + 1);
  }

  // Update user plan
  user.plan = plan;
  user.planStartedAt = new Date();
  user.planExpiresAt = now;
  await user.save();

  // Price matrix based on backend DB pricing
  const plans = await getPlans();
  const planData = plans[plan] || { monthly: 0, annual: 0 };
  let amount = billingCycle === 'annual' ? planData.annual : planData.monthly;

  // Create transaction record
  await Transaction.create({
     user: user._id,
     amount,
     currency: 'VND',
     planPurchased: plan,
     billingCycle: billingCycle,
     status: 'completed',
     paymentMethod: 'vnpay',
  });

  return {
    userId: user._id,
    plan: user.plan,
    planStartedAt: user.planStartedAt,
    planExpiresAt: user.planExpiresAt,
    status: 'active',
  };
}

async function listTransactions(query) {
  const { page, limit, skip } = parsePagination(query, {
    page: 1,
    limit: 10,
    maxLimit: 100
  });
  const sort = parseSort(query, {
    field: 'createdAt',
    order: -1,
    allowedFields: ['createdAt', 'amount']
  });

  const [items, total] = await Promise.all([
    Transaction.find({})
      .populate('user', 'name email avatarUrl')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments({})
  ]);

  return {
    data: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
  };
}

async function updateTransaction(id, payload) {
  const updateData = {};
  if (payload.status) updateData.status = payload.status;
  
  const tx = await Transaction.findByIdAndUpdate(id, updateData, { new: true }).lean();
  if (!tx) throw new HttpError(404, 'Transaction not found');
  
  return tx;
}

async function getAnalytics(startDate, endDate) {
  const match = { status: 'completed' };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const [summary] = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
      }
    }
  ]);

  const planDistribution = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$planPurchased',
        count: { $sum: 1 },
        revenue: { $sum: '$amount' }
      }
    },
    { $project: { name: '$_id', count: 1, revenue: 1, _id: 0 } }
  ]);

  const revenueOverTime = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        transactions: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    { $project: { date: '$_id', revenue: 1, transactions: 1, _id: 0 } }
  ]);

  return {
    summary: summary || { totalRevenue: 0, totalTransactions: 0 },
    planDistribution,
    revenueOverTime
  };
}

module.exports = {
  getPlans,
  updatePlans,
  getAnalytics,
  processCheckout,
  listTransactions,
  updateTransaction,
};
