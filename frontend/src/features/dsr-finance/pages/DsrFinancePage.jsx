import { useMemo, useState } from 'react';
import { BadgeDollarSign, HandCoins, Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, ChartPanel, EmptyState, LoadingState, SectionHeader, HorizontalBarChart, StatCard, TableSkeleton } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';
import { formatCurrency, formatDate, formatNumber, todayISO } from '../../../utils/calculations.js';
import { useDsrFinanceViewModel } from '../viewmodels/useDsrFinanceViewModel';
import DsrFinanceFormModal from '../components/DsrFinanceFormModal';

const MODULES = {
  cash: {
    tabKey: 'dsrFinance.cashTab',
    addKey: 'dsrFinance.addCash',
    recordKey: 'dsrFinance.cashReceipt',
    dailyListKey: 'dsrFinance.dailyCashList',
    monthlyListKey: 'dsrFinance.monthlyCashList',
    performedByKey: 'dsrFinance.receivedBy',
    deleteConfirmKey: 'dsrFinance.deleteCashConfirm',
    icon: HandCoins,
  },
  advance: {
    tabKey: 'dsrFinance.advanceTab',
    addKey: 'dsrFinance.addAdvance',
    recordKey: 'dsrFinance.advance',
    dailyListKey: 'dsrFinance.dailyAdvanceList',
    monthlyListKey: 'dsrFinance.monthlyAdvanceList',
    performedByKey: 'dsrFinance.createdBy',
    deleteConfirmKey: 'dsrFinance.deleteAdvanceConfirm',
    icon: BadgeDollarSign,
  },
};

function toChartData(items = []) {
  return items.map((item, index) => ({
    label: item.dsrName,
    value: Number(item.totalAmount || 0),
    meta: item.dsrArea || item.dsrPhone || '',
    color: index % 2 === 0 ? '#0f766e' : '#2563eb',
  }));
}

function renderDsrOption(t, dsr) {
  return `${dsr.name} - ${dsr.area}`;
}

