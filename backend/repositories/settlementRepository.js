export function mapSettlement(row) {
  return {
    id: row.id,
    date: row.settlement_date,
    dsrId: row.dsr_id,
    dsrName: row.dsr_name,
    area: row.area,
    phone: row.phone,
    issueIds: row.issue_ids,
    items: row.items,
    extraReturns: row.extra_returns || [],
    totalPayable: Number(row.total_payable),
    previousDue: Number(row.previous_due || 0),
    discount: Number(row.discount || 0),
    extraReturnValue: Number(row.extra_return_value || 0),
    amountPaid: Number(row.amount_paid || 0),
    dueAmount: Number(row.due_amount || 0),
    status: row.status,
  };
}

function buildSettlementFilterClause({ dsrId, dateFrom, dateTo, search }, params) {
  const conditions = [];

  if (dsrId) {
    params.push(dsrId);
    conditions.push(`dsr_id = $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`settlement_date >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`settlement_date <= $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(dsr_name ILIKE $${params.length} OR area ILIKE $${params.length})`);
  }

  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

export async function countSettlements(client, filters = {}) {
  const params = [];
  const where = buildSettlementFilterClause(filters, params);
  const result = await client.query(`SELECT COUNT(*)::INTEGER AS count FROM settlements ${where}`, params);
  return result.rows[0].count;
}

export async function listSettlementsPage(client, { dsrId, dateFrom, dateTo, search, limit, offset }) {
  const params = [];
  const where = buildSettlementFilterClause({ dsrId, dateFrom, dateTo, search }, params);
  params.push(limit, offset);
  const result = await client.query(
    `SELECT * FROM settlements ${where} ORDER BY settlement_date DESC, created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows.map(mapSettlement);
}

export function insertSettlement(client, settlement) {
  return client.query(
    `INSERT INTO settlements (id, settlement_date, dsr_id, dsr_name, area, phone, issue_ids, items, extra_returns, total_payable, previous_due, discount, extra_return_value, amount_paid, due_amount, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      settlement.id,
      settlement.date,
      settlement.dsrId,
      settlement.dsrName,
      settlement.area,
      settlement.phone,
      JSON.stringify(settlement.issueIds),
      JSON.stringify(settlement.items),
      JSON.stringify(settlement.extraReturns || []),
      settlement.totalPayable,
      settlement.previousDue,
      settlement.discount,
      settlement.extraReturnValue,
      settlement.amountPaid,
      settlement.dueAmount,
      settlement.status,
    ],
  );
}

export function updateSettlement(client, settlement) {
  return client.query(
    `UPDATE settlements
     SET settlement_date = $2, dsr_id = $3, dsr_name = $4, area = $5, phone = $6, issue_ids = $7::jsonb, items = $8::jsonb, extra_returns = $9::jsonb, total_payable = $10, previous_due = $11, discount = $12, extra_return_value = $13, amount_paid = $14, due_amount = $15, status = $16
     WHERE id = $1
     RETURNING *`,
    [
      settlement.id,
      settlement.date,
      settlement.dsrId,
      settlement.dsrName,
      settlement.area,
      settlement.phone,
      JSON.stringify(settlement.issueIds),
      JSON.stringify(settlement.items),
      JSON.stringify(settlement.extraReturns || []),
      settlement.totalPayable,
      settlement.previousDue,
      settlement.discount,
      settlement.extraReturnValue,
      settlement.amountPaid,
      settlement.dueAmount,
      settlement.status,
    ],
  );
}

export function findSettlementById(client, settlementId) {
  return client.query('SELECT * FROM settlements WHERE id = $1 LIMIT 1', [settlementId]);
}

export function findSettlementByDateAndDsr(client, date, dsrId) {
  return client.query('SELECT * FROM settlements WHERE settlement_date = $1 AND dsr_id = $2 LIMIT 1', [date, dsrId]);
}

export function findDuplicateSettlement(client, date, dsrId, settlementId) {
  return client.query(
    'SELECT id FROM settlements WHERE settlement_date = $1 AND dsr_id = $2 AND id <> $3 LIMIT 1',
    [date, dsrId, settlementId],
  );
}
