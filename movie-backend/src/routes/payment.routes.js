const express = require('express');
const paymentController = require('../controllers/payment.controller');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();

router.get('/plans', paymentController.getPlans);

router.use(authenticate); // Must be logged in
router.post('/checkout', paymentController.checkout);

// Admin routes for overriding pricing and viewing analytics
const authorize = require('../middlewares/authorize-role');
router.put('/plans', authorize('admin', 'super'), paymentController.updatePlans);
router.get('/analytics', authorize('admin', 'super'), paymentController.getAnalytics);

router.get('/transactions', paymentController.listTransactions);
router.put('/transactions/:id', paymentController.updateTransaction);

module.exports = router;
