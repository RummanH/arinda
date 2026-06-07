export function insertDsr(client, dsr) {
  return client.query(
    `INSERT INTO dsrs (id, name, phone, area, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [dsr.id, dsr.name, dsr.phone, dsr.area, dsr.status],
  );
}

export function updateDsr(client, dsr) {
  return client.query(
    `UPDATE dsrs
     SET name = $2, phone = $3, area = $4, status = $5
     WHERE id = $1`,
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
