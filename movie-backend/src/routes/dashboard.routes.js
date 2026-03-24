const express = require('express');

const { getOverview, getRevenue } = require('../controllers/dashboard.controller');
const authenticate = require('../middlewares/authenticate');

const router = express.Router();

router.get('/overview', authenticate, getOverview);
router.get('/revenue', authenticate, getRevenue);

module.exports = router;
