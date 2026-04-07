const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const config = require('../config/env');
const cloudinaryConfig = require('../config/cloudinary');
const authenticate = require('../middlewares/authenticate');
const authorizeRole = require('../middlewares/authorize-role');
const { errorResponse, successResponse } = require('../utils/api-response');

const router = express.Router();

function createUpload() {
  const limits = {
    // Videos can be large; adjust via env: UPLOAD_MAX_FILE_SIZE_MB.
    fileSize: Math.max(config.uploadMaxFileSizeMb, 1) * 1024 * 1024,
  };

  if (!cloudinaryConfig.enabled) {
    // If Cloudinary is disabled, return a multer that will error out on upload attempts.
    return multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 0 },
      fileFilter: (_req, _file, cb) => cb(new Error('Cloudinary is not configured. Upload disabled.')),
    });
  }

  const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinaryConfig.cloudinary,
    params: async (_req, file) => {
      const ext = path.extname(file.originalname || '').slice(0, 16).toLowerCase();
      const publicId = `${crypto.randomUUID()}${ext}`;
      return {
        folder: cloudinaryConfig.folder,
        resource_type: 'auto',
        public_id: publicId,
      };
    },
  });

  return multer({ storage: cloudinaryStorage, limits, fileFilter });
}

const upload = createUpload();

router.post(
  '/',
  authenticate,
  authorizeRole(['admin']),
  upload.single('file'),
  (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json(errorResponse('No file uploaded or upload failed'));
    }

    // When using CloudinaryStorage, multer exposes `path` as the hosted URL.
    const cloudUrl = typeof file.path === 'string' && (file.path.startsWith('http://') || file.path.startsWith('https://'))
      ? file.path
      : null;

    if (!cloudUrl) {
      return res.status(500).json(errorResponse('Failed to retrieve secure upload URL'));
    }

    return res.status(201).json(
      successResponse({
        url: cloudUrl,
        filename: file.filename || null,
        mimetype: file.mimetype,
        size: file.size,
        provider: 'cloudinary',
      }),
    );
  },
);

module.exports = router;
