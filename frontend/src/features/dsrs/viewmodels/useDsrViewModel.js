import { useState } from 'react';

export function useDsrViewModel({ dsrs, issues, settlements, today }) {
  const [search, setSearch] = useState('');
  const filteredDsrs = dsrs.filter((dsr) => `${dsr.name} ${dsr.phone} ${dsr.area} ${dsr.status}`.toLowerCase().includes(search.toLowerCase()));
  const inProgressDsrIds = new Set(
    issues
      .filter((issue) => issue.date === today)
      .filter((issue) => !settlements.some((settlement) => settlement.date === today && settlement.dsrId === issue.dsrId))
      .map((issue) => issue.dsrId),
  );

  return {
    search,
    setSearch,
    filteredDsrs,
    inProgressDsrIds,
  };
}
