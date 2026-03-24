const express = require('express');
const router = express.Router();
const personController = require('../controllers/person.controller');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize-role');

// Public routes
router.get('/', personController.getPersons);
router.get('/roles', personController.getUniqueRoles);
router.get('/:slug', personController.getPersonDetails);

// Admin routes
router.post('/', authenticate, authorize('admin', 'super'), personController.createPerson);
router.put('/:id', authenticate, authorize('admin', 'super'), personController.updatePerson);
router.delete('/:id', authenticate, authorize('admin', 'super'), personController.deletePerson);

module.exports = router;
