import { createSchema } from '../db/schema.js';
import { createId } from '../lib/ids.js';
import { hashPassword } from '../lib/passwords.js';
import { USER_ROLES } from '../lib/roles.js';
import { countUsers, insertUser } from '../repositories/userRepository.js';

async function seedSuperAdminIfEmpty(pool, env) {
  const userCount = await countUsers(pool);
  if (userCount > 0) {
    return;
  }

  await insertUser(pool, {
    id: createId('user'),
    name: env.DEFAULT_SUPER_ADMIN_NAME,
    email: env.DEFAULT_SUPER_ADMIN_EMAIL,
    passwordHash: await hashPassword(env.DEFAULT_SUPER_ADMIN_PASSWORD),
    role: USER_ROLES.SUPER_ADMIN,
    status: 'active',
  });
}

export async function initializeDatabase(databaseManager, env) {
  try {
    await createSchema(databaseManager.getPool());
  } catch (error) {
    if (error.code !== '3D000') {
      throw error;
    }

    await databaseManager.switchToFallbackDatabase();
    await createSchema(databaseManager.getPool());
  }

  const pool = databaseManager.getPool();

  await seedSuperAdminIfEmpty(pool, env);
}
