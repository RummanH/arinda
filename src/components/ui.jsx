import { PackageOpen, X } from 'lucide-react';

export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function Modal({ title, description, children, onClose, width = 'max-w-2xl' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md no-print">
      <div className={cx('w-full overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/5', width)}>
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
          <p className="inline-flex rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-700">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
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
    <div className={cx('group relative overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-br p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/[0.04] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.11)]', toneSet.card)}>
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
    <div className="flex min-h-52 flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
      <div className="rounded-2xl bg-white p-3 text-slate-500 shadow-sm ring-1 ring-slate-200">
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

export function ChartPanel({ title, description, action, children, className = '' }) {
  return (
    <section className={cx('surface overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100/80 px-5 py-4">
        <div>
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          {description ? <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function DonutChart({ data, valueFormatter = (value) => value, centerLabel = 'Total', centerValue, size = 220 }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const strokeWidth = 22;
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(148, 163, 184, 0.16)" strokeWidth={strokeWidth} />
          {data.map((item) => {
            const value = Number(item.value || 0);
            const dash = total ? (value / total) * circumference : 0;
            const segment = (
              <circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return segment;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{centerLabel}</span>
          <span className="mt-2 text-3xl font-black tracking-tight text-slate-950">{centerValue ?? valueFormatter(total)}</span>
        </div>
      </div>
      <div className="grid w-full gap-3">
        {data.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-100 bg-white/70 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-sm font-bold text-slate-700">{item.label}</span>
              </div>
              <span className="shrink-0 text-sm font-black text-slate-950">{valueFormatter(item.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendChart({ data, series, valueFormatter = (value) => value, height = 260 }) {
  const width = 720;
  const padding = { top: 18, right: 18, bottom: 28, left: 18 };
  const values = data.flatMap((item) => series.map((entry) => Number(item[entry.key] || 0)));
  const maxValue = Math.max(...values, 1);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : 0;

  function x(index) {
    return padding.left + stepX * index;
  }

  function y(value) {
    return padding.top + chartHeight - (Number(value || 0) / maxValue) * chartHeight;
  }

  function buildLine(key) {
    return data
      .map((item, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(item[key])}`)
      .join(' ');
  }

  function buildArea(key) {
    if (!data.length) {
      return '';
    }
    return `${buildLine(key)} L ${x(data.length - 1)} ${padding.top + chartHeight} L ${x(0)} ${padding.top + chartHeight} Z`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {series.map((entry) => (
          <div key={entry.key} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.label}
          </div>
        ))}
      </div>
      <div className="rounded-[28px] border border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(243,247,250,0.95))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const yPos = padding.top + chartHeight * ratio;
            const value = Math.round(maxValue * (1 - ratio));
            return (
              <g key={ratio}>
                <line x1={padding.left} x2={width - padding.right} y1={yPos} y2={yPos} stroke="rgba(148,163,184,0.18)" strokeDasharray="6 6" />
                <text x={width - padding.right} y={yPos - 6} textAnchor="end" className="fill-slate-400 text-[11px] font-bold">
                  {valueFormatter(value)}
                </text>
              </g>
            );
          })}

          {series.map((entry, index) => (
            <g key={entry.key}>
              {index === 0 ? <path d={buildArea(entry.key)} fill={entry.fill || `${entry.color}22`} /> : null}
              <path d={buildLine(entry.key)} fill="none" stroke={entry.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {data.map((item, pointIndex) => (
                <circle key={`${entry.key}-${item.label}-${pointIndex}`} cx={x(pointIndex)} cy={y(item[entry.key])} r="4.5" fill="white" stroke={entry.color} strokeWidth="3" />
              ))}
            </g>
          ))}

          {data.map((item, index) => (
            <text key={item.label} x={x(index)} y={height - 6} textAnchor="middle" className="fill-slate-400 text-[11px] font-bold">
              {item.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function HorizontalBarChart({ data, valueFormatter = (value) => value, trackClassName = 'bg-slate-100', valueKey = 'value' }) {
  const max = Math.max(...data.map((item) => Number(item[valueKey] || 0)), 1);

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const value = Number(item[valueKey] || 0);
        const width = `${(value / max) * 100}%`;

        return (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{item.label}</p>
                {item.meta ? <p className="mt-0.5 text-xs font-medium text-slate-500">{item.meta}</p> : null}
              </div>
              <p className="shrink-0 text-sm font-black text-slate-950">{valueFormatter(value)}</p>
            </div>
            <div className={cx('h-3 overflow-hidden rounded-full', trackClassName)}>
              <div className="h-full rounded-full" style={{ width, background: item.color || 'linear-gradient(90deg,#2563eb,#0f766e)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StackedBarChart({ data, segments, totalFormatter = (value) => value }) {
  const max = Math.max(...data.map((item) => segments.reduce((sum, segment) => sum + Number(item[segment.key] || 0), 0)), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        {segments.map((segment) => (
          <div key={segment.key} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
            {segment.label}
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {data.map((item) => {
          const total = segments.reduce((sum, segment) => sum + Number(item[segment.key] || 0), 0);
          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{item.label}</p>
                  {item.meta ? <p className="mt-0.5 text-xs font-medium text-slate-500">{item.meta}</p> : null}
                </div>
                <p className="shrink-0 text-sm font-black text-slate-950">{totalFormatter(total)}</p>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                {segments.map((segment) => {
                  const value = Number(item[segment.key] || 0);
                  const width = total ? `${(value / max) * 100}%` : '0%';
                  return <div key={segment.key} className="h-full" style={{ width, background: segment.color }} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
