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
const localUploadDir = path.join(__dirname, '../../data/uploads');

function ensureLocalUploadDir() {
  fs.mkdirSync(localUploadDir, { recursive: true });
}

function buildAbsoluteUploadUrl(req, filename) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${filename}`;
}

function fileFilter(_req, _file, cb) {
  cb(null, true);
}

function createUpload() {
  const limits = {
    // Videos can be large; adjust via env: UPLOAD_MAX_FILE_SIZE_MB.
    fileSize: Math.max(config.uploadMaxFileSizeMb, 1) * 1024 * 1024,
  };

  if (!cloudinaryConfig.enabled) {
    ensureLocalUploadDir();

    const localStorage = multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, localUploadDir);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').slice(0, 16).toLowerCase();
        cb(null, `${crypto.randomUUID()}${ext}`);
      },
    });

    return multer({
      storage: localStorage,
      limits,
      fileFilter,
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

    if (!cloudUrl && !file.filename) {
      return res.status(500).json(errorResponse('Failed to retrieve secure upload URL'));
    }

    const url = cloudUrl || buildAbsoluteUploadUrl(req, file.filename);
    const provider = cloudUrl ? 'cloudinary' : 'local';

    return res.status(201).json(
      successResponse({
        url,
        filename: file.filename || null,
        mimetype: file.mimetype,
        size: file.size,
        provider,
      }),
    );
  },
);

module.exports = router;
