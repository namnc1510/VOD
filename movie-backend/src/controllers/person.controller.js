const personService = require('../services/person.service');
const { successResponse } = require('../utils/api-response');

async function getPersons(req, res, next) {
  try {
    const params = {
      search: req.query.search,
      knownFor: req.query.knownFor,
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
      sort: req.query.sort || '-views'
    };

    const result = await personService.getPersons(params);
    return res.status(200).json(successResponse(result.items, result.meta));
  } catch (error) {
    return next(error);
  }
}

async function getPersonDetails(req, res, next) {
  try {
    const { slug } = req.params;
    const person = await personService.getPersonBySlug(slug);
    return res.status(200).json(successResponse(person));
  } catch (error) {
    return next(error);
  }
}

async function createPerson(req, res, next) {
  try {
    const person = await personService.createPerson(req.body);
    return res.status(201).json(successResponse(person));
  } catch (error) {
    return next(error);
  }
}

async function updatePerson(req, res, next) {
  try {
    const person = await personService.updatePerson(req.params.id, req.body);
    return res.status(200).json(successResponse(person));
  } catch (error) {
    return next(error);
  }
}

async function deletePerson(req, res, next) {
  try {
    await personService.deletePerson(req.params.id);
    return res.status(200).json(successResponse(null, 'Person deleted successfully'));
  } catch (error) {
    return next(error);
  }
}

async function getUniqueRoles(req, res, next) {
  try {
    const roles = await personService.getUniqueRoles();
    return res.status(200).json(successResponse(roles));
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getPersons,
  getPersonDetails,
  createPerson,
  updatePerson,
  deletePerson,
  getUniqueRoles
};
