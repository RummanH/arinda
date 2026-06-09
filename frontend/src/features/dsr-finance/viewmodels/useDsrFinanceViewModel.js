import { useEffect, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';
import { todayISO } from '../../../utils/calculations.js';

const RECORD_APIS = {
  cash: { create: 'createCashReceipt', update: 'updateCashReceipt', remove: 'deleteCashReceipt' },
  advance: { create: 'createAdvance', update: 'updateAdvance', remove: 'deleteAdvance' },
};

export function useDsrFinanceViewModel(kind, { confirm }) {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [dsrId, setDsrId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const api = RECORD_APIS[kind];

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

  async function saveRecord(record) {
    try {
      const action = record.id ? api.update : api.create;
      await inventoryApi[action](record);
      await refreshReport();
      return { ok: true };
    } catch (requestError) {
      return { ok: false, message: requestError.message };
    }
  }

  async function deleteRecord(recordId, confirmOptions) {
    if (!(await confirm(confirmOptions))) {
      return;
    }

    try {
      await inventoryApi[api.remove](recordId);
      await refreshReport();
    } catch (requestError) {
      setError(requestError.message);
    }
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
    saveRecord,
    deleteRecord,
  };
}
