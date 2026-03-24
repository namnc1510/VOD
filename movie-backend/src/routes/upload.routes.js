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

const uploadRoot = path.join(__dirname, '../../data/uploads');

function ensureUploadDir() {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureUploadDir();
      cb(null, uploadRoot);
    } catch (err) {
      cb(err, uploadRoot);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 16).toLowerCase();
    const name = `${crypto.randomUUID()}${ext}`;
    cb(null, name);
  },
});

function fileFilter(_req, file, cb) {
  const type = String(file?.mimetype || '').toLowerCase();
  // Allow images + videos only.
  if (type.startsWith('image/') || type.startsWith('video/')) {
    return cb(null, true);
  }
  return cb(new Error('Unsupported file type'), false);
}

function createUpload() {
  const limits = {
    // Videos can be large; adjust via env: UPLOAD_MAX_FILE_SIZE_MB.
    fileSize: Math.max(config.uploadMaxFileSizeMb, 1) * 1024 * 1024,
  };

  if (!cloudinaryConfig.enabled) {
    return multer({ storage, limits, fileFilter });
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
      return res.status(400).json(errorResponse('No file uploaded'));
    }

    // When using CloudinaryStorage, multer exposes `path` as the hosted URL.
    const cloudUrl = typeof file.path === 'string' && (file.path.startsWith('http://') || file.path.startsWith('https://'))
      ? file.path
      : null;

    return res.status(201).json(
      successResponse({
        url: cloudUrl || (() => {
          const publicPath = `/uploads/${file.filename}`;
          const baseUrl = `${req.protocol}://${req.get('host')}`;
          return `${baseUrl}${publicPath}`;
        })(),
        path: cloudUrl ? null : `/uploads/${file.filename}`,
        filename: file.filename || null,
        mimetype: file.mimetype,
        size: file.size,
        provider: cloudUrl ? 'cloudinary' : 'local',
      }),
    );
  },
);

module.exports = router;
