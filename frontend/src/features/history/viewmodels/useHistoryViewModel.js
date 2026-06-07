import { useMemo, useState } from 'react';
import { buildHistoryRows } from '../../../models/inventoryViewData.js';

export function useHistoryViewModel({ issues, settlements, t }) {
  const [search, setSearch] = useState('');
  const historyRows = useMemo(() => buildHistoryRows({ issues, settlements, t }), [issues, settlements, t]);
  const filteredRows = historyRows.filter((row) => `${row.type} ${row.dsrName} ${row.area} ${row.date}`.toLowerCase().includes(search.toLowerCase()));

  return {
    search,
    setSearch,
    historyRows,
    filteredRows,
  };
}
