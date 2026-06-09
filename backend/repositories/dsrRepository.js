export function mapDsr(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    area: row.area,
    status: row.status,
  };
}

function buildDsrSearchClause(search, params) {
  if (!search) {
    return '';
  }

  params.push(`%${search}%`);
  return `WHERE (name ILIKE $${params.length} OR area ILIKE $${params.length} OR phone ILIKE $${params.length})`;
}

export async function countDsrs(client, { search } = {}) {
  const params = [];
  const where = buildDsrSearchClause(search, params);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM dsrs ${where}`, params);
  return result.rows[0].count;
}

export async function listDsrsPage(client, { search, limit, offset }) {
  const params = [];
  const where = buildDsrSearchClause(search, params);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT * FROM dsrs ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapDsr);
}

export async function listAllActiveDsrsLite(client) {
  const result = await client.query('SELECT id, name, area, phone, status FROM dsrs ORDER BY name ASC');
  return result.rows.map(mapDsr);
}

export function insertDsr(client, dsr) {
  return client.query(
    `INSERT INTO dsrs (id, name, phone, area, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [dsr.id, dsr.name, dsr.phone, dsr.area, dsr.status],
  );
}

export function updateDsr(client, dsr) {
  return client.query(
    `UPDATE dsrs
     SET name = $2, phone = $3, area = $4, status = $5
     WHERE id = $1
     RETURNING *`,
    [dsr.id, dsr.name, dsr.phone, dsr.area, dsr.status],
  );
}

export function deleteDsr(client, dsrId) {
  return client.query('DELETE FROM dsrs WHERE id = $1', [dsrId]);
}

export function findDsrById(client, dsrId) {
  return client.query('SELECT * FROM dsrs WHERE id = $1 LIMIT 1', [dsrId]);
}

export function syncDsrHistory(client, dsr) {
  return Promise.all([
    client.query(
      `UPDATE issues
       SET dsr_name = $2, phone = $3, area = $4
       WHERE dsr_id = $1`,
      [dsr.id, dsr.name, dsr.phone, dsr.area],
    ),
    client.query(
      `UPDATE settlements
       SET dsr_name = $2, phone = $3, area = $4
       WHERE dsr_id = $1`,
      [dsr.id, dsr.name, dsr.phone, dsr.area],
    ),
  ]);
}
