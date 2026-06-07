import { NavLink } from 'react-router-dom';
import { LogOut, UserCircle, Warehouse, X } from 'lucide-react';
import { Badge, cx } from '../components/ui';
import { APP_ROUTES } from './routes';
import LanguageSwitcher from './LanguageSwitcher';

export default function AppSidebar({ mobileOpen, setMobileOpen, user, language, onLanguageChange, onLogout, t, can }) {
  const sections = ['overview', 'operations', 'finance', 'governance'];
  const groupedRoutes = sections
    .map((section) => ({
      section,
      label: t(`navGroups.${section}`),
      routes: APP_ROUTES.filter((route) => route.group === section && (!route.permission || can(route.permission))),
    }))
    .filter((item) => item.routes.length > 0);

  return (
    <>
      <div
        className={cx(
          'shell-surface fixed inset-y-0 left-0 z-40 flex w-[min(18rem,85vw)] flex-col overflow-hidden px-4 py-5 text-slate-900 transition-transform duration-300 lg:w-72 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-500/10 to-transparent" />
        <div className="pointer-events-none absolute -right-10 top-20 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1d4ed8,#0f172a)] text-white shadow-[0_16px_32px_rgba(37,99,235,0.22)]">
              <Warehouse size={22} />
            </div>
            <div>
              <h2 className="mt-1 text-xl font-black tracking-normal text-slate-950">{t('app.brand')}</h2>
              {t('app.subtitle') ? <p className="text-xs font-semibold text-slate-500">{t('app.subtitle')}</p> : null}
            </div>
          </div>
          <button type="button" className="icon-btn lg:hidden" title={t('common.closeMenu')} onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="premium-scrollbar relative mt-8 min-h-0 flex-1 overflow-y-auto pb-6 pr-1">
          <div className="space-y-5">
            {groupedRoutes.map(({ section, label, routes }) => (
              <div key={section} className="space-y-2">
                <div className="px-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
                </div>
                <div className="space-y-1.5">
                  {routes.map((route) => {
                    const Icon = route.icon;

                    return (
                      <NavLink
                        key={route.id}
                        to={route.path}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          cx(
                            'group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition',
                            isActive
                              ? 'border border-blue-100 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,255,255,0.98))] text-slate-950 shadow-[0_14px_30px_rgba(37,99,235,0.12)]'
                              : 'border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span
                              className={cx(
                                'flex h-9 w-9 items-center justify-center rounded-2xl transition',
                                isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700',
                              )}
                            >
                              <Icon size={18} />
                            </span>
                            <span className="flex-1">{t(route.labelKey)}</span>
                            {isActive ? <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_0_6px_rgba(37,99,235,0.12)]" /> : null}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="relative mt-4 rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <UserCircle size={18} className="shrink-0 text-blue-600" />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{user?.name}</p>
                <p className="truncate text-xs font-bold text-slate-500">{user?.role}</p>
              </div>
            </div>
            <Badge tone="blue">BDT</Badge>
          </div>
          <div className="mt-4">
            <LanguageSwitcher language={language} onChange={onLanguageChange} t={t} compact />
          </div>
          <button
            type="button"
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            onClick={onLogout}
          >
            <LogOut size={16} />
            {t('auth.logout')}
          </button>
        </div>
      </div>

      {mobileOpen ? <button type="button" aria-label="Close sidebar overlay" className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}
    </>
  );
}
