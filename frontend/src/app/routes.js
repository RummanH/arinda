import {
  CircleDollarSign,
  BarChart3,
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  HandCoins,
  RotateCcw,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  Database,
} from 'lucide-react';
import DashboardPage from '../features/dashboard/pages/DashboardPage';
import ActivityLogsPage from '../features/activity-logs/pages/ActivityLogsPage';
import DsrPage from '../features/dsrs/pages/DsrPage';
import HistoryPage from '../features/history/pages/HistoryPage';
import ExpensesPage from '../features/expenses/pages/ExpensesPage';
import DsrFinancePage from '../features/dsr-finance/pages/DsrFinancePage';
import MonthEndSummaryPage from '../features/month-end-summary/pages/MonthEndSummaryPage';
import MorningIssuePage from '../features/morning-issue/pages/MorningIssuePage';
import ProductsPage from '../features/products/pages/ProductsPage';
import DailyReportsPage from '../features/reports/pages/DailyReportsPage';
import EveningSettlementPage from '../features/settlements/pages/EveningSettlementPage';
import DatabaseBackupPage from '../features/database-backup/pages/DatabaseBackupPage';
import OrgSettingsPage from '../features/settings/pages/OrgSettingsPage';
import PlatformAdminPage from '../features/platform/pages/PlatformAdminPage';

export const APP_ROUTES = [
  { id: 'dashboard', path: '/dashboard', labelKey: 'nav.dashboard', icon: BarChart3, component: DashboardPage, group: 'overview' },
  { id: 'products', path: '/products', labelKey: 'nav.products', icon: Boxes, component: ProductsPage, group: 'operations' },
  { id: 'dsrs', path: '/dsrs', labelKey: 'nav.dsrs', icon: Users, component: DsrPage, group: 'operations' },
  { id: 'morning-issue', path: '/morning-issue', labelKey: 'nav.morningIssue', icon: Truck, component: MorningIssuePage, group: 'operations' },
  { id: 'settlements', path: '/settlements', labelKey: 'nav.eveningSettlement', icon: RotateCcw, component: EveningSettlementPage, group: 'operations' },
  { id: 'reports', path: '/reports', labelKey: 'nav.reports', icon: FileText, component: DailyReportsPage, group: 'operations' },
  { id: 'history', path: '/history', labelKey: 'nav.history', icon: ClipboardList, component: HistoryPage, group: 'operations' },
  { id: 'expenses', path: '/expenses', labelKey: 'nav.expenses', icon: CircleDollarSign, component: ExpensesPage, group: 'finance', permission: 'manage_expenses' },
  { id: 'dsr-finance', path: '/dsr-finance', labelKey: 'nav.dsrFinance', icon: HandCoins, component: DsrFinancePage, group: 'finance', permission: 'manage_dsr_finance' },
  { id: 'month-end-summary', path: '/month-end-summary', labelKey: 'nav.monthEndSummary', icon: BarChart3, component: MonthEndSummaryPage, group: 'finance', permission: 'manage_dsr_finance' },
  { id: 'activity-logs', path: '/activity-logs', labelKey: 'nav.activityLogs', icon: ClipboardList, component: ActivityLogsPage, group: 'governance', permission: 'view_activity_logs' },
  { id: 'database-backup', path: '/database-backup', labelKey: 'nav.databaseBackup', icon: Database, component: DatabaseBackupPage, group: 'governance', permission: 'manage_backups' },
  { id: 'org-settings', path: '/settings/organization', labelKey: 'nav.orgSettings', icon: Settings, component: OrgSettingsPage, group: 'governance', permission: 'manage_org' },
  { id: 'platform', path: '/platform', labelKey: 'nav.platform', icon: ShieldCheck, component: PlatformAdminPage, group: 'governance', role: 'platform_admin' },
];

export function getRouteLabel(pathname, t = (key) => key) {
  const matchedRoute = [...APP_ROUTES]
    .sort((left, right) => right.path.length - left.path.length)
    .find((route) => pathname === route.path || pathname.startsWith(`${route.path}/`));

  return matchedRoute ? t(matchedRoute.labelKey) : t('nav.dashboard');
}
