const express = require('express');
const {
  listItems,
  createItem,
  updateItem,
  deleteItem
} = require('../controllers/taxonomy.controller');
const authenticate = require('../middlewares/authenticate');
const authorizeRole = require('../middlewares/authorize-role');

const router = express.Router();

// :type can be 'category', 'country', 'quality', or 'format'
router.get('/:type', listItems);
router.post('/:type', authenticate, authorizeRole(['admin']), createItem);
router.put('/:type/:id', authenticate, authorizeRole(['admin']), updateItem);
router.delete('/:type/:id', authenticate, authorizeRole(['admin']), deleteItem);

module.exports = router;
