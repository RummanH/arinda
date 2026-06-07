import { assert } from '../lib/errors.js';
import { hasPermission, PERMISSIONS } from '../lib/permissions.js';

export function requirePermission(permission) {
  return (req, _res, next) => {
    const role = req.currentUser?.role;
    assert(role && hasPermission(role, permission), 'Forbidden.', 403);
    next();
  };
}

export function requireAnyPermission(...permissions) {
  return (req, _res, next) => {
    const role = req.currentUser?.role;
    const allowed = permissions.some((permission) => role && hasPermission(role, permission));
    assert(allowed, 'Forbidden.', 403);
    next();
  };
}

export function requireAdminAccess() {
  return requireAnyPermission(PERMISSIONS.MANAGE_PRODUCTS, PERMISSIONS.VIEW_ACTIVITY_LOGS);
}

