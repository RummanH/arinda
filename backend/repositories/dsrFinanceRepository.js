function mapRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    date: row.record_date,
    dsrId: row.dsr_id,
    dsrName: row.dsr_name,
    dsrArea: row.dsr_area,
    dsrPhone: row.dsr_phone,
    amount: Number(row.amount),
    note: row.note,
    performedById: row.performed_by_id,
    performedByName: row.performed_by_name,
    performedByEmail: row.performed_by_email,
    performedByRole: row.performed_by_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSelect(config) {
  return `SELECT
      ${config.table}.id,
      ${config.table}.${config.dateColumn} AS record_date,
      ${config.table}.dsr_id,
      ${config.table}.amount,
      ${config.table}.note,
      ${config.table}.created_at,
      ${config.table}.updated_at,
      dsrs.name AS dsr_name,
      dsrs.area AS dsr_area,
      dsrs.phone AS dsr_phone,
      users.id AS performed_by_id,
      users.name AS performed_by_name,
      users.email AS performed_by_email,
      users.role AS performed_by_role
    FROM ${config.table}
    LEFT JOIN dsrs ON dsrs.id = ${config.table}.dsr_id
    LEFT JOIN users ON users.id = ${config.table}.${config.ownerColumn}`;
}

export async function findRecordById(client, config, recordId) {
  const result = await client.query(
    `${buildSelect(config)}
     WHERE ${config.table}.id = $1
     LIMIT 1`,
    [recordId],
  );

  return mapRecord(result.rows[0]);
}

export async function listRecordsInRange(client, config, startDate, endDate, dsrId = '') {
  const params = [startDate, endDate];
  const conditions = [`${config.table}.${config.dateColumn} >= $1`, `${config.table}.${config.dateColumn} < $2`];

  if (dsrId) {
    params.push(dsrId);
    conditions.push(`${config.table}.dsr_id = $${params.length}`);
  }

  const result = await client.query(
    `${buildSelect(config)}
     WHERE ${conditions.join(' AND ')}
     ORDER BY ${config.table}.${config.dateColumn} DESC, ${config.table}.created_at DESC`,
    params,
  );

  return result.rows.map(mapRecord);
}

export function insertRecord(client, config, record) {
  return client.query(
    `INSERT INTO ${config.table} (id, ${config.dateColumn}, dsr_id, amount, note, ${config.ownerColumn})
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [record.id, record.date, record.dsrId, record.amount, record.note, record.performedBy],
  );
}

export function updateRecord(client, config, record) {
  return client.query(
    `UPDATE ${config.table}
     SET ${config.dateColumn} = $2,
         dsr_id = $3,
         amount = $4,
         note = $5,
         updated_at = NOW()
     WHERE id = $1`,
    [record.id, record.date, record.dsrId, record.amount, record.note],
  );
}

export function deleteRecord(client, config, recordId) {
  return client.query(`DELETE FROM ${config.table} WHERE id = $1`, [recordId]);
}

