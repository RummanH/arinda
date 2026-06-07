import { assert } from '../lib/errors.js';
import { createId } from '../lib/ids.js';
import { verifyPassword } from '../lib/passwords.js';
import { createSessionToken, hashSessionToken } from '../lib/sessionTokens.js';
import {
  deleteExpiredUserSessions,
  deleteUserSessionByTokenHash,
  findActiveUserBySessionTokenHash,
  findUserByEmail,
  insertUserSession,
} from '../repositories/userRepository.js';

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
  };
}

export class AuthService {
  constructor(databaseManager, { sessionDays, auditService }) {
    this.databaseManager = databaseManager;
    this.sessionDays = sessionDays;
    this.auditService = auditService;
  }

  getSessionMaxAgeMs() {
    return this.sessionDays * 24 * 60 * 60 * 1000;
  }

  async login(input) {
    const email = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');

    assert(email && password, 'Email and password are required.');

    return this.databaseManager.withTransaction(async (client) => {
      await deleteExpiredUserSessions(client);

      const userRow = await findUserByEmail(client, email);
      const validPassword = userRow ? await verifyPassword(password, userRow.password_hash) : false;
      assert(userRow && userRow.status === 'active' && validPassword, 'Invalid email or password.', 401);

      const token = createSessionToken();
      const tokenHash = hashSessionToken(token);
      const expiresAt = new Date(Date.now() + this.getSessionMaxAgeMs());

      await insertUserSession(client, {
        id: createId('session'),
        userId: userRow.id,
        tokenHash,
        expiresAt,
      });

      await this.auditService.record(client, {
        userId: userRow.id,
        actionType: 'auth.login',
        entityType: 'session',
        entityId: tokenHash.slice(0, 12),
        description: `${userRow.name} logged in`,
        metadata: { email: userRow.email, role: userRow.role },
      });

      return {
        token,
        user: mapUser(userRow),
      };
    });
  }

  async getUserFromSessionToken(token) {
    if (!token) {
      return null;
    }

    const client = await this.databaseManager.getPool().connect();
    try {
      return await findActiveUserBySessionTokenHash(client, hashSessionToken(token));
    } finally {
      client.release();
    }
  }

  async logout(token) {
    if (!token) {
      return;
    }

    await this.databaseManager.withTransaction(async (client) => {
      await deleteExpiredUserSessions(client);
      const tokenHash = hashSessionToken(token);
      const user = await findActiveUserBySessionTokenHash(client, tokenHash);
      await deleteUserSessionByTokenHash(client, tokenHash);

      if (user) {
        await this.auditService.record(client, {
          userId: user.id,
          actionType: 'auth.logout',
          entityType: 'session',
          entityId: tokenHash.slice(0, 12),
          description: `${user.name} logged out`,
          metadata: { email: user.email, role: user.role },
        });
      }
    });
  }
}