export default function DsrFinancePage() {
  const { t, can, dsrs, confirm } = useInventoryApp();
  const [activeTab, setActiveTab] = useState('cash');
  const cashVm = useDsrFinanceViewModel('cash');
  const advanceVm = useDsrFinanceViewModel('advance');
  const [modal, setModal] = useState(null);
  const canManageDsrFinance = can('manage_dsr_finance');

  const activeVm = activeTab === 'cash' ? cashVm : advanceVm;
  const moduleConfig = MODULES[activeTab];
  const Icon = moduleConfig.icon;
  const dailyChartData = useMemo(() => toChartData(activeVm.report?.dailySummary?.byDsr || []), [activeVm.report?.dailySummary?.byDsr]);
  const monthlyChartData = useMemo(() => toChartData(activeVm.report?.monthlySummary?.byDsr || []), [activeVm.report?.monthlySummary?.byDsr]);

  if (activeVm.loading) {
    return (
      <div>
        <SectionHeader
          eyebrow={t('nav.dsrFinance')}
          title={t('dsrFinance.title')}
          description={t('dsrFinance.description')}
          action={canManageDsrFinance ? (
            <button type="button" className="btn-primary" disabled>
              <Plus size={18} />
              {t(moduleConfig.addKey)}
            </button>
          ) : null}
        />
        <div className="mb-6 flex flex-wrap gap-2">
          {Object.entries(MODULES).map(([key, config]) => {
            const TabIcon = config.icon;
            const isActive = key === activeTab;
            return (
              <button key={key} type="button" className={isActive ? 'btn-primary' : 'btn-secondary'} disabled>
                <TabIcon size={16} />
                {t(config.tabKey)}
              </button>
            );
          })}
        </div>
        <LoadingState title={t('status.loadingData')} description={t('dsrFinance.dailyReportDescription')} />
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TableSkeleton rows={1} columns={1} showHeader={false} />
            <TableSkeleton rows={1} columns={1} showHeader={false} />
            <TableSkeleton rows={1} columns={1} showHeader={false} />
            <TableSkeleton rows={1} columns={1} showHeader={false} />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <LoadingState title={t('status.loadingData')} description={t('dsrFinance.dailyReportDescription')} />
            <LoadingState title={t('status.loadingData')} description={t('dsrFinance.monthlyReportDescription')} />
          </div>
          <TableSkeleton rows={6} columns={6} />
          <TableSkeleton rows={6} columns={4} />
        </div>
      </div>
    );
  }

  async function handleSave(record) {
    const api = activeTab === 'cash'
      ? (record.id ? inventoryApi.updateCashReceipt : inventoryApi.createCashReceipt)
      : (record.id ? inventoryApi.updateAdvance : inventoryApi.createAdvance);

    try {
      await api(record);
      await activeVm.refreshReport();
      setModal(null);
      return { ok: true };
    } catch (requestError) {
      return { ok: false, message: requestError.message };
    }
  }

  async function handleDelete(recordId) {
    const record = activeVm.report?.monthlyRecords?.find((item) => item.id === recordId);
    const confirmMessage = t(moduleConfig.deleteConfirmKey, {
      dsrName: record?.dsrName || t('dsrFinance.dsr'),
      recordType: t(moduleConfig.recordKey),
    });

    const ok = await confirm({
      title: t('common.delete'),
      description: confirmMessage,
      confirmLabel: t('common.delete'),
      tone: 'rose',
    });

    if (!ok) {
      return;
    }

    try {
      const deleter = activeTab === 'cash' ? inventoryApi.deleteCashReceipt : inventoryApi.deleteAdvance;
      await deleter(recordId);
      await activeVm.refreshReport();
    } catch (requestError) {
      activeVm.setError(requestError.message);
    }
  }

  const dailyRecords = activeVm.report?.dailyRecords || [];
  const monthlyRecords = activeVm.report?.monthlyRecords || [];

  return (
    <div>
      <SectionHeader
        eyebrow={t('nav.dsrFinance')}
        title={t('dsrFinance.title')}
        description={t('dsrFinance.description')}
        action={canManageDsrFinance ? (
          <button type="button" className="btn-primary" onClick={() => setModal({})}>
            <Plus size={18} />
            {t(moduleConfig.addKey)}
          </button>
        ) : null}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(MODULES).map(([key, config]) => {
          const TabIcon = config.icon;
          const isActive = key === activeTab;
          return (
            <button
              key={key}
              type="button"
              className={isActive ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setActiveTab(key)}
            >
              <TabIcon size={16} />
              {t(config.tabKey)}
            </button>
          );
        })}
      </div>

      {activeVm.error ? (
        <div className="mb-6">
          <Alert type="error">{activeVm.error}</Alert>
        </div>
      ) : null}

      <div className="surface mb-6 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{t('nav.dsrFinance')}</p>
            <p className="mt-2 text-sm text-slate-500">{t('dsrFinance.description')}</p>
          </div>
          <span className="muted-chip">{formatNumber(activeVm.report?.dailyRecords?.length || 0)} {t('common.dsr')}</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">{t('dsrFinance.reportDate')}</label>
            <input className="input" type="date" value={activeVm.date} onChange={(event) => activeVm.setDate(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('dsrFinance.reportMonth')}</label>
            <input className="input" type="month" value={activeVm.month} onChange={(event) => activeVm.setMonth(event.target.value)} />
          </div>
          <div>
            <label className="label">{t('dsrFinance.dsrFilter')}</label>
            <select className="input" value={activeVm.dsrId} onChange={(event) => activeVm.setDsrId(event.target.value)}>
              <option value="">{t('dsrFinance.allDsrs')}</option>
              {dsrs.map((dsr) => (
                <option key={dsr.id} value={dsr.id}>
                  {renderDsrOption(t, dsr)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t('dsrFinance.dailyCount')} value={formatNumber(activeVm.report?.dailySummary?.count || 0)} icon={Icon} tone="blue" helper={t('dsrFinance.dailyCountHelper')} />
        <StatCard title={t('dsrFinance.dailyTotal')} value={formatCurrency(activeVm.report?.dailySummary?.totalAmount || 0)} icon={Icon} tone="emerald" helper={t('dsrFinance.dailyTotalHelper')} />
        <StatCard title={t('dsrFinance.monthlyCount')} value={formatNumber(activeVm.report?.monthlySummary?.count || 0)} icon={Icon} tone="amber" helper={t('dsrFinance.monthlyCountHelper')} />
        <StatCard title={t('dsrFinance.monthlyTotal')} value={formatCurrency(activeVm.report?.monthlySummary?.totalAmount || 0)} icon={Icon} tone="slate" helper={t('dsrFinance.monthlyTotalHelper')} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartPanel title={t('dsrFinance.dailyReport')} description={t('dsrFinance.dailyReportDescription')}>
          {dailyChartData.length ? (
            <HorizontalBarChart data={dailyChartData} valueFormatter={formatCurrency} />
          ) : (
            <EmptyState title={t('dsrFinance.noDailyTitle')} description={t('dsrFinance.noDailyDescription')} icon={Icon} />
          )}
        </ChartPanel>

        <ChartPanel title={t('dsrFinance.monthlyReport')} description={t('dsrFinance.monthlyReportDescription')}>
          {monthlyChartData.length ? (
            <HorizontalBarChart data={monthlyChartData} valueFormatter={formatCurrency} />
          ) : (
            <EmptyState title={t('dsrFinance.noMonthlyTitle')} description={t('dsrFinance.noMonthlyDescription')} icon={Icon} />
          )}
        </ChartPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-950">{t(moduleConfig.dailyListKey, { date: formatDate(activeVm.date) })}</h2>
              <span className="muted-chip">{formatNumber(dailyRecords.length)} {t('common.records')}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('dsrFinance.date')}</th>
                  <th className="px-4 py-3">{t('dsrFinance.dsr')}</th>
                  <th className="px-4 py-3">{t('dsrFinance.amount')}</th>
                  <th className="px-4 py-3 hidden sm:table-cell">{t('dsrFinance.note')}</th>
                  <th className="px-4 py-3 hidden md:table-cell">{t(moduleConfig.performedByKey)}</th>
                  {canManageDsrFinance ? <th className="px-4 py-3 text-right">{t('common.actions')}</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="table-cell">{formatDate(record.date)}</td>
                    <td className="table-cell">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-950">{record.dsrName}</span>
                        <span className="hidden text-xs text-slate-500 sm:block">{record.dsrArea}</span>
                      </div>
                    </td>
                    <td className="table-cell font-semibold">{formatCurrency(record.amount)}</td>
                    <td className="table-cell hidden sm:table-cell max-w-64"><p className="truncate">{record.note}</p></td>
                    <td className="table-cell hidden md:table-cell">
                      <p className="font-semibold text-slate-950">{record.performedByName || '-'}</p>
                      <p className="text-xs text-slate-500">{record.performedByRole || ''}</p>
                    </td>
                    {canManageDsrFinance ? (
                      <td className="table-cell">
                        <div className="flex justify-end gap-2">
                          <button type="button" className="icon-btn" title={t('common.edit')} onClick={() => setModal(record)}>
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title={t('common.delete')} onClick={() => handleDelete(record.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!dailyRecords.length ? (
            <div className="p-5">
              <EmptyState title={t('dsrFinance.noDailyTitle')} description={t('dsrFinance.noDailyDescription')} icon={Icon} />
            </div>
          ) : null}
        </div>

        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-950">{t(moduleConfig.monthlyListKey, { month: activeVm.month })}</h2>
              <span className="muted-chip">{formatNumber(monthlyRecords.length)} {t('common.records')}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">{t('dsrFinance.date')}</th>
                  <th className="px-4 py-3">{t('dsrFinance.dsr')}</th>
                  <th className="px-4 py-3">{t('dsrFinance.amount')}</th>
                  <th className="px-4 py-3 hidden sm:table-cell">{t('dsrFinance.note')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="table-cell">{formatDate(record.date)}</td>
                    <td className="table-cell">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-950">{record.dsrName}</span>
                        <span className="hidden text-xs text-slate-500 sm:block">{record.dsrArea}</span>
                      </div>
                    </td>
                    <td className="table-cell font-semibold">{formatCurrency(record.amount)}</td>
                    <td className="table-cell hidden sm:table-cell max-w-64"><p className="truncate">{record.note}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!monthlyRecords.length ? (
            <div className="p-5">
              <EmptyState title={t('dsrFinance.noMonthlyTitle')} description={t('dsrFinance.noMonthlyDescription')} icon={Icon} />
            </div>
          ) : null}
        </div>
      </div>

      {modal ? (
        <DsrFinanceFormModal
          kind={activeTab}
          record={modal.id ? modal : null}
          dsrs={dsrs}
          defaultDate={activeVm.date || todayISO()}
          defaultDsrId={activeVm.dsrId}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}
