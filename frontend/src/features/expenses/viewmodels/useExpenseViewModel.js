import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations';

export function useExpenseViewModel() {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadReport(nextDate = date, nextMonth = month) {
    try {
      setLoading(true);
      setError('');
      const nextReport = await inventoryApi.getExpenseReport({ date: nextDate, month: nextMonth });
      setReport(nextReport);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport(date, month);
  }, [date, month]);

  async function refreshReport() {
    await loadReport(date, month);
  }

  return {
    date,
    month,
    setDate,
    setMonth,
    report,
    loading,
    error,
    setError,
    refreshReport,
  };
}
