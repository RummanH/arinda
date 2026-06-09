import { assert } from '../lib/errors.js';
import { createId } from '../lib/ids.js';
import { hashPassword } from '../lib/passwords.js';
import { USER_ROLES, TENANT_ROLE_VALUES } from '../lib/roles.js';
import { findUserByEmail, findUserById, insertUser, listUsers as listUsersRepo, updateUser as updateUserRepo } from '../repositories/userRepository.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeName(name) {
  return String(name || '').trim();
}

function normalizeRole(role) {
  const value = String(role || '').trim();
  assert(TENANT_ROLE_VALUES.includes(value), 'Invalid role.');
  return value;
}

function normalizeStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  assert(['active', 'inactive'].includes(value), 'Invalid status.');
  return value;
}

export class UserService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async listUsers(actor) {
    const client = await this.databaseManager.getPool().connect();
    try {
      return await listUsersRepo(client, actor.tenantId);
    } finally {
      client.release();
    }
  }

  async createUser(input, actor) {
    const name = normalizeName(input.name);
    const email = normalizeEmail(input.email);
    const password = String(input.password || '');
    const role = normalizeRole(input.role || USER_ROLES.OPERATOR);
    const status = normalizeStatus(input.status || 'active');

    assert(name && email && password, 'Name, email, and password are required.');

    await this.databaseManager.withTransaction(async (client) => {
      const existingUser = await findUserByEmail(client, email, actor.tenantId);
      assert(!existingUser, 'A user with this email already exists.');

      const user = {
        id: createId('user'),
        name,
        email,
        passwordHash: await hashPassword(password),
        role,
        status,
        tenantId: actor.tenantId,
      };

      await insertUser(client, user);
      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: 'user.create',
        entityType: 'user',
        entityId: user.id,
        description: `${actor.name} created user ${user.email}`,
        metadata: { role, status },
      });
    });

    return this.listUsers(actor);
  }

  async updateUser(userId, input, actor) {
    let nextEmail = '';

    await this.databaseManager.withTransaction(async (client) => {
      const existingUser = await findUserById(client, userId);
      assert(existingUser, 'User not found.', 404);
      assert(existingUser.tenant_id === actor.tenantId, 'User not found.', 404);

      const nextName = input.name === undefined ? existingUser.name : normalizeName(input.name);
      nextEmail = input.email === undefined ? existingUser.email : normalizeEmail(input.email);
      const nextRole = input.role === undefined ? existingUser.role : normalizeRole(input.role);
      const nextStatus = input.status === undefined ? existingUser.status : normalizeStatus(input.status);
      const nextPasswordHash = input.password ? await hashPassword(String(input.password)) : null;

      if (nextEmail !== existingUser.email) {
        const duplicateUser = await findUserByEmail(client, nextEmail, actor.tenantId);
        assert(!duplicateUser || duplicateUser.id === userId, 'A user with this email already exists.');
      }

      await updateUserRepo(client, {
        id: userId,
        tenantId: actor.tenantId,
        name: nextName,
        email: nextEmail,
        passwordHash: nextPasswordHash,
        role: nextRole,
        status: nextStatus,
      });

      await this.auditService.record(client, {
        tenantId: actor.tenantId,
        userId: actor.id,
        actionType: 'user.update',
        entityType: 'user',
        entityId: userId,
        description: `${actor.name} updated user ${nextEmail}`,
        metadata: {
          role: nextRole,
          status: nextStatus,
          passwordChanged: Boolean(nextPasswordHash),
        },
      });
    });

    return this.listUsers(actor);
  }
}
