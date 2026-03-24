const RolePermission = require('../models/role-permission.model');

const ROLE_KEYS = Object.freeze(['super', 'admin', 'editor', 'moderator', 'user']);

// Keep codes stable; UI can evolve on top of this set.
const ALL_CODES = Object.freeze([
  // Movies
  'AC_MOVIES_VIEW',
  'AC_MOVIES_CREATE',
  'AC_MOVIES_EDIT',
  'AC_MOVIES_DELETE',
  // Comments
  'AC_COMMENTS_VIEW',
  'AC_COMMENTS_MODERATE',
  'AC_COMMENTS_DELETE',
  // Taxonomies
  'AC_TAXONOMIES_VIEW',
  'AC_TAXONOMIES_EDIT',
  // Users
  'AC_USERS_VIEW',
  'AC_USERS_CREATE',
  'AC_USERS_EDIT',
  'AC_USERS_DELETE',
  // Analytics
  'AC_ANALYTICS_VIEW',
  // Settings
  'AC_SETTINGS_VIEW',
  'AC_SETTINGS_EDIT',
  // Advanced
  'AC_SYS_BYPASS_MAINTENANCE',
  'AC_SYS_API_KEYS',
  'AC_SYS_VIEW_LOGS',
  'AC_SYS_DB_BACKUP'
]);

const DEFAULT_ROLE_CODES = Object.freeze({
  super: ALL_CODES,
  admin: ALL_CODES,
  editor: [
    'AC_MOVIES_VIEW',
    'AC_MOVIES_CREATE',
    'AC_MOVIES_EDIT',
    'AC_TAXONOMIES_VIEW',
    'AC_TAXONOMIES_EDIT',
    'AC_COMMENTS_VIEW',
    'AC_COMMENTS_MODERATE',
    'AC_ANALYTICS_VIEW'
  ],
  moderator: ['AC_COMMENTS_VIEW', 'AC_COMMENTS_MODERATE', 'AC_COMMENTS_DELETE'],
  user: []
});

function normalizeRole(role) {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  return ROLE_KEYS.includes(normalized) ? normalized : 'user';
}

function normalizeCodes(input) {
  const list = Array.isArray(input) ? input : [];
  const seen = new Set();
  const out = [];

  for (const code of list) {
    if (typeof code !== 'string') continue;
    const trimmed = code.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }

  return out;
}

async function getRolePermission(role) {
  const r = normalizeRole(role);
  const existing = await RolePermission.findOne({ role: r }).lean();
  if (existing) return existing;

  const defaultCodes = DEFAULT_ROLE_CODES[r] || [];
  const created = await RolePermission.create({ role: r, codes: defaultCodes });
  return created.toObject();
}

async function listRolePermissions() {
  const docs = await RolePermission.find({}).sort({ role: 1 }).lean();
  const map = new Map(docs.map((d) => [d.role, d]));

  // Ensure all known roles exist with defaults.
  const items = [];
  for (const role of ROLE_KEYS) {
    if (map.has(role)) {
      items.push(map.get(role));
      continue;
    }
    const created = await RolePermission.create({
      role,
      codes: DEFAULT_ROLE_CODES[role] || []
    });
    items.push(created.toObject());
  }

  return items.map((d) => ({
    role: d.role,
    codes: Array.isArray(d.codes) ? d.codes : []
  }));
}

async function updateRolePermission(role, payload) {
  const r = normalizeRole(role);
  const codes = normalizeCodes(payload?.codes);

  const updated = await RolePermission.findOneAndUpdate(
    { role: r },
    { $set: { role: r, codes } },
    { upsert: true, new: true }
  ).lean();

  return {
    role: updated.role,
    codes: Array.isArray(updated.codes) ? updated.codes : []
  };
}

async function getCodesForRole(role) {
  const r = normalizeRole(role);
  const doc = await getRolePermission(r);
  const codes = Array.isArray(doc.codes) ? doc.codes : [];

  // Backward compatibility: if no codes configured, keep a small default set for admin.
  if (codes.length === 0 && r === 'admin') {
    codes.push(...ALL_CODES);
  }

  // Inject the role name itself into the codes array for simpler frontend checking
  if (!codes.includes(r)) {
    codes.push(r);
  }

  return codes;
}

module.exports = {
  ALL_CODES,
  ROLE_KEYS,
  getCodesForRole,
  getRolePermission,
  listRolePermissions,
  updateRolePermission
};

