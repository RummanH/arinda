import { normalizeIsoMonth, startOfMonth, startOfNextMonth } from '../lib/dateRanges.js';

function sumByDsr(rows, amountKey, dateKey = null) {
  const map = new Map();

  for (const row of rows) {
    const current = map.get(row.dsr_id) || {
      count: 0,
      amount: 0,
      lastDate: '',
    };

    current.count += 1;
    current.amount += Number(row[amountKey] || 0);
    if (dateKey && row[dateKey] && row[dateKey] > current.lastDate) {
      current.lastDate = row[dateKey];
    }

    map.set(row.dsr_id, current);
  }

  return map;
}

function buildRow(dsr, settlementStats, cashStats, advanceStats) {
  const totalPayable = Number(settlementStats?.amount || 0);
  const totalSettlementPaid = Number(settlementStats?.paid || 0);
  const totalSettlementDue = Number(settlementStats?.due || 0);
  const totalCashReceived = Number(cashStats?.amount || 0);
  const totalAdvance = Number(advanceStats?.amount || 0);
  const remainingDue = totalSettlementDue - totalCashReceived;
  const netBalance = remainingDue + totalAdvance;

  return {
    dsrId: dsr.id,
    dsrName: dsr.name,
    dsrArea: dsr.area,
    dsrPhone: dsr.phone,
    dsrStatus: dsr.status,
    settlementCount: settlementStats?.count || 0,
    cashReceiptCount: cashStats?.count || 0,
    advanceCount: advanceStats?.count || 0,
    totalPayable,
    totalSettlementPaid,
    totalSettlementDue,
    totalCashReceived,
    totalAdvance,
    remainingDue,
    netBalance,
    latestSettlementDate: settlementStats?.lastDate || '',
    latestCashReceiptDate: cashStats?.lastDate || '',
    latestAdvanceDate: advanceStats?.lastDate || '',
  };
}

export class MonthEndSummaryService {
  constructor(databaseManager) {
    this.databaseManager = databaseManager;
  }

  async getSummary(query = {}) {
    const month = normalizeIsoMonth(query.month, new Date().toISOString().slice(0, 7));
    const monthStart = startOfMonth(month);
    const nextMonthStart = startOfNextMonth(month);

    const client = await this.databaseManager.getPool().connect();
    try {
      const [dsrsResult, settlementsResult, cashResult, advancesResult] = await Promise.all([
        client.query('SELECT id, name, phone, area, status FROM dsrs ORDER BY name ASC'),
        client.query(
          `SELECT dsr_id, settlement_date, total_payable, amount_paid, due_amount
           FROM settlements
           WHERE settlement_date >= $1 AND settlement_date < $2`,
          [monthStart, nextMonthStart],
        ),
        client.query(
          `SELECT dsr_id, receipt_date, amount
           FROM dsr_cash_receipts
           WHERE receipt_date >= $1 AND receipt_date < $2`,
          [monthStart, nextMonthStart],
        ),
        client.query(
          `SELECT dsr_id, advance_date, amount
           FROM dsr_advances
           WHERE advance_date >= $1 AND advance_date < $2`,
          [monthStart, nextMonthStart],
        ),
      ]);

      const settlementMap = new Map();
      for (const row of settlementsResult.rows) {
        const current = settlementMap.get(row.dsr_id) || {
          count: 0,
          amount: 0,
          paid: 0,
          due: 0,
          lastDate: '',
        };

        current.count += 1;
        current.amount += Number(row.total_payable || 0);
        current.paid += Number(row.amount_paid || 0);
        current.due += Number(row.due_amount || 0);
        if (row.settlement_date && row.settlement_date > current.lastDate) {
          current.lastDate = row.settlement_date;
        }
        settlementMap.set(row.dsr_id, current);
      }

      const cashMap = sumByDsr(cashResult.rows, 'amount', 'receipt_date');
      const advanceMap = sumByDsr(advancesResult.rows, 'amount', 'advance_date');

      const rows = dsrsResult.rows.map((dsr) => buildRow(
        dsr,
        settlementMap.get(dsr.id),
        cashMap.get(dsr.id),
        advanceMap.get(dsr.id),
      ));

      rows.sort((left, right) => right.netBalance - left.netBalance || right.totalPayable - left.totalPayable);

      const totals = rows.reduce((sum, row) => ({
        settlementCount: sum.settlementCount + row.settlementCount,
        cashReceiptCount: sum.cashReceiptCount + row.cashReceiptCount,
        advanceCount: sum.advanceCount + row.advanceCount,
        totalPayable: sum.totalPayable + row.totalPayable,
        totalSettlementPaid: sum.totalSettlementPaid + row.totalSettlementPaid,
        totalSettlementDue: sum.totalSettlementDue + row.totalSettlementDue,
        totalCashReceived: sum.totalCashReceived + row.totalCashReceived,
        totalAdvance: sum.totalAdvance + row.totalAdvance,
        remainingDue: sum.remainingDue + row.remainingDue,
        netBalance: sum.netBalance + row.netBalance,
      }), {
        settlementCount: 0,
        cashReceiptCount: 0,
        advanceCount: 0,
        totalPayable: 0,
        totalSettlementPaid: 0,
        totalSettlementDue: 0,
        totalCashReceived: 0,
        totalAdvance: 0,
        remainingDue: 0,
        netBalance: 0,
      });

      return {
        month,
        rows,
        totals,
      };
    } finally {
      client.release();
    }
  }
}
