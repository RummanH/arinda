export function insertIssue(client, issue) {
  return client.query(
    `INSERT INTO issues (id, issue_date, dsr_id, dsr_name, area, phone, items)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [issue.id, issue.date, issue.dsrId, issue.dsrName, issue.area, issue.phone, JSON.stringify(issue.items)],
  );
}

export function updateIssue(client, issue) {
  return client.query(
    `UPDATE issues
     SET issue_date = $2, dsr_id = $3, dsr_name = $4, area = $5, phone = $6, items = $7::jsonb
     WHERE id = $1`,
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
