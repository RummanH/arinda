import { useEffect, useMemo, useState } from 'react';
import { inventoryApi } from '../../../services/inventoryApi';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

export function useActivityLogsViewModel() {
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      try {
        setLoading(true);
        setError('');
        const result = await inventoryApi.listActivityLogs(limit);
        if (!cancelled) {
          setLogs(result.logs || []);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message);
          setLogs([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLogs();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  const filteredLogs = useMemo(() => {
    const query = normalizeText(search);
    if (!query) {
      return logs;
    }

    return logs.filter((log) => {
      const metadataText = JSON.stringify(log.metadata || {});
      return [
        log.userName,
        log.userEmail,
        log.userRole,
        log.actionType,
        log.entityType,
        log.entityId,
        log.description,
        metadataText,
      ].some((value) => normalizeText(value).includes(query));
    });
  }, [logs, search]);

  return {
    limit,
    setLimit,
    search,
    setSearch,
    logs,
    filteredLogs,
    loading,
    error,
  };
}
