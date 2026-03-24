const cloudinary = require('cloudinary').v2;

const config = require('./env');

function isCloudinaryEnabled() {
  if (config.cloudinaryUrl && String(config.cloudinaryUrl).trim()) return true;

  return Boolean(
    config.cloudinaryCloudName &&
      config.cloudinaryApiKey &&
      config.cloudinaryApiSecret,
  );
}

function configureCloudinary() {
  if (!isCloudinaryEnabled()) return false;

  // Prefer CLOUDINARY_URL if provided (recommended by Cloudinary).
  if (config.cloudinaryUrl && String(config.cloudinaryUrl).trim()) {
    cloudinary.config({ cloudinary_url: config.cloudinaryUrl });
    return true;
  }

  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
  });

  return true;
}

const enabled = configureCloudinary();

module.exports = {
  cloudinary,
  enabled,
  folder: config.cloudinaryFolder || 'movie-uploads',
};

