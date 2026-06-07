export function insertSettlement(client, settlement) {
  return client.query(
    `INSERT INTO settlements (id, settlement_date, dsr_id, dsr_name, area, phone, issue_ids, items, extra_returns, total_payable, previous_due, amount_paid, due_amount, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, $13, $14)`,
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
      settlement.amountPaid,
      settlement.dueAmount,
      settlement.status,
    ],
  );
}

export function updateSettlement(client, settlement) {
  return client.query(
    `UPDATE settlements
     SET settlement_date = $2, dsr_id = $3, dsr_name = $4, area = $5, phone = $6, issue_ids = $7::jsonb, items = $8::jsonb, extra_returns = $9::jsonb, total_payable = $10, previous_due = $11, amount_paid = $12, due_amount = $13, status = $14
     WHERE id = $1`,
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
