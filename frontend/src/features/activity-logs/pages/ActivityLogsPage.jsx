import { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import { Alert, Badge, EmptyState, LoadingState, SectionHeader, StatCard, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { formatDateTime, formatNumber } from '../../../utils/calculations.js';
import { useActivityLogsViewModel } from '../viewmodels/useActivityLogsViewModel';

function actionTone(actionType = '') {
  if (actionType.includes('delete')) {
    return 'rose';
  }
  if (actionType.includes('create') || actionType.includes('login')) {
    return 'emerald';
  }
  if (actionType.includes('update') || actionType.includes('logout')) {
    return 'amber';
  }
  return 'slate';
}

export default function ActivityLogsPage() {
  const { t } = useInventoryApp();
  const vm = useActivityLogsViewModel();

  const stats = useMemo(() => {
    const uniqueUsers = new Set(vm.logs.map((log) => log.userId).filter(Boolean)).size;
    const loginEvents = vm.logs.filter((log) => log.actionType.includes('login') || log.actionType.includes('logout')).length;
    const mutationEvents = vm.logs.filter((log) => /create|update|delete/.test(log.actionType)).length;

    return { uniqueUsers, loginEvents, mutationEvents };
  }, [vm.logs]);

  if (vm.loading) {
    return (
      <div>
        <SectionHeader
          eyebrow={t('nav.activityLogs')}
          title={t('activityLogs.title')}
          description={t('activityLogs.description')}
        />
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_220px]">
          <LoadingState title={t('status.loadingData')} description={t('activityLogs.description')} compact />
          <LoadingState title={t('status.loadingData')} description={t('activityLogs.description')} compact />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TableSkeleton rows={1} columns={1} showHeader={false} />
          <TableSkeleton rows={1} columns={1} showHeader={false} />
          <TableSkeleton rows={1} columns={1} showHeader={false} />
          <TableSkeleton rows={1} columns={1} showHeader={false} />
        </div>
        <div className="mt-6">
          <TableSkeleton rows={8} columns={6} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('nav.activityLogs')}
        title={t('activityLogs.title')}
        description={t('activityLogs.description')}
      />

      {vm.error ? (
        <div className="mb-6">
          <Alert type="error">{vm.error}</Alert>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="surface rounded-[28px] p-5">
          <label className="label mt-3">{t('activityLogs.searchLabel')}</label>
          <input
            className="input"
            value={vm.search}
            onChange={(event) => vm.setSearch(event.target.value)}
            placeholder={t('activityLogs.searchPlaceholder')}
          />
        </div>
        <div className="surface rounded-[28px] p-5">
          <label className="label mt-3">{t('activityLogs.limitLabel')}</label>
          <select className="input" value={vm.limit} onChange={(event) => vm.setLimit(Number(event.target.value))}>
            {[25, 50, 100, 200].map((option) => (
              <option key={option} value={option}>
                {formatNumber(option)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t('activityLogs.totalLogs')} value={formatNumber(vm.logs.length)} helper={t('activityLogs.totalLogsHelper')} />
        <StatCard title={t('activityLogs.uniqueUsers')} value={formatNumber(stats.uniqueUsers)} helper={t('activityLogs.uniqueUsersHelper')} />
        <StatCard title={t('activityLogs.loginEvents')} value={formatNumber(stats.loginEvents)} helper={t('activityLogs.loginEventsHelper')} />
        <StatCard title={t('activityLogs.mutationEvents')} value={formatNumber(stats.mutationEvents)} helper={t('activityLogs.mutationEventsHelper')} />
      </div>

      <div className="surface mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-950">{t('activityLogs.tableTitle')}</h2>
            <span className="muted-chip">{formatNumber(vm.filteredLogs.length)} {t('common.records')}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">{t('activityLogs.when')}</th>
                <th className="px-4 py-3">{t('activityLogs.user')}</th>
                <th className="px-4 py-3">{t('activityLogs.action')}</th>
                <th className="px-4 py-3">{t('activityLogs.entity')}</th>
                <th className="px-4 py-3 hidden sm:table-cell">{t('activityLogs.description')}</th>
                <th className="px-4 py-3 hidden lg:table-cell">{t('activityLogs.metadata')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vm.filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="table-cell whitespace-nowrap text-sm font-semibold text-slate-700">{formatDateTime(log.createdAt)}</td>
                  <td className="table-cell">
                    <p className="font-semibold text-slate-950">{log.userName || '-'}</p>
                    <p className="text-xs text-slate-500">{log.userEmail || ''}</p>
                  </td>
                  <td className="table-cell">
                    <Badge tone={actionTone(log.actionType)}>{log.actionType}</Badge>
                    <p className="mt-1 hidden text-xs text-slate-500 sm:block">{log.userRole || ''}</p>
                  </td>
                  <td className="table-cell">
                    <p className="font-semibold text-slate-950">{log.entityType}</p>
                    <p className="hidden text-xs text-slate-500 sm:block">{log.entityId || '-'}</p>
                  </td>
                  <td className="table-cell hidden sm:table-cell max-w-[28rem]">
                    <p className="truncate">{log.description}</p>
                  </td>
                  <td className="table-cell hidden lg:table-cell max-w-[18rem]">
                    <p className="truncate text-xs text-slate-500">{JSON.stringify(log.metadata || {})}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!vm.filteredLogs.length ? (
          <div className="p-5">
            <EmptyState title={t('activityLogs.noLogsTitle')} description={t('activityLogs.noLogsDescription')} icon={ClipboardList} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
