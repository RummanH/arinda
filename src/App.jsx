import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Eye,
  FileText,
  MapPin,
  Menu,
  PackageCheck,
  PackagePlus,
  Pencil,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Truck,
  UserCheck,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import PrintableSheet from './components/PrintableSheet';
import { Alert, Badge, ChartPanel, DonutChart, EmptyState, HorizontalBarChart, Modal, SectionHeader, StackedBarChart, StatCard, TrendChart, cx } from './components/ui';
import {
  calculatePayable,
  calculateSold,
  cleanNumber,
  formatCasePiece,
  formatCurrency,
  formatDate,
  formatNumber,
  toPieces,
  todayISO,
} from './utils/calculations';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'products', label: 'Products', icon: Boxes },
  { id: 'dsr', label: 'DSR', icon: Users },
  { id: 'morning', label: 'Morning Issue', icon: Truck },
  { id: 'settlement', label: 'Evening Settlement', icon: RotateCcw },
  { id: 'reports', label: 'Daily Reports', icon: FileText },
];

async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || 'Request failed.');
  }
  return data;
}

function getSettlementFor(settlements, date, dsrId) {
  return settlements.find((settlement) => settlement.date === date && settlement.dsrId === dsrId);
}

function aggregateIssuesFor(issues, products, date, dsrId) {
  if (!date || !dsrId) {
    return { rows: [], issueIds: [], totalIssuedPieces: 0, totalIssuedValue: 0 };
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const rows = new Map();
  const issueIds = [];

  issues
    .filter((issue) => issue.date === date && issue.dsrId === dsrId)
    .forEach((issue) => {
      issueIds.push(issue.id);
      issue.items.forEach((item) => {
        const currentProduct = productMap.get(item.productId);
        const rate = Number(item.rate || currentProduct?.sellingPrice || 0);
        const key = `${item.productId}-${rate}`;
        const existing = rows.get(key) || {
          key,
          productId: item.productId,
          productName: item.productName || currentProduct?.name || 'Archived product',
          piecesPerCase: item.piecesPerCase || currentProduct?.piecesPerCase || 1,
          issuedPieces: 0,
          rate,
        };

        existing.issuedPieces += Number(item.issuedPieces || 0);
        rows.set(key, existing);
      });
    });

  const aggregatedRows = Array.from(rows.values());
  return {
    rows: aggregatedRows,
    issueIds,
    totalIssuedPieces: aggregatedRows.reduce((sum, item) => sum + item.issuedPieces, 0),
    totalIssuedValue: aggregatedRows.reduce((sum, item) => sum + item.issuedPieces * item.rate, 0),
  };
}

function getDsrSnapshot(dsrs, issues, settlements, dsrId, date) {
  const current = dsrs.find((dsr) => dsr.id === dsrId);
  if (current) {
    return { dsrName: current.name, area: current.area, phone: current.phone, status: current.status };
  }

  const settlement = settlements.find((item) => item.dsrId === dsrId && (!date || item.date === date));
  if (settlement) {
    return {
      dsrName: settlement.dsrName || 'Archived DSR',
      area: settlement.area || '-',
      phone: settlement.phone || '-',
      status: 'Archived',
    };
  }

  const issue = issues.find((item) => item.dsrId === dsrId && (!date || item.date === date));
  return {
    dsrName: issue?.dsrName || 'Archived DSR',
    area: issue?.area || '-',
    phone: issue?.phone || '-',
    status: 'Archived',
  };
}

function buildSheetData({ date, dsrId, dsrs, issues, settlements, products }) {
  const aggregate = aggregateIssuesFor(issues, products, date, dsrId);
  const settlement = getSettlementFor(settlements, date, dsrId);
  const dsr = getDsrSnapshot(dsrs, issues, settlements, dsrId, date);
  const status = settlement ? 'Completed' : aggregate.issueIds.length > 0 ? 'Pending' : 'No Issue';
  const items = settlement
    ? settlement.items
    : aggregate.rows.map((row) => ({
        ...row,
        returnedPieces: 0,
        soldPieces: 0,
        payable: 0,
      }));

  return {
    businessName: 'ARINDA ENTERPRISE',
    date,
    dsrId,
    dsrName: dsr.dsrName,
    area: dsr.area,
    phone: dsr.phone,
    status,
    items,
    totalPayable: settlement ? settlement.totalPayable : 0,
  };
}

function buildDailyRows({ date, dsrs, issues, settlements, products }) {
  const ids = new Set(dsrs.map((dsr) => dsr.id));
  issues.filter((issue) => issue.date === date).forEach((issue) => ids.add(issue.dsrId));
  settlements.filter((settlement) => settlement.date === date).forEach((settlement) => ids.add(settlement.dsrId));

  return Array.from(ids).map((dsrId) => {
    const dsr = getDsrSnapshot(dsrs, issues, settlements, dsrId, date);
    const aggregate = aggregateIssuesFor(issues, products, date, dsrId);
    const settlement = getSettlementFor(settlements, date, dsrId);
    const returnedPieces = settlement ? settlement.items.reduce((sum, item) => sum + Number(item.returnedPieces || 0), 0) : 0;
    const soldPieces = settlement ? settlement.items.reduce((sum, item) => sum + Number(item.soldPieces || 0), 0) : 0;
    const totalPayable = settlement ? settlement.totalPayable : 0;
    const status = settlement ? 'Completed' : aggregate.issueIds.length > 0 ? 'Pending' : 'No Issue';

    return {
      dsrId,
      ...dsr,
      issuedPieces: aggregate.totalIssuedPieces,
      returnedPieces,
      soldPieces,
      totalPayable,
      status,
    };
  });
}

function statusTone(status) {
  if (status === 'Completed' || status === 'Active') return 'emerald';
  if (status === 'Pending') return 'amber';
  if (status === 'Inactive') return 'rose';
  return 'slate';
}

function shortDate(date) {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00`));
}

function buildTradingTrend({ issues, settlements, today, limit = 7 }) {
  const dateSet = new Set([today]);
  issues.forEach((issue) => dateSet.add(issue.date));
  settlements.forEach((settlement) => dateSet.add(settlement.date));

  return Array.from(dateSet)
    .sort((a, b) => a.localeCompare(b))
    .slice(-limit)
    .map((date) => {
      const issueRows = issues.filter((issue) => issue.date === date);
      const settlementRows = settlements.filter((settlement) => settlement.date === date);
      return {
        date,
        label: shortDate(date),
        issued: issueRows.reduce((sum, issue) => sum + issue.items.reduce((itemSum, item) => itemSum + Number(item.issuedPieces || 0), 0), 0),
        sold: settlementRows.reduce((sum, settlement) => sum + settlement.items.reduce((itemSum, item) => itemSum + Number(item.soldPieces || 0), 0), 0),
        payable: settlementRows.reduce((sum, settlement) => sum + Number(settlement.totalPayable || 0), 0),
      };
    });
}

function buildCategoryInventory(products) {
  return Array.from(
    products.reduce((map, product) => {
      const key = product.category || 'Uncategorized';
      const current = map.get(key) || { label: key, value: 0, units: 0, color: 'linear-gradient(90deg,#0f766e,#2563eb)' };
      current.value += Number(product.stockPieces || 0) * Number(product.purchasePrice || 0);
      current.units += Number(product.stockPieces || 0);
      map.set(key, current);
      return map;
    }, new Map()).values(),
  )
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({
      ...item,
      color: ['#2563eb', '#0f766e', '#f97316', '#7c3aed', '#dc2626', '#0891b2'][index % 6],
      meta: `${formatNumber(item.units)} pcs in stock`,
    }));
}

function buildRoutePerformance(rows) {
  return rows
    .filter((row) => row.status !== 'No Issue')
    .sort((a, b) => b.totalPayable - a.totalPayable || b.soldPieces - a.soldPieces)
    .slice(0, 6)
    .map((row) => ({
      label: row.dsrName,
      meta: row.area,
      issued: row.issuedPieces,
      returned: row.returnedPieces,
      sold: row.soldPieces,
      totalPayable: row.totalPayable,
    }));
}

function buildTopPayableProducts(settlements) {
  return Array.from(
    settlements
      .flatMap((settlement) => settlement.items)
      .reduce((map, item) => {
        const current = map.get(item.productId) || { label: item.productName, value: 0, soldPieces: 0 };
        current.value += Number(item.payable || 0);
        current.soldPieces += Number(item.soldPieces || 0);
        map.set(item.productId, current);
        return map;
      }, new Map())
      .values(),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      meta: `${formatNumber(item.soldPieces)} pcs sold`,
      color: ['#0f766e', '#2563eb', '#f97316', '#7c3aed', '#e11d48'][index % 5],
    }));
}

export default function App() {
  const today = todayISO();
  const [activePage, setActivePage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [dsrs, setDsrs] = useState([]);
  const [issues, setIssues] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [productModal, setProductModal] = useState(null);
  const [stockModalProduct, setStockModalProduct] = useState(null);
  const [dsrModal, setDsrModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const pageTitle = NAV_ITEMS.find((item) => item.id === activePage)?.label || 'Dashboard';

  function applyState(nextState) {
    setProducts(nextState.products || []);
    setDsrs(nextState.dsrs || []);
    setIssues(nextState.issues || []);
    setSettlements(nextState.settlements || []);
  }

  async function refreshState() {
    try {
      setLoadError('');
      const state = await apiRequest('/state');
      applyState(state);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshState();
  }, []);

  async function handleSaveProduct(product) {
    try {
      const state = product.id
        ? await apiRequest(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) })
        : await apiRequest('/products', { method: 'POST', body: JSON.stringify(product) });
      applyState(state);
      setProductModal(null);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  async function handleDeleteProduct(product) {
    if (!window.confirm(`Delete ${product.name}? Existing issue and settlement history will remain visible.`)) {
      return;
    }
    try {
      const state = await apiRequest(`/products/${product.id}`, { method: 'DELETE' });
      applyState(state);
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function handleAddStock(productId, addPieces) {
    try {
      const state = await apiRequest(`/products/${productId}/stock`, {
        method: 'POST',
        body: JSON.stringify({ addPieces }),
      });
      applyState(state);
      setStockModalProduct(null);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  async function handleSaveDsr(dsr) {
    try {
      const state = dsr.id ? await apiRequest(`/dsrs/${dsr.id}`, { method: 'PUT', body: JSON.stringify(dsr) }) : await apiRequest('/dsrs', { method: 'POST', body: JSON.stringify(dsr) });
      applyState(state);
      setDsrModal(null);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  async function handleDeleteDsr(dsr) {
    if (!window.confirm(`Delete ${dsr.name}? Existing issue and settlement history will remain visible.`)) {
      return;
    }
    try {
      const state = await apiRequest(`/dsrs/${dsr.id}`, { method: 'DELETE' });
      applyState(state);
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function handleSaveIssue(issue) {
    try {
      const state = await apiRequest('/issues', { method: 'POST', body: JSON.stringify(issue) });
      applyState(state);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  async function handleCompleteSettlement(settlement) {
    try {
      const state = await apiRequest('/settlements', { method: 'POST', body: JSON.stringify(settlement) });
      applyState(state);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }

  const pageProps = {
    products,
    dsrs,
    issues,
    settlements,
    today,
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
          <div className="surface w-full p-6 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">ARINDA ENTERPRISE</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Loading live inventory data</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="lg:pl-72">
        <TopHeader title={pageTitle} today={today} onOpenMenu={() => setMobileOpen(true)} />
        <main className="relative z-10 mx-auto max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8">
          {loadError ? (
            <div className="mb-6">
              <Alert type="error">{loadError}</Alert>
            </div>
          ) : null}
          {activePage === 'dashboard' ? <DashboardPage {...pageProps} /> : null}
          {activePage === 'products' ? (
            <ProductsPage
              products={products}
              onAdd={() => setProductModal({ mode: 'add' })}
              onEdit={(product) => setProductModal({ mode: 'edit', product })}
              onDelete={handleDeleteProduct}
              onStock={(product) => setStockModalProduct(product)}
            />
          ) : null}
          {activePage === 'dsr' ? (
            <DsrPage dsrs={dsrs} onAdd={() => setDsrModal({ mode: 'add' })} onEdit={(dsr) => setDsrModal({ mode: 'edit', dsr })} onDelete={handleDeleteDsr} />
          ) : null}
          {activePage === 'morning' ? <MorningIssuePage {...pageProps} onSaveIssue={handleSaveIssue} /> : null}
          {activePage === 'settlement' ? <EveningSettlementPage {...pageProps} onCompleteSettlement={handleCompleteSettlement} /> : null}
          {activePage === 'reports' ? <DailyReportsPage {...pageProps} /> : null}
        </main>
      </div>

      {productModal ? <ProductFormModal product={productModal.product} onClose={() => setProductModal(null)} onSave={handleSaveProduct} /> : null}
      {stockModalProduct ? <StockUpdateModal product={stockModalProduct} onClose={() => setStockModalProduct(null)} onSave={handleAddStock} /> : null}
      {dsrModal ? <DsrFormModal dsr={dsrModal.dsr} onClose={() => setDsrModal(null)} onSave={handleSaveDsr} /> : null}
    </div>
  );
}

function Sidebar({ activePage, onNavigate, mobileOpen, setMobileOpen }) {
  return (
    <>
      <div
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#081321_0%,#0d1f31_52%,#10273a_100%)] px-4 py-5 text-white shadow-[18px_0_60px_rgba(15,23,42,0.22)] transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cyan-400/20 to-transparent" />
        <div className="pointer-events-none absolute -right-10 top-20 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fef3c7,#ffffff)] text-cyan-800 shadow-[0_16px_32px_rgba(14,165,233,0.24)]">
              <Warehouse size={22} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">Dealer OS</p>
              <h2 className="mt-1 text-xl font-black tracking-normal">ARINDA Flow</h2>
            </div>
          </div>
          <button type="button" className="icon-btn border-slate-700 bg-slate-900 text-white hover:bg-slate-800 lg:hidden" title="Close menu" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="relative mt-8 rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Workspace</p>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-300">Friendlier daily control for stock, salesmen, returns, and collection.</p>
        </div>

        <nav className="relative mt-5 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                className={cx(
                  'group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition',
                  active
                    ? 'bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(236,254,255,0.96))] text-slate-950 shadow-[0_16px_35px_rgba(15,23,42,0.24)]'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white',
                )}
              >
                <span
                  className={cx(
                    'flex h-9 w-9 items-center justify-center rounded-2xl transition',
                    active ? 'bg-cyan-50 text-cyan-700' : 'bg-white/10 text-slate-300 group-hover:bg-white/20 group-hover:text-white',
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className="flex-1">{item.label}</span>
                {active ? <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.14)]" /> : null}
              </button>
            );
          })}
        </nav>

        <div className="relative mt-auto rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4 shadow-inner">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
              <p className="text-sm font-black">System healthy</p>
            </div>
            <Badge tone="emerald">BDT</Badge>
          </div>
          <p className="mt-3 text-xs font-medium leading-5 text-slate-400">PostgreSQL, Express, and the Vite dashboard are running as one workflow so the team sees fresh figures with less friction.</p>
        </div>
      </div>

      {mobileOpen ? <button type="button" aria-label="Close sidebar overlay" className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}
    </>
  );
}

function TopHeader({ title, today, onOpenMenu }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-2xl no-print">
      <div className="mx-auto flex min-h-20 max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button type="button" className="icon-btn lg:hidden" title="Open menu" onClick={onOpenMenu}>
            <Menu size={20} />
          </button>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Arinda Enterprise</p>
            <h1 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">{title}</h1>
            <p className="mt-1 hidden text-sm font-medium text-slate-500 md:block">Designed to make stock, DSR, and collection work clearer for everyone using it.</p>
          </div>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={17} />
            Live Data
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm">
            <CalendarDays size={17} className="text-cyan-600" />
            {formatDate(today)}
          </div>
        </div>
      </div>
    </header>
  );
}

function DashboardPage({ products, dsrs, issues, settlements, today }) {
  const activeDsrs = dsrs.filter((dsr) => dsr.status === 'Active').length;
  const stockUnits = products.reduce((sum, product) => sum + product.stockPieces, 0);
  const stockValue = products.reduce((sum, product) => sum + product.stockPieces * Number(product.purchasePrice || 0), 0);
  const stockSellingValue = products.reduce((sum, product) => sum + product.stockPieces * Number(product.sellingPrice || 0), 0);
  const expectedStockProfit = stockSellingValue - stockValue;
  const todayIssues = issues.filter((issue) => issue.date === today);
  const totalIssuedToday = issues.filter((issue) => issue.date === today).reduce((sum, issue) => sum + issue.items.reduce((itemSum, item) => itemSum + item.issuedPieces, 0), 0);
  const todaySettlements = settlements.filter((settlement) => settlement.date === today);
  const totalReturnedToday = todaySettlements.reduce((sum, settlement) => sum + settlement.items.reduce((itemSum, item) => itemSum + item.returnedPieces, 0), 0);
  const totalSoldToday = todaySettlements.reduce((sum, settlement) => sum + settlement.items.reduce((itemSum, item) => itemSum + item.soldPieces, 0), 0);
  const payableToday = todaySettlements.reduce((sum, settlement) => sum + settlement.totalPayable, 0);
  const lowStockAll = products.filter((product) => product.stockPieces <= product.piecesPerCase * 4);
  const outOfStockCount = products.filter((product) => product.stockPieces === 0).length;
  const lowStockProducts = [...lowStockAll]
    .sort((a, b) => a.stockPieces - b.stockPieces)
    .slice(0, 8);
  const dailyRows = buildDailyRows({ date: today, dsrs, issues, settlements, products });
  const dsrSummary = dailyRows.filter((row) => row.status !== 'No Issue');
  const pendingRows = dailyRows.filter((row) => row.status === 'Pending');
  const completedRows = dailyRows.filter((row) => row.status === 'Completed');
  const issuedDsrIds = new Set(todayIssues.map((issue) => issue.dsrId));
  const notIssuedDsrs = dsrs.filter((dsr) => dsr.status === 'Active' && !issuedDsrIds.has(dsr.id));
  const completionRate = issuedDsrIds.size ? Math.round((completedRows.length / issuedDsrIds.size) * 100) : 0;
  const averagePayable = completedRows.length ? payableToday / completedRows.length : 0;
  const topStockValueProducts = [...products]
    .sort((a, b) => b.stockPieces * b.purchasePrice - a.stockPieces * a.purchasePrice)
    .slice(0, 5);
  const topSoldProducts = Array.from(
    todaySettlements
      .flatMap((settlement) => settlement.items)
      .reduce((map, item) => {
        const existing = map.get(item.productId) || {
          productId: item.productId,
          productName: item.productName,
          soldPieces: 0,
          payable: 0,
        };
        existing.soldPieces += Number(item.soldPieces || 0);
        existing.payable += Number(item.payable || 0);
        map.set(item.productId, existing);
        return map;
      }, new Map())
      .values(),
  )
    .sort((a, b) => b.payable - a.payable)
    .slice(0, 5);
  const ownerTasks = [
    {
      title: totalIssuedToday ? 'Morning delivery has started' : 'Morning issue not done yet',
      detail: totalIssuedToday ? `${formatNumber(totalIssuedToday)} pieces given to DSRs today.` : 'Give products to DSRs from Morning Issue.',
      tone: totalIssuedToday ? 'emerald' : 'amber',
      icon: Truck,
    },
    {
      title: pendingRows.length ? 'Evening return pending' : 'No pending return right now',
      detail: pendingRows.length ? `${pendingRows.length} DSR needs return and cash settlement.` : 'All issued DSRs are settled or no issue has been made.',
      tone: pendingRows.length ? 'amber' : 'emerald',
      icon: RotateCcw,
    },
    {
      title: lowStockAll.length ? 'Stock needs attention' : 'Stock level is healthy',
      detail: lowStockAll.length ? `${lowStockAll.length} products are below 4 cases. ${outOfStockCount} product is out of stock.` : 'No low-stock product found.',
      tone: lowStockAll.length ? 'rose' : 'emerald',
      icon: AlertTriangle,
    },
    {
      title: payableToday ? 'Cash collection visible' : 'No collection recorded yet',
      detail: payableToday ? `${formatCurrency(payableToday)} should be collected from completed settlements.` : 'Complete evening settlement to see cash amount.',
      tone: payableToday ? 'blue' : 'slate',
      icon: CircleDollarSign,
    },
  ];
  const tradingTrend = buildTradingTrend({ issues, settlements, today });
  const inventoryByCategory = buildCategoryInventory(products);
  const routePerformance = buildRoutePerformance(dailyRows);
  const topPayableProducts = buildTopPayableProducts(todaySettlements);
  const settlementMix = [
    { label: 'Completed', value: completedRows.length, color: '#0f766e' },
    { label: 'Pending', value: pendingRows.length, color: '#f59e0b' },
    { label: 'No issue', value: Math.max(activeDsrs - issuedDsrIds.size, 0), color: '#cbd5e1' },
  ];
  const operationalPulse = [
    { title: 'Collection flow', value: `${formatNumber(completionRate)}%`, subtitle: 'Of issued DSRs already settled' },
    { title: 'Average ticket', value: formatCurrency(averagePayable), subtitle: 'Average payable per completed DSR' },
    { title: 'Attention stock', value: formatNumber(lowStockAll.length), subtitle: 'SKUs below four cases' },
  ];

  return (
    <div>
      <SectionHeader eyebrow="Today" title="Dealership Command Center" description="A friendlier live view of route issue, return, stock risk, and collection performance for the current trading day." />

      <div className="mb-6 overflow-hidden rounded-[34px] border border-white/20 bg-[linear-gradient(140deg,#071827_0%,#12304b_40%,#0d5b5a_100%)] shadow-[0_30px_80px_rgba(8,15,28,0.22)]">
        <div className="grid gap-8 p-5 text-white lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
          <div className="flex flex-col justify-between gap-7">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                <CheckCircle2 size={14} />
                Live Trading Day
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">A calmer, clearer dashboard for daily dealership work.</h2>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">See what moved this morning, what still needs settlement tonight, where money is tied up in stock, and which routes need attention first.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {operationalPulse.map((item) => (
                <div key={item.title} className="rounded-[26px] border border-white/12 bg-white/10 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/85">{item.title}</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-white">{item.value}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-cyan-50/80">{item.subtitle}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-bold">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2">
                <CalendarDays size={16} />
                {formatDate(today)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2">
                <UserCheck size={16} />
                {formatNumber(activeDsrs)} active DSRs
              </span>
            </div>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Payable Today</p>
              <p className="mt-3 text-3xl font-black tracking-tight">{formatCurrency(payableToday)}</p>
              <p className="mt-2 text-sm font-medium text-cyan-50/80">Expected cash from completed evening settlements.</p>
            </div>
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Stock Value</p>
              <p className="mt-3 text-3xl font-black tracking-tight">{formatCurrency(stockValue)}</p>
              <p className="mt-2 text-sm font-medium text-cyan-50/80">Current inventory cost parked in the warehouse.</p>
            </div>
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Units in Stock</p>
              <p className="mt-3 text-3xl font-black tracking-tight">{formatNumber(stockUnits)}</p>
              <p className="mt-2 text-sm font-medium text-cyan-50/80">Pieces ready for issue across all products.</p>
            </div>
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">Possible Profit</p>
              <p className="mt-3 text-3xl font-black tracking-tight">{formatCurrency(expectedStockProfit)}</p>
              <p className="mt-2 text-sm font-medium text-cyan-50/80">Selling value minus current purchase cost.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Products" value={formatNumber(products.length)} helper="Tracked FMCG SKUs" icon={Boxes} tone="blue" />
        <StatCard title="Sales Value in Stock" value={formatCurrency(stockSellingValue)} helper="If all current stock sells" icon={CircleDollarSign} tone="emerald" />
        <StatCard title="Issued Today" value={`${formatNumber(totalIssuedToday)} pcs`} helper="Morning delivery quantity" icon={Truck} tone="amber" />
        <StatCard title="Returned Today" value={`${formatNumber(totalReturnedToday)} pcs`} helper="Added back after settlement" icon={RotateCcw} tone="slate" />
        <StatCard title="Sold Today" value={`${formatNumber(totalSoldToday)} pcs`} helper="Issued minus returned" icon={PackageCheck} tone="emerald" />
        <StatCard title="Pending Return" value={`${formatNumber(pendingRows.length)} DSR`} helper="Still waiting for settlement" icon={AlertTriangle} tone={pendingRows.length ? 'amber' : 'emerald'} />
        <StatCard title="Completed Settlement" value={`${formatNumber(completedRows.length)} DSR`} helper={`${completionRate}% of issued routes closed`} icon={CheckCircle2} tone="blue" />
        <StatCard title="Low Stock" value={formatNumber(lowStockAll.length)} helper={`${outOfStockCount} fully out of stock`} icon={AlertTriangle} tone={lowStockAll.length ? 'rose' : 'emerald'} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        {ownerTasks.map((task) => {
          const Icon = task.icon;
          return (
            <div key={task.title} className="surface rounded-[28px] p-5">
              <div className="flex items-start gap-3">
                <div className={cx('rounded-2xl p-2.5', task.tone === 'emerald' && 'bg-emerald-50 text-emerald-700', task.tone === 'amber' && 'bg-amber-50 text-amber-700', task.tone === 'rose' && 'bg-rose-50 text-rose-700', task.tone === 'blue' && 'bg-blue-50 text-blue-700', task.tone === 'slate' && 'bg-slate-100 text-slate-700')}>
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-950">{task.title}</h3>
                  <p className="mt-1 text-sm font-medium leading-5 text-slate-500">{task.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ChartPanel title="Trading Trend" description="Recent route activity across issue, sell-through, and payable collection.">
          <TrendChart
            data={tradingTrend}
            valueFormatter={(value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : `${Math.round(value)}`)}
            series={[
              { key: 'payable', label: 'Payable', color: '#0f766e', fill: 'rgba(15,118,110,0.14)' },
              { key: 'issued', label: 'Issued', color: '#2563eb' },
              { key: 'sold', label: 'Sold', color: '#f97316' },
            ]}
          />
        </ChartPanel>

        <ChartPanel title="Settlement Mix" description="How today’s active routes are split between completed, pending, and not yet issued.">
          <DonutChart data={settlementMix} centerLabel="Active routes" centerValue={formatNumber(activeDsrs)} valueFormatter={(value) => `${formatNumber(value)} DSR`} />
        </ChartPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartPanel title="Inventory by Category" description="Where most of the warehouse money is currently tied up.">
          {inventoryByCategory.length ? <HorizontalBarChart data={inventoryByCategory.slice(0, 6)} valueFormatter={formatCurrency} /> : <EmptyState title="No inventory data yet" description="Add products to see category distribution." icon={Boxes} />}
        </ChartPanel>

        <ChartPanel title="Route Performance" description="Top routes by collected value with sold, returned, and issued movement layered together.">
          {routePerformance.length ? (
            <StackedBarChart
              data={routePerformance}
              segments={[
                { key: 'issued', label: 'Issued', color: '#bfdbfe' },
                { key: 'returned', label: 'Returned', color: '#fdba74' },
                { key: 'sold', label: 'Sold', color: '#0f766e' },
              ]}
              totalFormatter={(value) => `${formatNumber(value)} pcs`}
            />
          ) : (
            <EmptyState title="No route movement today" description="Create a morning issue to start route performance tracking." icon={Truck} />
          )}
        </ChartPanel>

        <ChartPanel title="Top Products by Cash" description="Products generating the strongest payable amount from today’s settlements.">
          {topPayableProducts.length ? <HorizontalBarChart data={topPayableProducts} valueFormatter={formatCurrency} trackClassName="bg-emerald-50" /> : <EmptyState title="No sold products yet" description="Complete evening settlements to unlock product cash ranking." icon={PackageCheck} />}
        </ChartPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <ChartPanel title="Friendly Summary" description="Simple owner-facing checkpoints without needing to read the full tables.">
          <div className="grid gap-3 md:grid-cols-2">
            <InsightLine label="DSRs issued today" value={`${formatNumber(issuedDsrIds.size)} / ${formatNumber(activeDsrs)}`} />
            <InsightLine label="Issue sheets made" value={formatNumber(todayIssues.length)} />
            <InsightLine label="Average cash per DSR" value={formatCurrency(averagePayable)} />
            <InsightLine label="Active DSR not issued" value={`${formatNumber(notIssuedDsrs.length)} DSR`} />
            <InsightLine label="Highest stock value SKU" value={topStockValueProducts[0] ? topStockValueProducts[0].name : '-'} />
            <InsightLine label="Best sold today" value={topSoldProducts[0] ? topSoldProducts[0].productName : '-'} />
          </div>
        </ChartPanel>

        <ChartPanel title="Action Queue" description="The next things a manager can resolve fastest from this screen.">
          <div className="space-y-3">
            {pendingRows.length ? pendingRows.slice(0, 4).map((row) => <InsightLine key={row.dsrId} label={`${row.dsrName} - ${row.area}`} value={`${formatNumber(row.issuedPieces)} pcs pending`} />) : <div className="rounded-2xl bg-emerald-50 px-4 py-4 text-sm font-bold text-emerald-700">No DSR return is pending right now.</div>}
            {lowStockProducts.length ? lowStockProducts.slice(0, 3).map((product) => <InsightLine key={product.id} label={product.name} value={formatCasePiece(product.stockPieces, product.piecesPerCase)} />) : <div className="rounded-2xl bg-sky-50 px-4 py-4 text-sm font-bold text-sky-700">Stock levels are healthy across your current product list.</div>}
          </div>
        </ChartPanel>
      </div>
    </div>
  );
}

function InsightLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,250,252,0.95))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <span className="min-w-0 truncate text-sm font-bold text-slate-600">{label}</span>
      <span className="shrink-0 text-sm font-black text-slate-950">{value}</span>
    </div>
  );
}

function ProductsPage({ products, onAdd, onEdit, onDelete, onStock }) {
  const [search, setSearch] = useState('');
  const filteredProducts = products.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <SectionHeader
        eyebrow="Inventory"
        title="Product Management"
        description="Manage the 28 weekly products, selling rates, case size, and available stock."
        action={
          <button type="button" className="btn-primary" onClick={onAdd}>
            <Plus size={18} />
            Add Product
          </button>
        }
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or category" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Case Size</th>
                <th className="px-4 py-3">Purchase</th>
                <th className="px-4 py-3">Selling</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="table-cell">
                    <p className="font-semibold text-slate-950">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.category}</p>
                  </td>
                  <td className="table-cell">{product.piecesPerCase} pcs/case</td>
                  <td className="table-cell">{formatCurrency(product.purchasePrice)}</td>
                  <td className="table-cell font-semibold">{formatCurrency(product.sellingPrice)}</td>
                  <td className="table-cell">
                    <p className="font-semibold text-slate-950">{formatCasePiece(product.stockPieces, product.piecesPerCase)}</p>
                    <p className="text-xs text-slate-500">{formatNumber(product.stockPieces)} pcs total</p>
                  </td>
                  <td className="table-cell">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn-secondary h-9 px-3" onClick={() => onStock(product)}>
                        <PackagePlus size={16} />
                        Stock
                      </button>
                      <button type="button" className="icon-btn" title="Edit product" onClick={() => onEdit(product)}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title="Delete product" onClick={() => onDelete(product)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredProducts.length ? (
          <div className="p-5">
            <EmptyState title="No products matched" description="Try a different search term or add a new product." icon={Boxes} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProductFormModal({ product, onClose, onSave }) {
  const isEdit = Boolean(product);
  const initialCaseSize = product?.piecesPerCase || 24;
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || '',
    piecesPerCase: initialCaseSize,
    purchasePrice: product?.purchasePrice || '',
    sellingPrice: product?.sellingPrice || '',
    stockCase: product ? Math.floor(product.stockPieces / initialCaseSize) : 0,
    stockPiece: product ? product.stockPieces % initialCaseSize : 0,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const calculatedStock = toPieces(form.stockCase, form.stockPiece, form.piecesPerCase);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    const piecesPerCase = cleanNumber(form.piecesPerCase);
    const purchasePrice = Number(form.purchasePrice);
    const sellingPrice = Number(form.sellingPrice);

    if (!form.name.trim() || !form.category.trim()) {
      setError('Product name and category are required.');
      return;
    }
    if (piecesPerCase <= 0 || purchasePrice <= 0 || sellingPrice <= 0) {
      setError('Case size, purchase price, and selling price must be greater than zero.');
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave({
      id: product?.id,
      name: form.name.trim(),
      category: form.category.trim(),
      piecesPerCase,
      purchasePrice,
      sellingPrice,
      stockPieces: calculatedStock,
    });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || 'Unable to save product.');
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Product' : 'Add Product'} description="Quantity can be entered as case and loose pieces." onClose={onClose}>
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Product Name</label>
            <input className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Potato Chips 25g" />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(event) => updateField('category', event.target.value)} placeholder="Snacks" />
          </div>
          <div>
            <label className="label">Pieces Per Case</label>
            <input className="input" type="number" min="1" value={form.piecesPerCase} onChange={(event) => updateField('piecesPerCase', event.target.value)} />
          </div>
          <div>
            <label className="label">Purchase Price</label>
            <input className="input" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={(event) => updateField('purchasePrice', event.target.value)} />
          </div>
          <div>
            <label className="label">Selling Price</label>
            <input className="input" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(event) => updateField('sellingPrice', event.target.value)} />
          </div>
          <div>
            <label className="label">Stock Preview</label>
            <div className="flex h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
              {formatCasePiece(calculatedStock, form.piecesPerCase)}
            </div>
          </div>
          <div>
            <label className="label">Stock Case</label>
            <input className="input" type="number" min="0" value={form.stockCase} onChange={(event) => updateField('stockCase', event.target.value)} />
          </div>
          <div>
            <label className="label">Stock Piece</label>
            <input className="input" type="number" min="0" value={form.stockPiece} onChange={(event) => updateField('stockPiece', event.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StockUpdateModal({ product, onClose, onSave }) {
  const [caseQty, setCaseQty] = useState(0);
  const [pieceQty, setPieceQty] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const addPieces = toPieces(caseQty, pieceQty, product.piecesPerCase);
  const nextStock = product.stockPieces + addPieces;

  async function submitForm(event) {
    event.preventDefault();
    if (addPieces <= 0) {
      setError('Enter stock in case or piece before saving.');
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave(product.id, addPieces);
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || 'Unable to update stock.');
    }
  }

  return (
    <Modal title="Add Stock" description={product.name} onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Current Stock</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{formatCasePiece(product.stockPieces, product.piecesPerCase)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">After Update</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">{formatCasePiece(nextStock, product.piecesPerCase)}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Add Case</label>
            <input className="input" type="number" min="0" value={caseQty} onChange={(event) => setCaseQty(event.target.value)} />
          </div>
          <div>
            <label className="label">Add Piece</label>
            <input className="input" type="number" min="0" value={pieceQty} onChange={(event) => setPieceQty(event.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <PackagePlus size={18} />
            {saving ? 'Updating...' : 'Update Stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DsrPage({ dsrs, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState('');
  const filteredDsrs = dsrs.filter((dsr) => `${dsr.name} ${dsr.phone} ${dsr.area} ${dsr.status}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <SectionHeader
        eyebrow="Sales team"
        title="DSR Management"
        description="Manage route salesmen used for morning delivery and evening collection settlement."
        action={
          <button type="button" className="btn-primary" onClick={onAdd}>
            <Plus size={18} />
            Add DSR
          </button>
        }
      />

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input className="input pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search DSR, phone, area" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDsrs.map((dsr) => (
                <tr key={dsr.id} className="hover:bg-slate-50">
                  <td className="table-cell font-semibold text-slate-950">{dsr.name}</td>
                  <td className="table-cell">
                    <span className="inline-flex items-center gap-2">
                      <Phone size={15} className="text-slate-400" />
                      {dsr.phone}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={15} className="text-slate-400" />
                      {dsr.area}
                    </span>
                  </td>
                  <td className="table-cell">
                    <Badge tone={statusTone(dsr.status)}>{dsr.status}</Badge>
                  </td>
                  <td className="table-cell">
                    <div className="flex justify-end gap-2">
                      <button type="button" className="icon-btn" title="Edit DSR" onClick={() => onEdit(dsr)}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="icon-btn text-rose-600 hover:text-rose-700" title="Delete DSR" onClick={() => onDelete(dsr)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredDsrs.length ? (
          <div className="p-5">
            <EmptyState title="No DSR matched" description="Try another search or add a route salesman." icon={Users} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DsrFormModal({ dsr, onClose, onSave }) {
  const isEdit = Boolean(dsr);
  const [form, setForm] = useState({
    name: dsr?.name || '',
    phone: dsr?.phone || '',
    area: dsr?.area || '',
    status: dsr?.status || 'Active',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.area.trim()) {
      setError('Name, phone, and area are required.');
      return;
    }

    setSaving(true);
    setError('');
    const result = await onSave({ id: dsr?.id, ...form, name: form.name.trim(), phone: form.phone.trim(), area: form.area.trim() });
    setSaving(false);

    if (!result?.ok) {
      setError(result?.message || 'Unable to save DSR.');
    }
  }

  return (
    <Modal title={isEdit ? 'Edit DSR' : 'Add DSR'} description="DSRs marked active are available for morning issue." onClose={onClose} width="max-w-xl">
      <form className="space-y-4" onSubmit={submitForm}>
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Rahim Uddin" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="01700000000" />
          </div>
          <div>
            <label className="label">Area</label>
            <input className="input" value={form.area} onChange={(event) => updateField('area', event.target.value)} placeholder="Mirpur" />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Save DSR'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MorningIssuePage({ products, dsrs, settlements, today, onSaveIssue }) {
  const activeDsrs = dsrs.filter((dsr) => dsr.status === 'Active');
  const [date, setDate] = useState(today);
  const [dsrId, setDsrId] = useState(activeDsrs[0]?.id || '');
  const [quantities, setQuantities] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeDsrs.some((dsr) => dsr.id === dsrId) && activeDsrs[0]) {
      setDsrId(activeDsrs[0].id);
    }
  }, [activeDsrs, dsrId]);

  const selectedDsr = dsrs.find((dsr) => dsr.id === dsrId);
  const issueBlocked = settlements.some((settlement) => settlement.date === date && settlement.dsrId === dsrId);

  const issueRows = products.map((product) => {
    const quantity = quantities[product.id] || {};
    const issuedPieces = toPieces(quantity.caseQty, quantity.pieceQty, product.piecesPerCase);
    return {
      ...product,
      issuedPieces,
      issueValue: issuedPieces * Number(product.sellingPrice || 0),
      invalid: issuedPieces > product.stockPieces,
    };
  });
  const selectedRows = issueRows.filter((row) => row.issuedPieces > 0);
  const invalidRows = issueRows.filter((row) => row.invalid);
  const totalIssuedPieces = selectedRows.reduce((sum, row) => sum + row.issuedPieces, 0);
  const totalIssueValue = selectedRows.reduce((sum, row) => sum + row.issueValue, 0);

  function updateQuantity(productIdToUpdate, field, value) {
    setQuantities((current) => ({
      ...current,
      [productIdToUpdate]: {
        ...current[productIdToUpdate],
        [field]: value,
      },
    }));
    setMessage(null);
  }

  function clearSheet() {
    setQuantities({});
    setMessage(null);
  }

  async function saveIssue() {
    if (!date || !selectedDsr) {
      setMessage({ type: 'error', text: 'Select date and DSR before saving.' });
      return;
    }
    if (issueBlocked) {
      setMessage({ type: 'error', text: 'This DSR already has a completed settlement for the selected date.' });
      return;
    }
    if (!selectedRows.length) {
      setMessage({ type: 'error', text: 'Enter issue quantity for at least one product.' });
      return;
    }
    if (invalidRows.length) {
      setMessage({ type: 'error', text: 'One or more products exceed available stock. Fix the highlighted rows before saving.' });
      return;
    }

    const issue = {
      date,
      dsrId: selectedDsr.id,
      dsrName: selectedDsr.name,
      area: selectedDsr.area,
      phone: selectedDsr.phone,
      items: selectedRows.map((row) => ({
        productId: row.id,
        productName: row.name,
        piecesPerCase: row.piecesPerCase,
        issuedPieces: row.issuedPieces,
        rate: row.sellingPrice,
      })),
    };
    setSaving(true);
    const result = await onSaveIssue(issue);
    setSaving(false);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setQuantities({});
    setMessage({ type: 'success', text: 'Morning issue saved. Inventory stock has been reduced.' });
  }

  return (
    <div>
      <SectionHeader eyebrow="Delivery start" title="Morning Issue" description="Enter all product quantities on one DSR issue sheet. Stock is reduced only when the full sheet is saved." />

      <div className="surface mb-6 p-5">
        <div className="grid gap-4 lg:grid-cols-[180px_minmax(220px,1fr)_repeat(3,minmax(130px,160px))]">
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div>
            <label className="label">DSR</label>
            <select className="input" value={dsrId} onChange={(event) => setDsrId(event.target.value)}>
              {activeDsrs.map((dsr) => (
                <option key={dsr.id} value={dsr.id}>
                  {dsr.name} - {dsr.area}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">Lines</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(selectedRows.length)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">Total Qty</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(totalIssuedPieces)} pcs</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-blue-700">Issue Value</p>
            <p className="mt-1 text-xl font-black text-blue-900">{formatCurrency(totalIssueValue)}</p>
          </div>
        </div>
        {message ? (
          <div className="mt-4">
            <Alert type={message.type}>{message.text}</Alert>
          </div>
        ) : null}
        {issueBlocked ? (
          <div className="mt-4">
            <Alert type="error">This DSR already has a completed settlement for the selected date. New morning issue is locked.</Alert>
          </div>
        ) : null}
      </div>

      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Full Product Issue Sheet</h2>
            <p className="mt-1 text-sm text-slate-500">Enter case and loose piece quantities beside each product.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={clearSheet} disabled={saving || !selectedRows.length}>
              Clear
            </button>
            <button type="button" className="btn-primary" onClick={saveIssue} disabled={saving || issueBlocked || !products.length || Boolean(invalidRows.length)}>
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Issue'}
            </button>
          </div>
        </div>

        {products.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Available Stock</th>
                    <th className="px-4 py-3">Case</th>
                    <th className="px-4 py-3">Piece</th>
                    <th className="px-4 py-3">Total Issue</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issueRows.map((row) => {
                    const quantity = quantities[row.id] || {};
                    return (
                      <tr key={row.id} className={cx('hover:bg-slate-50', row.invalid && 'bg-rose-50')}>
                        <td className="table-cell">
                          <p className="font-semibold text-slate-950">{row.name}</p>
                          <p className="text-xs text-slate-500">{row.category} - {row.piecesPerCase} pcs/case</p>
                        </td>
                        <td className="table-cell">
                          <p className="font-semibold text-slate-950">{formatCasePiece(row.stockPieces, row.piecesPerCase)}</p>
                          <p className="text-xs text-slate-500">{formatNumber(row.stockPieces)} pcs</p>
                        </td>
                        <td className="table-cell">
                          <input
                            className="input h-9 w-24"
                            type="number"
                            min="0"
                            value={quantity.caseQty || ''}
                            onChange={(event) => updateQuantity(row.id, 'caseQty', event.target.value)}
                            disabled={saving || issueBlocked}
                          />
                        </td>
                        <td className="table-cell">
                          <input
                            className="input h-9 w-24"
                            type="number"
                            min="0"
                            value={quantity.pieceQty || ''}
                            onChange={(event) => updateQuantity(row.id, 'pieceQty', event.target.value)}
                            disabled={saving || issueBlocked}
                          />
                        </td>
                        <td className="table-cell">
                          <p className={cx('font-semibold', row.invalid ? 'text-rose-700' : 'text-slate-950')}>{formatCasePiece(row.issuedPieces, row.piecesPerCase)}</p>
                          {row.invalid ? <p className="text-xs font-semibold text-rose-700">Exceeds stock</p> : null}
                        </td>
                        <td className="table-cell">{formatCurrency(row.sellingPrice)}</td>
                        <td className="table-cell text-right font-bold">{formatCurrency(row.issueValue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              {invalidRows.length ? (
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
                  <AlertTriangle size={17} />
                  {invalidRows.length} product row exceeds available stock.
                </div>
              ) : (
                <div className="text-sm font-semibold text-slate-600">Only products with entered quantity will be saved in the issue sheet.</div>
              )}
              <div className="text-right text-sm">
                <p className="font-semibold text-slate-600">Total Issue Value</p>
                <p className="text-2xl font-black text-slate-950">{formatCurrency(totalIssueValue)}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="p-5">
            <EmptyState title="No products available" description="Add products first before creating a morning issue sheet." icon={Truck} />
          </div>
        )}
      </div>
    </div>
  );
}

function EveningSettlementPage({ products, dsrs, issues, settlements, today, onCompleteSettlement }) {
  const activeDsrs = dsrs.filter((dsr) => dsr.status === 'Active');
  const [date, setDate] = useState(today);
  const [dsrId, setDsrId] = useState(activeDsrs[0]?.id || '');
  const [returns, setReturns] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeDsrs.some((dsr) => dsr.id === dsrId) && activeDsrs[0]) {
      setDsrId(activeDsrs[0].id);
    }
  }, [activeDsrs, dsrId]);

  const issueData = useMemo(() => aggregateIssuesFor(issues, products, date, dsrId), [issues, products, date, dsrId]);
  const completedSettlement = getSettlementFor(settlements, date, dsrId);
  const issueKey = issueData.issueIds.join('|');

  useEffect(() => {
    setReturns({});
    setMessage(null);
  }, [date, dsrId, issueKey, completedSettlement?.id]);

  const calculatedRows = issueData.rows.map((row) => {
    const input = returns[row.key] || {};
    const returnedPieces = toPieces(input.caseQty, input.pieceQty, row.piecesPerCase);
    const soldPieces = calculateSold(row.issuedPieces, returnedPieces);
    return {
      ...row,
      returnedPieces,
      soldPieces,
      payable: calculatePayable(soldPieces, row.rate),
      invalid: returnedPieces > row.issuedPieces,
    };
  });
  const displayRows = completedSettlement ? completedSettlement.items.map((item) => ({ ...item, invalid: false })) : calculatedRows;
  const totalPayable = completedSettlement ? completedSettlement.totalPayable : calculatedRows.reduce((sum, item) => sum + item.payable, 0);
  const hasInvalidReturns = calculatedRows.some((row) => row.invalid);
  const sheet = buildSheetData({ date, dsrId, dsrs, issues, settlements, products });

  function updateReturn(rowKey, field, value) {
    setReturns((current) => ({
      ...current,
      [rowKey]: {
        ...current[rowKey],
        [field]: value,
      },
    }));
  }

  async function completeSettlement() {
    const dsr = dsrs.find((candidate) => candidate.id === dsrId);
    if (!dsr) {
      setMessage({ type: 'error', text: 'Select a valid DSR.' });
      return;
    }
    if (!issueData.rows.length) {
      setMessage({ type: 'error', text: 'No morning issue found for this DSR and date.' });
      return;
    }
    if (completedSettlement) {
      setMessage({ type: 'error', text: 'Settlement is already completed.' });
      return;
    }
    if (hasInvalidReturns) {
      setMessage({ type: 'error', text: 'Returned quantity cannot be greater than issued quantity.' });
      return;
    }

    const items = calculatedRows.map((row) => ({
      productId: row.productId,
      productName: row.productName,
      piecesPerCase: row.piecesPerCase,
      issuedPieces: row.issuedPieces,
      returnedPieces: row.returnedPieces,
      soldPieces: row.soldPieces,
      rate: row.rate,
      payable: row.payable,
    }));
    const settlement = {
      date,
      dsrId: dsr.id,
      dsrName: dsr.name,
      area: dsr.area,
      phone: dsr.phone,
      issueIds: issueData.issueIds,
      items,
      totalPayable: items.reduce((sum, item) => sum + item.payable, 0),
      status: 'Completed',
    };
    setSaving(true);
    const result = await onCompleteSettlement(settlement);
    setSaving(false);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setMessage({ type: 'success', text: `Settlement completed. Payable amount is ${formatCurrency(settlement.totalPayable)}.` });
  }

  return (
    <div>
      <SectionHeader eyebrow="Collection close" title="Evening Settlement" description="Enter returns against the morning issue. Sold quantity and payable amount calculate automatically." />

      <div className="surface p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div>
            <label className="label">DSR</label>
            <select className="input" value={dsrId} onChange={(event) => setDsrId(event.target.value)}>
              {activeDsrs.map((dsr) => (
                <option key={dsr.id} value={dsr.id}>
                  {dsr.name} - {dsr.area}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">Total Payable</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(totalPayable)}</p>
          </div>
        </div>
        {message ? (
          <div className="mt-4">
            <Alert type={message.type}>{message.text}</Alert>
          </div>
        ) : null}
      </div>

      <div className="surface mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">Settlement Items</h2>
            <p className="mt-1 text-sm text-slate-500">{completedSettlement ? 'This settlement is completed and read-only.' : 'Enter returned case and loose pieces for every issued product.'}</p>
          </div>
          {completedSettlement ? <Badge tone="emerald">Completed</Badge> : null}
        </div>

        {displayRows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Issued</th>
                    <th className="px-4 py-3">Return Case</th>
                    <th className="px-4 py-3">Return Piece</th>
                    <th className="px-4 py-3">Sold</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayRows.map((row) => (
                    <tr key={row.key || `${row.productId}-${row.rate}`} className={cx('hover:bg-slate-50', row.invalid && 'bg-rose-50')}>
                      <td className="table-cell font-semibold text-slate-950">{row.productName}</td>
                      <td className="table-cell">{formatCasePiece(row.issuedPieces, row.piecesPerCase)}</td>
                      <td className="table-cell">
                        {completedSettlement ? (
                          Math.floor(row.returnedPieces / row.piecesPerCase)
                        ) : (
                          <input
                            className="input h-9 w-24"
                            type="number"
                            min="0"
                            value={returns[row.key]?.caseQty || ''}
                            onChange={(event) => updateReturn(row.key, 'caseQty', event.target.value)}
                            disabled={saving}
                          />
                        )}
                      </td>
                      <td className="table-cell">
                        {completedSettlement ? (
                          row.returnedPieces % row.piecesPerCase
                        ) : (
                          <input
                            className="input h-9 w-24"
                            type="number"
                            min="0"
                            value={returns[row.key]?.pieceQty || ''}
                            onChange={(event) => updateReturn(row.key, 'pieceQty', event.target.value)}
                            disabled={saving}
                          />
                        )}
                      </td>
                      <td className="table-cell font-semibold">{formatCasePiece(row.soldPieces, row.piecesPerCase)}</td>
                      <td className="table-cell">{formatCurrency(row.rate)}</td>
                      <td className="table-cell font-bold">{formatCurrency(row.payable)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              {hasInvalidReturns ? (
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
                  <AlertTriangle size={17} />
                  Returned quantity is greater than issued quantity.
                </div>
              ) : (
                <div className="text-sm font-semibold text-slate-600">Returned stock is added back to inventory after completion.</div>
              )}
              <div className="flex justify-end gap-2">
                {completedSettlement ? (
                  <button type="button" className="btn-secondary" onClick={() => window.print()}>
                    <Printer size={18} />
                    Print Sheet
                  </button>
                ) : null}
                <button type="button" className="btn-primary" onClick={completeSettlement} disabled={saving || Boolean(completedSettlement) || hasInvalidReturns}>
                  <CheckCircle2 size={18} />
                  {saving ? 'Saving...' : 'Complete Settlement'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-5">
            <EmptyState title="No issue found" description="Create a morning issue for this DSR and date before settlement." icon={ClipboardList} />
          </div>
        )}
      </div>

      {completedSettlement ? (
        <div className="mt-6">
          <PrintableSheet sheet={sheet} printTarget />
        </div>
      ) : null}
    </div>
  );
}

function DailyReportsPage({ products, dsrs, issues, settlements, today }) {
  const [date, setDate] = useState(today);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const rows = useMemo(() => buildDailyRows({ date, dsrs, issues, settlements, products }), [date, dsrs, issues, settlements, products]);
  const totals = rows.reduce(
    (sum, row) => ({
      issuedPieces: sum.issuedPieces + row.issuedPieces,
      returnedPieces: sum.returnedPieces + row.returnedPieces,
      soldPieces: sum.soldPieces + row.soldPieces,
      totalPayable: sum.totalPayable + row.totalPayable,
    }),
    { issuedPieces: 0, returnedPieces: 0, soldPieces: 0, totalPayable: 0 },
  );
  const chartRows = rows
    .filter((row) => row.status !== 'No Issue')
    .sort((a, b) => b.totalPayable - a.totalPayable)
    .slice(0, 6)
    .map((row) => ({
      label: row.dsrName,
      meta: row.area,
      issued: row.issuedPieces,
      returned: row.returnedPieces,
      sold: row.soldPieces,
      totalPayable: row.totalPayable,
    }));
  const reportMix = [
    { label: 'Completed', value: rows.filter((row) => row.status === 'Completed').length, color: '#0f766e' },
    { label: 'Pending', value: rows.filter((row) => row.status === 'Pending').length, color: '#f59e0b' },
    { label: 'No Issue', value: rows.filter((row) => row.status === 'No Issue').length, color: '#cbd5e1' },
  ];

  useEffect(() => {
    setSelectedSheet(null);
  }, [date]);

  function viewSheet(row) {
    if (row.status === 'No Issue') return;
    setSelectedSheet(buildSheetData({ date, dsrId: row.dsrId, dsrs, issues, settlements, products }));
  }

  return (
    <div>
      <SectionHeader eyebrow="Daily close" title="Daily Reports" description="Filter by date, review route totals visually, and print settlement sheets for audit or collection records." />

      <div className="mb-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="surface rounded-[28px] p-5">
          <label className="label">Report Date</label>
          <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard title="Issued" value={`${formatNumber(totals.issuedPieces)} pcs`} icon={Truck} tone="amber" />
          <StatCard title="Returned" value={`${formatNumber(totals.returnedPieces)} pcs`} icon={RotateCcw} tone="slate" />
          <StatCard title="Sold" value={`${formatNumber(totals.soldPieces)} pcs`} icon={PackageCheck} tone="emerald" />
          <StatCard title="Payable" value={formatCurrency(totals.totalPayable)} icon={CircleDollarSign} tone="blue" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ChartPanel title={`Route Report for ${formatDate(date)}`} description="Compare DSR performance and movement without reading every row first.">
          {chartRows.length ? (
            <StackedBarChart
              data={chartRows}
              segments={[
                { key: 'issued', label: 'Issued', color: '#bfdbfe' },
                { key: 'returned', label: 'Returned', color: '#fdba74' },
                { key: 'sold', label: 'Sold', color: '#0f766e' },
              ]}
              totalFormatter={(value) => `${formatNumber(value)} pcs`}
            />
          ) : (
            <EmptyState title="No route movement on this date" description="Choose another date or create route activity first." icon={FileText} />
          )}
        </ChartPanel>

        <ChartPanel title="Status Mix" description="A quick split of completed, pending, and no-issue routes for the selected day.">
          <DonutChart data={reportMix} centerLabel="Routes" centerValue={formatNumber(rows.length)} valueFormatter={(value) => `${formatNumber(value)} DSR`} />
        </ChartPanel>
      </div>

      <div className="surface mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-950">DSR Table for {formatDate(date)}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">DSR</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Returned</th>
                <th className="px-4 py-3">Sold</th>
                <th className="px-4 py-3">Payable</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Sheet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.dsrId} className="hover:bg-slate-50">
                  <td className="table-cell">
                    <p className="font-semibold text-slate-950">{row.dsrName}</p>
                    <p className="text-xs text-slate-500">{row.area}</p>
                  </td>
                  <td className="table-cell">{formatNumber(row.issuedPieces)} pcs</td>
                  <td className="table-cell">{formatNumber(row.returnedPieces)} pcs</td>
                  <td className="table-cell font-semibold">{formatNumber(row.soldPieces)} pcs</td>
                  <td className="table-cell font-bold">{formatCurrency(row.totalPayable)}</td>
                  <td className="table-cell">
                    <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                  </td>
                  <td className="table-cell text-right">
                    <button type="button" className="btn-secondary h-9 px-3" onClick={() => viewSheet(row)} disabled={row.status === 'No Issue'}>
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSheet ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3 no-print">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Printable DSR Sheet</h2>
              <p className="text-sm text-slate-500">{selectedSheet.dsrName} - {formatDate(selectedSheet.date)}</p>
            </div>
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              <Printer size={18} />
              Print Sheet
            </button>
          </div>
          <PrintableSheet sheet={selectedSheet} printTarget />
        </div>
      ) : null}
    </div>
  );
}
