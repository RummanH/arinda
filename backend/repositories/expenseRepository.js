function mapExpense(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    date: row.expense_date,
    category: row.category,
    amount: Number(row.amount),
    note: row.note,
    createdById: row.created_by,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    createdByRole: row.created_by_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function insertExpense(client, expense) {
  return client.query(
    `INSERT INTO expenses (id, expense_date, category, amount, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [expense.id, expense.date, expense.category, expense.amount, expense.note, expense.createdBy],
  );
}

export function updateExpense(client, expense) {
  return client.query(
    `UPDATE expenses
     SET expense_date = $2,
         category = $3,
         amount = $4,
         note = $5,
         updated_at = NOW()
     WHERE id = $1`,
    [expense.id, expense.date, expense.category, expense.amount, expense.note],
  );
}

export function deleteExpense(client, expenseId) {
  return client.query('DELETE FROM expenses WHERE id = $1', [expenseId]);
}

export async function findExpenseById(client, expenseId) {
  const result = await client.query(
    `SELECT
      expenses.*,
      users.name AS created_by_name,
      users.email AS created_by_email,
      users.role AS created_by_role
    FROM expenses
    LEFT JOIN users ON users.id = expenses.created_by
    WHERE expenses.id = $1`,
    [expenseId],
  );

  return mapExpense(result.rows[0]);
}

export async function listExpensesInRange(client, startDate, endDate) {
  const result = await client.query(
    `SELECT
      expenses.*,
      users.name AS created_by_name,
      users.email AS created_by_email,
      users.role AS created_by_role
    FROM expenses
    LEFT JOIN users ON users.id = expenses.created_by
    WHERE expenses.expense_date >= $1
      AND expenses.expense_date < $2
    ORDER BY expenses.expense_date DESC, expenses.created_at DESC`,
    [startDate, endDate],
  );

  return result.rows.map(mapExpense);
}

