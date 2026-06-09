import { useState } from 'react';
import { Database, Download, ShieldCheck } from 'lucide-react';
import { Alert, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi';

export default function DatabaseBackupPage() {
  const { t } = useInventoryApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    try {
      setLoading(true);
      setError('');

      const { blob, filename } = await inventoryApi.downloadDatabaseBackup();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message || t('backup.failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow={t('nav.databaseBackup')}
        title={t('backup.title')}
        description={t('backup.description')}
        action={(
          <button type="button" className="btn-primary" onClick={handleDownload} disabled={loading}>
            <Download size={18} />
            {loading ? t('backup.downloading') : t('backup.download')}
          </button>
        )}
      />

      {error ? (
        <div className="mb-6">
          <Alert type="error">{error}</Alert>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="surface overflow-hidden p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--secondary-soft)] text-[var(--secondary-strong)] ring-1 ring-[var(--secondary-soft)]">
              <Database size={28} />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-black text-slate-950">{t('backup.title')}</h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">{t('backup.note')}</p>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                <ShieldCheck size={14} />
                {t('backup.helper')}
              </div>
            </div>
          </div>
        </div>

        <div className="surface overflow-hidden p-6">
          <h3 className="text-base font-bold text-slate-950">{t('backup.description')}</h3>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>• {t('backup.helper')}</p>
            <p>• The backup is generated from the live PostgreSQL database.</p>
            <p>• The file downloads directly after the dump completes.</p>
            <p>• Keep the downloaded file in a safe location.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
