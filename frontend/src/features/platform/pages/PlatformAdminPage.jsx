import { useEffect, useState } from 'react';
import { Loader2, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { Alert, Badge, EmptyState, LoadingState, SectionHeader } from '../../../components/ui.jsx';
import { inventoryApi } from '../../../services/inventoryApi.js';

export default function PlatformAdminPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', slug: '', email: '', plan: 'starter' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    setLoading(true);
    setError('');
    try {
      const result = await inventoryApi.listTenants();
      setTenants(result.tenants || []);
    } catch (err) {
      setError(err?.message || 'Failed to load tenants.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(tenant) {
    const next = tenant.status === 'active' ? 'inactive' : 'active';
    setTogglingId(tenant.id);
    try {
      const result = await inventoryApi.setTenantStatus(tenant.id, next);
      setTenants((current) => current.map((t) => (t.id === tenant.id ? result.tenant : t)));
    } catch (err) {
      setError(err?.message || 'Failed to update status.');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const result = await inventoryApi.createTenant(createForm);
      setTenants((current) => [...current, result.tenant]);
      setShowCreate(false);
      setCreateForm({ name: '', slug: '', email: '', plan: 'starter' });
    } catch (err) {
      setCreateError(err?.message || 'Failed to create tenant.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader eyebrow="Platform" title="Platform Administration" description="Manage all tenant organizations" />
        <button type="button" className="btn-primary shrink-0" onClick={() => setShowCreate((v) => !v)}>
          <Plus size={16} />
          New Tenant
        </button>
      </div>

      {error ? <Alert type="error">{error}</Alert> : null}

      {showCreate ? (
        <form onSubmit={handleCreate} className="panel-strong max-w-xl space-y-4 p-6">
          <h3 className="text-base font-black text-slate-950">Create New Tenant</h3>
          {createError ? <Alert type="error">{createError}</Alert> : null}
          <label className="block">
            <span className="label">Organization Name</span>
            <input className="input" type="text" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} required />
          </label>
          <label className="block">
            <span className="label">Organization Code (slug)</span>
            <input className="input font-mono" type="text" value={createForm.slug} onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }))} placeholder="e.g. acme" required />
          </label>
          <label className="block">
            <span className="label">Admin Email</span>
            <input className="input" type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} required />
          </label>
          <label className="block">
            <span className="label">Plan</span>
            <select className="input" value={createForm.plan} onChange={(e) => setCreateForm((f) => ({ ...f, plan: e.target.value }))}>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {creating ? 'Creating...' : 'Create Tenant'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : tenants.length === 0 ? (
        <EmptyState title="No tenants yet" description="Create your first tenant organization above." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Code</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-500">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-950">{tenant.name}</p>
                    <p className="text-xs text-slate-500">{tenant.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <Badge tone="blue">{tenant.plan}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={tenant.status === 'active' ? 'green' : 'red'}>{tenant.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="icon-btn"
                      title={tenant.status === 'active' ? 'Deactivate' : 'Activate'}
                      disabled={togglingId === tenant.id}
                      onClick={() => toggleStatus(tenant)}
                    >
                      {togglingId === tenant.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : tenant.status === 'active' ? (
                        <ToggleRight size={20} className="text-green-600" />
                      ) : (
                        <ToggleLeft size={20} className="text-slate-400" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
