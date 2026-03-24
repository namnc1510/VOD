const Category = require('../models/category.model');
const Country = require('../models/country.model');
const Quality = require('../models/quality.model');
const Format = require('../models/format.model');
const { successResponse } = require('../utils/api-response');
const slugify = require('../utils/slug');

const getModel = (type) => {
  switch (type.toLowerCase()) {
    case 'category': return Category;
    case 'country': return Country;
    case 'quality': return Quality;
    case 'format': return Format;
    default: return null;
  }
};

async function ensureUniqueSlug(Model, baseSlug, excludeId) {
  let slug = baseSlug;
  let counter = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await Model.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}

async function listItems(req, res, next) {
  try {
    const Model = getModel(req.params.type);
    if (!Model) return res.status(400).json({ success: false, message: 'Invalid taxonomy type' });

    const items = await Model.find({}).sort({ name: 1 });
    return res.status(200).json(successResponse(items));
  } catch (error) {
    return next(error);
  }
}

async function createItem(req, res, next) {
  try {
    const Model = getModel(req.params.type);
    if (!Model) return res.status(400).json({ success: false, message: 'Invalid taxonomy type' });

    const payload = req.body && typeof req.body === 'object' ? { ...req.body } : {};
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name) {
      return res.status(400).json({ success: false, message: 'Missing name' });
    }

    payload.name = name;

    const rawSlug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
    const baseSlug = slugify(rawSlug || name);
    if (!baseSlug) {
      return res.status(400).json({ success: false, message: 'Invalid slug' });
    }

    payload.slug = await ensureUniqueSlug(Model, baseSlug);

    const item = await Model.create(payload);
    return res.status(201).json(successResponse(item));
  } catch (error) {
    return next(error);
  }
}

async function updateItem(req, res, next) {
  try {
    const Model = getModel(req.params.type);
    if (!Model) return res.status(400).json({ success: false, message: 'Invalid taxonomy type' });

    const payload = req.body && typeof req.body === 'object' ? { ...req.body } : {};

    if (payload.name !== undefined) {
      const name = typeof payload.name === 'string' ? payload.name.trim() : '';
      if (!name) {
        return res.status(400).json({ success: false, message: 'Invalid name' });
      }
      payload.name = name;
    }

    const hasSlug = payload.slug !== undefined;
    const hasName = payload.name !== undefined;

    if (hasSlug || hasName) {
      const rawSlug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
      const baseSlug = slugify(rawSlug || (typeof payload.name === 'string' ? payload.name : ''));
      if (baseSlug) {
        payload.slug = await ensureUniqueSlug(Model, baseSlug, req.params.id);
      }
    }

    const item = await Model.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    
    return res.status(200).json(successResponse(item));
  } catch (error) {
    return next(error);
  }
}

async function deleteItem(req, res, next) {
  try {
    const Model = getModel(req.params.type);
    if (!Model) return res.status(400).json({ success: false, message: 'Invalid taxonomy type' });

    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    return res.status(200).json(successResponse({ success: true }));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listItems,
  createItem,
  updateItem,
  deleteItem
};
