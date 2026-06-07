import { assert } from '../lib/errors.js';
import { createId } from '../lib/ids.js';
import { deleteExpense, findExpenseById, insertExpense, listExpensesInRange, updateExpense } from '../repositories/expenseRepository.js';

const EXPENSE_CATEGORIES = ['Bank', 'Salary', 'Office', 'Rent', 'Vehicle', 'Other'];

function normalizeDate(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) {
    return fallback;
  }

  assert(/^\d{4}-\d{2}-\d{2}$/.test(raw), 'Expense date must be in YYYY-MM-DD format.');
  return raw;
}

function normalizeMonth(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) {
    return fallback;
  }

  assert(/^\d{4}-\d{2}$/.test(raw), 'Month must be in YYYY-MM format.');
  return raw;
}

function normalizeCategory(value) {
  const raw = String(value || '').trim().toLowerCase();
  const found = EXPENSE_CATEGORIES.find((category) => category.toLowerCase() === raw);
  assert(found, 'Invalid expense category.');
  return found;
}

function normalizeExpense(input, fallbackDate) {
  const amount = Number(input.amount);
  const note = String(input.note || '').trim();
  const date = normalizeDate(input.date, fallbackDate);
  const category = normalizeCategory(input.category);

  assert(amount > 0, 'Expense amount must be greater than zero.');
  assert(note, 'Expense note is required.');

  return {
    id: input.id || createId('expense'),
    date,
    category,
    amount,
    note,
  };
}

function startOfMonth(month) {
  return `${month}-01`;
}

function startOfNextMonth(month) {
  const [year, monthPart] = month.split('-').map(Number);
  const next = new Date(Date.UTC(year, monthPart - 1, 1));
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString().slice(0, 10);
}

function aggregateExpenses(expenses) {
  const byCategory = new Map();
  let totalAmount = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amount || 0);
    totalAmount += amount;
    const current = byCategory.get(expense.category) || { category: expense.category, count: 0, totalAmount: 0 };
    current.count += 1;
    current.totalAmount += amount;
    byCategory.set(expense.category, current);
  }

  return {
    count: expenses.length,
    totalAmount,
    byCategory: [...byCategory.values()].sort((left, right) => right.totalAmount - left.totalAmount),
  };
}

export class ExpenseService {
  constructor(databaseManager, { auditService }) {
    this.databaseManager = databaseManager;
    this.auditService = auditService;
  }

  async getExpenseReport({ date, month }) {
    const selectedDate = normalizeDate(date, new Date().toISOString().slice(0, 10));
    const selectedMonth = normalizeMonth(month, selectedDate.slice(0, 7));
    const monthStart = startOfMonth(selectedMonth);
    const nextMonthStart = startOfNextMonth(selectedMonth);

    const client = await this.databaseManager.getPool().connect();
    try {
      const monthlyExpenses = await listExpensesInRange(client, monthStart, nextMonthStart);
      const dailyExpenses = monthlyExpenses.filter((expense) => expense.date === selectedDate);

      return {
        date: selectedDate,
        month: selectedMonth,
        dailyExpenses,
        monthlyExpenses,
        dailySummary: aggregateExpenses(dailyExpenses),
        monthlySummary: aggregateExpenses(monthlyExpenses),
        categories: EXPENSE_CATEGORIES,
      };
    } finally {
      client.release();
    }
  }

  async saveExpense(input, actor) {
    const fallbackDate = new Date().toISOString().slice(0, 10);
    const expense = normalizeExpense(input, fallbackDate);

    return this.databaseManager.withTransaction(async (client) => {
      if (input.id) {
        const existingExpense = await findExpenseById(client, expense.id);
        assert(existingExpense, 'Expense not found.', 404);

        await updateExpense(client, expense);
        await this.auditService.record(client, {
          userId: actor.id,
          actionType: 'expense.update',
          entityType: 'expense',
          entityId: expense.id,
          description: `${actor.name} updated expense ${expense.category}`,
          metadata: { date: expense.date, category: expense.category, amount: expense.amount },
        });
      } else {
        expense.createdBy = actor.id;
        await insertExpense(client, expense);
        await this.auditService.record(client, {
          userId: actor.id,
          actionType: 'expense.create',
          entityType: 'expense',
          entityId: expense.id,
          description: `${actor.name} created expense ${expense.category}`,
          metadata: { date: expense.date, category: expense.category, amount: expense.amount },
        });
      }

      return expense;
    });
  }

  async removeExpense(expenseId, actor) {
    return this.databaseManager.withTransaction(async (client) => {
      const existingExpense = await findExpenseById(client, expenseId);
      assert(existingExpense, 'Expense not found.', 404);
      const result = await deleteExpense(client, expenseId);
      assert(result.rowCount > 0, 'Expense not found.', 404);

      await this.auditService.record(client, {
        userId: actor.id,
        actionType: 'expense.delete',
        entityType: 'expense',
        entityId: expenseId,
        description: `${actor.name} deleted expense ${existingExpense.category}`,
        metadata: { date: existingExpense.date, category: existingExpense.category, amount: existingExpense.amount },
      });

      return { ok: true };
    });
  }
}

