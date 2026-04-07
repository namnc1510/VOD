const crypto = require('crypto');
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');
const Setting = require('../models/setting.model');
const config = require('../config/env');
const HttpError = require('../utils/http-error');
const { parsePagination, parseSort } = require('../utils/query');

function formatVnpayDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}${h}${min}${s}`;
}

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

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

async function processCheckout(userId, plan, billingCycle, ipAddr) {
  const validPlans = ['free', 'standard', 'premium', 'ultimate'];
  if (!validPlans.includes(plan)) {
    throw new HttpError(400, 'Invalid subscription plan selected');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  // Price matrix based on backend DB pricing
  const plans = await getPlans();
  const planData = plans[plan] || { monthly: 0, annual: 0 };
  let amount = billingCycle === 'annual' ? planData.annual : planData.monthly;

  if (amount <= 0) {
    // Handling free plan or zero amount
    user.plan = plan;
    user.planStartedAt = new Date();
    user.planExpiresAt = null; // Infinite for free
    await user.save();
    return { status: 'success', message: 'Free plan activated' };
  }

  // Create pending transaction record
  const transaction = await Transaction.create({
    user: user._id,
    amount,
    currency: 'VND',
    planPurchased: plan,
    billingCycle: billingCycle,
    status: 'pending',
    paymentMethod: 'vnpay',
  });

  // Generate VNPAY URL
  const date = new Date();
  const createDate = formatVnpayDate(date);
  const orderId = transaction._id.toString();

  const vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: config.vnpTmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: `Thanh toan goi ${plan} (${billingCycle}) cho user ${user.email}`,
    vnp_OrderType: 'other',
    vnp_Amount: amount * 100, // VNPAY amount is in VND cents
    vnp_ReturnUrl: config.vnpReturnUrl,
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortObject(vnp_Params);
  const signData = new URLSearchParams(sortedParams).toString();
  const hmac = crypto.createHmac('sha512', config.vnpHashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  
  const paymentUrl = `${config.vnpUrl}?${signData}&vnp_SecureHash=${signed}`;

  return {
    status: 'pending',
    paymentUrl,
    transactionId: orderId
  };
}

async function validateVnpayCallback(vnpParams) {
  const secureHash = vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHashType'];

  const sortedParams = sortObject(vnpParams);
  const signData = new URLSearchParams(sortedParams).toString();
  const hmac = crypto.createHmac('sha512', config.vnpHashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  if (secureHash !== signed) {
    throw new HttpError(400, 'Invalid VNPAY signature');
  }

  const orderId = vnpParams['vnp_TxnRef'];
  const responseCode = vnpParams['vnp_ResponseCode'];
  const transaction = await Transaction.findById(orderId);

  if (!transaction) {
    throw new HttpError(404, 'Transaction not found');
  }

  if (transaction.status !== 'pending') {
    return { status: transaction.status, alreadyProcessed: true };
  }

  if (responseCode === '00') {
    // Success
    transaction.status = 'completed';
    await transaction.save();

    // Upgrade user
    const user = await User.findById(transaction.user);
    if (user) {
      const now = new Date();
      if (transaction.billingCycle === 'annual') {
        now.setFullYear(now.getFullYear() + 1);
      } else {
        now.setMonth(now.getMonth() + 1);
      }
      user.plan = transaction.planPurchased;
      user.planStartedAt = new Date();
      user.planExpiresAt = now;
      await user.save();
    }
    return { status: 'completed', success: true };
  } else {
    // Failed
    transaction.status = 'failed';
    await transaction.save();
    return { status: 'failed', success: false };
  }
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
  validateVnpayCallback,
};
