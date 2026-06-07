function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    piecesPerCase: Number(row.pieces_per_case),
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    stockPieces: Number(row.stock_pieces),
  };
}

function mapDsr(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    area: row.area,
    status: row.status,
  };
}

function mapIssue(row) {
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

function mapSettlement(row) {
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
    amountPaid: Number(row.amount_paid || 0),
    dueAmount: Number(row.due_amount || 0),
    status: row.status,
  };
}

export async function readState(client) {
  const [productsResult, dsrsResult, issuesResult, settlementsResult] = await Promise.all([
    client.query('SELECT * FROM products ORDER BY created_at ASC'),
    client.query('SELECT * FROM dsrs ORDER BY created_at DESC'),
    client.query('SELECT * FROM issues ORDER BY created_at DESC'),
    client.query('SELECT * FROM settlements ORDER BY created_at DESC'),
  ]);

  return {
    products: productsResult.rows.map(mapProduct),
    dsrs: dsrsResult.rows.map(mapDsr),
    issues: issuesResult.rows.map(mapIssue),
    settlements: settlementsResult.rows.map(mapSettlement),
  };
}
