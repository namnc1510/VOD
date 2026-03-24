const express = require('express');
const authRoutes = require('./auth.routes');
const dashboardRoutes = require('./dashboard.routes');
const discoveryRoutes = require('./discovery.routes');
const healthRoutes = require('./health.routes');
const movieRoutes = require('./movie.routes');
const commentRoutes = require('./comment.routes');
const userRoutes = require('./user.routes');
const watchlistRoutes = require('./watchlist.routes');
const taxonomyRoutes = require('./taxonomy.routes');
const uploadRoutes = require('./upload.routes');
const episodeRoutes = require('./episode.routes');
const settingRoutes = require('./setting.routes');
const permissionRoutes = require('./permission.routes');
const paymentRoutes = require('./payment.routes');
const personRoutes = require('./person.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/discovery', discoveryRoutes);
router.use('/health', healthRoutes);
router.use('/movies', movieRoutes);
router.use('/comments', commentRoutes);
router.use('/users', userRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/taxonomies', taxonomyRoutes);
router.use('/upload', uploadRoutes);
router.use('/episodes', episodeRoutes);
router.use('/settings', settingRoutes);
router.use('/permissions', permissionRoutes);
router.use('/payment', paymentRoutes);
router.use('/persons', personRoutes);

module.exports = router;
