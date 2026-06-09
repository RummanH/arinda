import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Alert, SectionHeader } from '../../../components/ui.jsx';
import { useInventoryApp } from '../../../app/useInventoryApp.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';

export default function OrgSettingsPage() {
  const { tenant, user, t } = useInventoryApp();
  const [form, setForm] = useState({
    name: tenant?.name || '',
    email: tenant?.email || '',
    address: tenant?.address || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!tenant) return null;

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await inventoryApi.updateOrgSettings(form);
      setSuccess('Organization settings saved. Reload to see updated name.');
    } catch (err) {
      setError(err?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  const canEdit = user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Settings" title="Organization Settings" description={`Manage settings for ${tenant.name}`} />
      <form onSubmit={handleSubmit} className="panel-strong max-w-xl space-y-5 p-6">
        {error ? <Alert type="error">{error}</Alert> : null}
        {success ? <Alert type="success">{success}</Alert> : null}

        <label className="block">
          <span className="label">Organization Name</span>
          <input
            className="input"
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={!canEdit}
            required
          />
        </label>

        <label className="block">
          <span className="label">Contact Email</span>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={!canEdit}
            required
          />
        </label>

        <label className="block">
          <span className="label">Address</span>
          <textarea
            className="input min-h-[80px] resize-y"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            disabled={!canEdit}
          />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <p className="flex-1 text-xs text-slate-500">
            Org Code: <span className="font-mono font-bold text-slate-700">{tenant.slug}</span>
            {' · '}
            Plan: <span className="font-bold text-slate-700">{tenant.plan}</span>
          </p>
          {canEdit ? (
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? t('common.saving') : t('common.save')}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
