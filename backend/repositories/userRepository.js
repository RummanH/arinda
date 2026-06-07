function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
  };
}

export async function countUsers(client) {
  const result = await client.query('SELECT COUNT(*)::INTEGER AS count FROM users');
  return result.rows[0].count;
}

export function insertUser(client, user) {
  return client.query(
    `INSERT INTO users (id, name, email, password_hash, role, status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user.id, user.name, user.email.toLowerCase(), user.passwordHash, user.role, user.status],
  );
}

export async function findUserByEmail(client, email) {
  const result = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return result.rows[0] || null;
}

export async function findUserById(client, id) {
  const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function listUsers(client) {
  const result = await client.query(
    `SELECT id, name, email, role, status, created_at, updated_at
     FROM users
     ORDER BY created_at DESC, name ASC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function insertUserSession(client, session) {
  return client.query(
    `INSERT INTO user_sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [session.id, session.userId, session.tokenHash, session.expiresAt],
  );
}

export function deleteUserSessionByTokenHash(client, tokenHash) {
  return client.query('DELETE FROM user_sessions WHERE token_hash = $1', [tokenHash]);
}

export function deleteExpiredUserSessions(client) {
  return client.query('DELETE FROM user_sessions WHERE expires_at <= NOW()');
}

export async function findActiveUserBySessionTokenHash(client, tokenHash) {
  const result = await client.query(
    `SELECT users.id, users.name, users.email, users.role, users.status
     FROM user_sessions
     INNER JOIN users ON users.id = user_sessions.user_id
     WHERE user_sessions.token_hash = $1
       AND user_sessions.expires_at > NOW()
       AND users.status = 'active'
     LIMIT 1`,
    [tokenHash],
  );

  return mapUser(result.rows[0]);
}

export function updateUser(client, user) {
  if (user.passwordHash) {
    return client.query(
      `UPDATE users
       SET name = $2,
           email = LOWER($3),
           password_hash = $4,
           role = $5,
           status = $6,
           updated_at = NOW()
       WHERE id = $1`,
      [user.id, user.name, user.email, user.passwordHash, user.role, user.status],
    );
  }

  return client.query(
    `UPDATE users
     SET name = $2,
         email = LOWER($3),
         role = $4,
         status = $5,
         updated_at = NOW()
     WHERE id = $1`,
    [user.id, user.name, user.email, user.role, user.status],
  );
}
