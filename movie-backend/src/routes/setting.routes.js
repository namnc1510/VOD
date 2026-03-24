const express = require('express');

const authenticate = require('../middlewares/authenticate');
const authorizeRole = require('../middlewares/authorize-role');
const validateBody = require('../middlewares/validate-body');

const { getPublicSettings, getSettings, updateSettings } = require('../controllers/setting.controller');

const router = express.Router();

const updateSettingsSchema = {
  siteName: {
    required: false,
    type: 'string',
    minLength: 2,
    maxLength: 120
  },
  timezone: {
    required: false,
    type: 'string',
    maxLength: 120
  },
  description: {
    required: false,
    type: 'string',
    maxLength: 1000
  },
  darkMode: {
    required: false,
    type: 'boolean'
  },
  themeColor: {
    required: false,
    type: 'string',
    maxLength: 16
  },
  layout: {
    required: false,
    type: 'string',
    enum: ['side', 'top']
  },
  metaTitle: {
    required: false,
    type: 'string',
    maxLength: 140
  },
  gaId: {
    required: false,
    type: 'string',
    maxLength: 64
  },
  keywords: {
    required: false,
    type: 'array',
    elementType: 'string',
    maxItems: 50
  },
  logoUrl: {
    required: false,
    type: 'string',
    maxLength: 500
  },
  faviconUrl: {
    required: false,
    type: 'string',
    maxLength: 500
  },
  cdnBaseUrl: {
    required: false,
    type: 'string',
    maxLength: 500
  },
  homeHeroMovieIds: {
    required: false,
    type: 'array',
    elementType: 'string',
    maxItems: 30
  },
  homeHeroLimit: {
    required: false,
    type: 'number',
    min: 1,
    max: 12
  },
  homeHeroAutofill: {
    required: false,
    type: 'boolean'
  }
};

router.get('/public', getPublicSettings);
router.get('/', authenticate, authorizeRole(['admin', 'super']), getSettings);
router.put('/', authenticate, authorizeRole(['admin', 'super']), validateBody(updateSettingsSchema), updateSettings);

module.exports = router;
