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

export async function listActivityLogs(client, limit = 100) {
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
    ORDER BY activity_logs.created_at DESC
    LIMIT $1`,
    [limit],
  );

  return result.rows.map(mapActivityLog);
}

