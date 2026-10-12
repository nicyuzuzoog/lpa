import ApiError from '../utils/ApiError.js';

const ALL = ['SUPER_ADMIN', 'ACCOUNTANT', 'BIG_BOSS'];

export const PERMISSIONS = {
  'dashboard:read': ALL,
  'students:read': ALL,
  'students:create': ['SUPER_ADMIN', 'ACCOUNTANT'],
  'students:update': ['SUPER_ADMIN', 'ACCOUNTANT'],
  'students:archive': ['SUPER_ADMIN', 'ACCOUNTANT'],

  'classes:read': ALL,
  'classes:manage': ['SUPER_ADMIN'],
  'academicYears:read': ALL,
  'academicYears:manage': ['SUPER_ADMIN'],

  'fees:read': ALL,
  'fees:manageStructures': ['SUPER_ADMIN'],
  'fees:manageItems': ['SUPER_ADMIN', 'ACCOUNTANT'],

  'payments:read': ALL,
  'payments:create': ['SUPER_ADMIN', 'ACCOUNTANT'],
  'payments:update': ['SUPER_ADMIN', 'ACCOUNTANT'],
  'payments:reverse': ['SUPER_ADMIN', 'ACCOUNTANT'],
  'payments:delete': [],

  'inventory:read': ALL,
  'inventory:manage': ['SUPER_ADMIN', 'ACCOUNTANT'],

  'uniforms:read': ALL,
  'uniforms:manage': ['SUPER_ADMIN', 'ACCOUNTANT'],
  'uniforms:issue': ['SUPER_ADMIN', 'ACCOUNTANT'],

  'reports:read': ALL,
  'export': ALL,

  'notifications:read': ALL,
  'audit:read': ALL,

  'users:read': ['SUPER_ADMIN'],
  'users:manage': ['SUPER_ADMIN'],
  'settings:read': ALL,
  'settings:manage': ['SUPER_ADMIN'],
};

export function can(role, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required'));
    if (!can(req.user.role, permission)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}
