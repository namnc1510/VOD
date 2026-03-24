const Person = require('../models/person.model');
const Movie = require('../models/movie.model');
const HttpError = require('../utils/http-error');

async function getPersons(params = {}) {
  const { search, knownFor, page = 1, limit = 20, sort = '-views' } = params;
  
  const query = {};
  if (knownFor) {
    query.knownFor = knownFor;
  }
  if (search) {
    query.$text = { $search: search };
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Person.find(query)
      .sort(search ? { score: { $meta: 'textScore' } } : sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Person.countDocuments(query)
  ]);

  return {
    items,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function getPersonBySlug(slug) {
  const person = await Person.findOneAndUpdate(
    { slug },
    { $inc: { views: 1 } },
    { new: true }
  ).lean();

  if (!person) {
    throw new HttpError(404, 'Person not found');
  }

  // Find all movies this person is part of (actor or director or legacy string match)
  const escapedName = person.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nameRegex = new RegExp(escapedName, 'i');

  const movies = await Movie.find({
    status: 'released',
    deletedAt: null,
    $or: [
      { actors: person._id },
      { directors: person._id },
      { cast: nameRegex },
      { director: nameRegex }
    ]
  })
    .select('title slug posterUrl type accessMode releaseYear rating')
    .sort('-releaseYear')
    .lean();

  const result = {
    ...person,
    movies
  };

  return result;
}

async function createPerson(data) {
  const person = await Person.create(data);
  return person;
}

async function updatePerson(id, data) {
  const person = await Person.findByIdAndUpdate(id, data, { new: true });
  if (!person) throw new HttpError(404, 'Person not found');
  return person;
}

async function deletePerson(id) {
  const person = await Person.findByIdAndDelete(id);
  if (!person) throw new HttpError(404, 'Person not found');
  
  // Also remove from movies
  await Movie.updateMany(
    { $or: [{ actors: id }, { directors: id }] },
    { $pull: { actors: id, directors: id } }
  );
  
  return true;
}

async function getUniqueRoles() {
  const roles = await Person.distinct('knownFor');
  return roles;
}

module.exports = {
  getPersons,
  getPersonBySlug,
  createPerson,
  updatePerson,
  deletePerson,
  getUniqueRoles
};
