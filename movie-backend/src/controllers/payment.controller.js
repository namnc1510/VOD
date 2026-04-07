const paymentService = require('../services/payment.service');
const { successResponse } = require('../utils/api-response');

async function getPlans(req, res, next) {
  try {
    const plans = await paymentService.getPlans();
    return res.status(200).json(successResponse(plans));
  } catch (error) {
    return next(error);
  }
}

async function updatePlans(req, res, next) {
  try {
    const plans = await paymentService.updatePlans(req.body);
    return res.status(200).json(successResponse(plans, 'Pricing updated successfully'));
  } catch (error) {
    return next(error);
  }
}

async function checkout(req, res, next) {
  try {
    const { plan, billingCycle } = req.body;
    const userId = req.auth ? req.auth.userId : (req.user ? req.user._id : null);
    if (!userId) {
      throw new Error('User ID not found in authorized request');
    }

    const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const result = await paymentService.processCheckout(userId, plan, billingCycle, ipAddr);
    return res.status(200).json(successResponse(result));
  } catch (error) {
    return next(error);
  }
}

async function vnpayReturn(req, res, next) {
  try {
    const result = await paymentService.validateVnpayCallback(req.query);
    const config = require('../config/env');
    
    if (result.success) {
      return res.redirect(config.frontendPaymentSuccessUrl);
    } else {
      return res.redirect(`${config.frontendPaymentErrorUrl}?status=${result.status}`);
    }
  } catch (error) {
    const config = require('../config/env');
    console.error('VNPAY Return Error:', error);
    return res.redirect(`${config.frontendPaymentErrorUrl}?error=verification_failed`);
  }
}

async function vnpayIpn(req, res, next) {
  try {
    const result = await paymentService.validateVnpayCallback(req.query);
    return res.status(200).json({ RspCode: '00', Message: 'Confirm success' });
  } catch (error) {
    console.error('VNPAY IPN Error:', error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
}

async function listTransactions(req, res, next) {
  try {
    const result = await paymentService.listTransactions(req.query);
    return res.status(200).json(successResponse(result.data, result.meta));
  } catch (error) {
    return next(error);
  }
}

async function updateTransaction(req, res, next) {
  try {
    const result = await paymentService.updateTransaction(req.params.id, req.body);
    return res.status(200).json(successResponse(result, 'Transaction updated'));
  } catch (error) {
    return next(error);
  }
}

async function getAnalytics(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const data = await paymentService.getAnalytics(startDate, endDate);
    return res.status(200).json(successResponse(data));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPlans,
  updatePlans,
  getAnalytics,
  checkout,
  vnpayReturn,
  vnpayIpn,
  listTransactions,
  updateTransaction,
};
