import { PackageOpen, X } from 'lucide-react';

export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function Modal({ title, description, children, onClose, width = 'max-w-2xl' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md no-print">
      <div className={cx('w-full overflow-hidden rounded-lg border border-white/70 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/5', width)}>
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button type="button" className="icon-btn" title="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function StatCard({ title, value, helper, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue: {
      card: 'from-white to-blue-50/75',
      icon: 'bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.26)]',
      accent: 'bg-blue-500',
    },
    emerald: {
      card: 'from-white to-emerald-50/75',
      icon: 'bg-emerald-600 text-white shadow-[0_10px_20px_rgba(5,150,105,0.24)]',
      accent: 'bg-emerald-500',
    },
    amber: {
      card: 'from-white to-amber-50/80',
      icon: 'bg-amber-500 text-white shadow-[0_10px_20px_rgba(245,158,11,0.22)]',
      accent: 'bg-amber-400',
    },
    indigo: {
      card: 'from-white to-indigo-50/75',
      icon: 'bg-indigo-600 text-white shadow-[0_10px_20px_rgba(79,70,229,0.24)]',
      accent: 'bg-indigo-500',
    },
    rose: {
      card: 'from-white to-rose-50/75',
      icon: 'bg-rose-600 text-white shadow-[0_10px_20px_rgba(225,29,72,0.22)]',
      accent: 'bg-rose-500',
    },
    slate: {
      card: 'from-white to-slate-100/80',
      icon: 'bg-slate-800 text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]',
      accent: 'bg-slate-400',
    },
  };
  const toneSet = tones[tone] || tones.blue;

  return (
    <div className={cx('group relative overflow-hidden rounded-lg border border-white/80 bg-gradient-to-br p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/[0.04] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.11)]', toneSet.card)}>
      <div className={cx('absolute inset-x-0 top-0 h-1', toneSet.accent)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-normal text-slate-950">{value}</p>
        </div>
        {Icon ? (
          <div className={cx('rounded-lg p-2.5 transition group-hover:scale-105', toneSet.icon)}>
            <Icon size={20} />
          </div>
        ) : null}
      </div>
      {helper ? <p className="mt-3 text-xs font-medium text-slate-500">{helper}</p> : null}
    </div>
  );
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  };

  return (
    <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ring-1', tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

export function EmptyState({ title = 'No data found', description = 'Add records to see them here.', icon: Icon = PackageOpen }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
      <div className="rounded-lg bg-white p-3 text-slate-500 shadow-sm ring-1 ring-slate-200">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm font-medium text-slate-500">{description}</p>
    </div>
  );
}

export function Alert({ type = 'info', children }) {
  const tones = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
  };

  return <div className={cx('rounded-lg border px-3 py-2 text-sm font-medium', tones[type] || tones.info)}>{children}</div>;
}
