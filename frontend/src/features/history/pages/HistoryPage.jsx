import { CalendarDays, FileText, RotateCcw, Search, Truck } from 'lucide-react';
import { Badge, EmptyState, SectionHeader, StatCard } from '../../../components/ui.jsx';
import { shortDate, statusTone } from '../../../models/inventoryViewData.js';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/calculations.js';
import { useHistoryViewModel } from '../viewmodels/useHistoryViewModel';

export default function HistoryPage() {
  const { issues, settlements, today, t } = useInventoryApp();
  const vm = useHistoryViewModel({ issues, settlements, t });

  return (
    <div>
      <SectionHeader eyebrow={t('nav.history')} title={t('nav.history')} description={t('history.description')} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title={t('history.morningIssues')} value={formatNumber(issues.length)} helper={t('history.morningHelper')} icon={Truck} tone="amber" />
        <StatCard title={t('history.settlements')} value={formatNumber(settlements.length)} helper={t('history.settlementHelper')} icon={RotateCcw} tone="emerald" />
        <StatCard title={t('history.latestDate')} value={vm.historyRows[0] ? shortDate(vm.historyRows[0].date) : shortDate(today)} helper={t('history.latestHelper')} icon={CalendarDays} tone="blue" />
      </div>

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-10" value={vm.search} onChange={(event) => vm.setSearch(event.target.value)} placeholder={t('history.searchPlaceholder')} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{t('common.date')}</th>
                <th className="px-4 py-3">{t('history.type')}</th>
                <th className="px-4 py-3">{t('dsr.title')}</th>
                <th className="px-4 py-3">{t('history.qty')}</th>
                <th className="px-4 py-3">{t('history.amount')}</th>
                <th className="px-4 py-3">{t('history.paid')}</th>
                <th className="px-4 py-3">{t('history.due')}</th>
                <th className="px-4 py-3">{t('dsr.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.filteredRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="table-cell font-black text-slate-400">{index + 1}</td>
                  <td className="table-cell font-semibold text-slate-950">{formatDate(row.date)}</td>
                  <td className="table-cell">
                    <Badge tone={row.type === 'Morning Issue' ? 'amber' : 'emerald'}>{row.type === 'Morning Issue' ? t('history.issueType') : t('history.settlementType')}</Badge>
                  </td>
                  <td className="table-cell">
                    <p className="font-semibold text-slate-950">{row.dsrName}</p>
                    <p className="text-xs text-slate-500">{row.area}</p>
                  </td>
                  <td className="table-cell">{formatNumber(row.pieces)} pcs</td>
                  <td className="table-cell font-bold">{formatCurrency(row.amount)}</td>
                  <td className="table-cell">{formatCurrency(row.amountPaid || 0)}</td>
                  <td className="table-cell">{formatCurrency(row.dueAmount || 0)}</td>
                  <td className="table-cell">
                    <Badge tone={statusTone(row.status)}>{row.status === 'Issued' ? t('history.issued') : t('history.completed')}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!vm.filteredRows.length ? (
          <div className="p-5">
            <EmptyState title={t('history.noMatchTitle')} description={t('history.noMatchDescription')} icon={FileText} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
