import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

export function useDsrFinanceViewModel(kind) {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [dsrId, setDsrId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadReport(nextDate = date, nextMonth = month, nextDsrId = dsrId) {
    try {
      setLoading(true);
      setError('');
      const loader = kind === 'cash' ? inventoryApi.getCashReceiptReport : inventoryApi.getAdvanceReport;
      const nextReport = await loader({ date: nextDate, month: nextMonth, dsrId: nextDsrId });
      setReport(nextReport);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport(date, month, dsrId);
  }, [kind, date, month, dsrId]);

  async function refreshReport() {
    await loadReport(date, month, dsrId);
  }

  return {
    date,
    month,
    dsrId,
    setDate,
    setMonth,
    setDsrId,
    report,
    loading,
    error,
    setError,
    refreshReport,
  };
}

