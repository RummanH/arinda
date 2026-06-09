function mapActivityLog(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    userRole: row.user_role,
    actionType: row.action_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    description: row.description,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

function buildActivityLogSearchClause(search, params) {
  if (!search) {
    return '';
  }

  params.push(`%${search}%`);
  const index = params.length;
  return `WHERE (
    users.name ILIKE $${index}
    OR users.email ILIKE $${index}
    OR activity_logs.action_type ILIKE $${index}
    OR activity_logs.entity_type ILIKE $${index}
    OR activity_logs.entity_id ILIKE $${index}
    OR activity_logs.description ILIKE $${index}
  )`;
}

export function insertActivityLog(client, log) {
  return client.query(
    `INSERT INTO activity_logs (
      id, user_id, action_type, entity_type, entity_id, description, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      log.id,
      log.userId,
      log.actionType,
      log.entityType,
      log.entityId,
      log.description,
      log.metadata || {},
    ],
  );
}

export async function countActivityLogs(client, { search } = {}) {
  const params = [];
  const where = buildActivityLogSearchClause(search, params);
  const result = await client.query(
    `SELECT COUNT(*)::INTEGER AS count
     FROM activity_logs
     LEFT JOIN users ON users.id = activity_logs.user_id
     ${where}`,
    params,
  );
  return result.rows[0].count;
}

export async function listActivityLogsPage(client, { search, limit, offset }) {
  const params = [];
  const where = buildActivityLogSearchClause(search, params);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT
      activity_logs.id,
      activity_logs.user_id,
      activity_logs.action_type,
      activity_logs.entity_type,
      activity_logs.entity_id,
      activity_logs.description,
      activity_logs.metadata,
      activity_logs.created_at,
      users.name AS user_name,
      users.email AS user_email,
      users.role AS user_role
    FROM activity_logs
    LEFT JOIN users ON users.id = activity_logs.user_id
    ${where}
    ORDER BY activity_logs.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );

  return result.rows.map(mapActivityLog);
}

