import { useEffect, useMemo, useState } from 'react';
import { buildDailyRows, buildSheetData } from '../../../models/inventoryViewData.js';

export function useDailyReportsViewModel({ products, dsrs, issues, settlements, today, t }) {
  const [date, setDate] = useState(today);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const rows = useMemo(() => buildDailyRows({ date, dsrs, issues, settlements, products }), [date, dsrs, issues, settlements, products]);
  const totals = rows.reduce(
    (sum, row) => ({
      issuedPieces: sum.issuedPieces + row.issuedPieces,
      returnedPieces: sum.returnedPieces + row.returnedPieces,
      soldPieces: sum.soldPieces + row.soldPieces,
      totalPayable: sum.totalPayable + row.totalPayable,
    }),
    { issuedPieces: 0, returnedPieces: 0, soldPieces: 0, totalPayable: 0 },
  );
  const chartRows = rows
    .filter((row) => row.status !== 'No Issue')
    .sort((a, b) => b.totalPayable - a.totalPayable)
    .slice(0, 6)
    .map((row) => ({
      label: row.dsrName,
      meta: row.area,
      issued: row.issuedPieces,
      returned: row.returnedPieces,
      sold: row.soldPieces,
      totalPayable: row.totalPayable,
    }));
  const reportMix = [
    { label: t('dashboard.completed'), value: rows.filter((row) => row.status === 'Completed').length, color: '#0f766e' },
    { label: t('dashboard.pending'), value: rows.filter((row) => row.status === 'Pending').length, color: '#f59e0b' },
    { label: t('dashboard.noIssue'), value: rows.filter((row) => row.status === 'No Issue').length, color: '#cbd5e1' },
  ];

  useEffect(() => {
    setSelectedSheet(null);
  }, [date]);

  function viewSheet(row) {
    if (row.status === 'No Issue') {
      return;
    }

    setSelectedSheet(buildSheetData({ date, dsrId: row.dsrId, dsrs, issues, settlements, products }));
  }

  return {
    date,
    setDate,
    rows,
    totals,
    chartRows,
    reportMix,
    selectedSheet,
    viewSheet,
  };
}
