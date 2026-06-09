export function mapIssue(row) {
  return {
    id: row.id,
    date: row.issue_date,
    dsrId: row.dsr_id,
    dsrName: row.dsr_name,
    area: row.area,
    phone: row.phone,
    items: row.items,
  };
}

function buildIssueFilterClause({ dsrId, dateFrom, dateTo, search }, params) {
  const conditions = [];

  if (dsrId) {
    params.push(dsrId);
    conditions.push(`dsr_id = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`issue_date >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`issue_date <= $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(dsr_name ILIKE $${params.length} OR area ILIKE $${params.length})`);
  }

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

export async function countIssues(client, filters = {}) {
  const params = [];
  const where = buildIssueFilterClause(filters, params);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM issues ${where}`, params);
  return result.rows[0].count;
}

export async function listIssuesPage(client, { dsrId, dateFrom, dateTo, search, limit, offset }) {
  const params = [];
  const where = buildIssueFilterClause({ dsrId, dateFrom, dateTo, search }, params);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT * FROM issues ${where} ORDER BY issue_date DESC, created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapIssue);
}

export function insertIssue(client, issue) {
  return client.query(
    `INSERT INTO issues (id, issue_date, dsr_id, dsr_name, area, phone, items)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING *`,
    [issue.id, issue.date, issue.dsrId, issue.dsrName, issue.area, issue.phone, JSON.stringify(issue.items)],
  );
}

export function updateIssue(client, issue) {
  return client.query(
    `UPDATE issues
     SET issue_date = $2, dsr_id = $3, dsr_name = $4, area = $5, phone = $6, items = $7::jsonb
     WHERE id = $1
     RETURNING *`,
    [issue.id, issue.date, issue.dsrId, issue.dsrName, issue.area, issue.phone, JSON.stringify(issue.items)],
  );
}

export function findIssueById(client, issueId) {
  return client.query('SELECT * FROM issues WHERE id = $1 LIMIT 1', [issueId]);
}

export function findIssueByDateAndDsr(client, date, dsrId) {
  return client.query('SELECT * FROM issues WHERE issue_date = $1 AND dsr_id = $2 LIMIT 1', [date, dsrId]);
}

export function findDuplicateIssue(client, date, dsrId, issueId) {
  return client.query(
    'SELECT id FROM issues WHERE issue_date = $1 AND dsr_id = $2 AND id <> $3 LIMIT 1',
    [date, dsrId, issueId],
  );
}
