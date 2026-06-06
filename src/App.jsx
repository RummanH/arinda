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
import { Alert, Badge, EmptyState, Modal, SectionHeader, StatCard, cx } from './components/ui';
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
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden border-r border-white/10 bg-[#07111f] px-4 py-5 text-white shadow-[18px_0_60px_rgba(15,23,42,0.22)] transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-600/20 to-transparent" />
        <div className="relative flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-blue-700 shadow-[0_14px_30px_rgba(37,99,235,0.28)]">
              <Warehouse size={22} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-200">Inventory</p>
              <h2 className="mt-1 text-xl font-black tracking-normal">ARINDA</h2>
            </div>
          </div>
          <button type="button" className="icon-btn border-slate-700 bg-slate-900 text-white hover:bg-slate-800 lg:hidden" title="Close menu" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="relative mt-8 space-y-1">
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
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold transition',
                  active ? 'bg-white text-slate-950 shadow-[0_16px_35px_rgba(15,23,42,0.24)]' : 'text-slate-300 hover:bg-white/10 hover:text-white',
                )}
              >
                <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg transition', active ? 'bg-blue-50 text-blue-700' : 'bg-white/10 text-slate-300 group-hover:bg-white/20 group-hover:text-white')}>
                  <Icon size={18} />
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="relative mt-auto rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" />
            <p className="text-sm font-black">BDT ready</p>
          </div>
          <p className="mt-2 text-xs font-medium leading-5 text-slate-400">Connected to PostgreSQL through the local Express API.</p>
        </div>
      </div>

      {mobileOpen ? <button type="button" aria-label="Close sidebar overlay" className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}
    </>
  );
}

function TopHeader({ title, today, onOpenMenu }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl no-print">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button type="button" className="icon-btn lg:hidden" title="Open menu" onClick={onOpenMenu}>
            <Menu size={20} />
          </button>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">ARINDA ENTERPRISE</p>
            <h1 className="text-lg font-black text-slate-950">{title}</h1>
          </div>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={17} />
            Live Data
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm">
            <CalendarDays size={17} className="text-blue-600" />
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

  return (
    <div>
      <SectionHeader eyebrow="Today" title="Dealership Dashboard" description="Morning issue, evening return, sold quantity, and payable totals for the current trading day." />

      <div className="mb-6 overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(135deg,#07111f_0%,#12335b_54%,#0f513b_100%)] shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="grid gap-6 p-5 text-white lg:grid-cols-[1fr_auto] lg:p-6">
          <div className="flex flex-col justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-100">
                <CheckCircle2 size={14} />
                Live Trading Day
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-normal sm:text-3xl">ARINDA ENTERPRISE Control Room</h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-blue-100">Fast stock decisions, DSR issue control, and evening payable visibility in one clean dealership dashboard.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-bold">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                <CalendarDays size={16} />
                {formatDate(today)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                <UserCheck size={16} />
                {formatNumber(activeDsrs)} active DSRs
              </span>
            </div>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-3 lg:w-[520px]">
            <div className="rounded-lg border border-white/15 bg-white/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-100">Payable</p>
              <p className="mt-2 text-2xl font-black">{formatCurrency(payableToday)}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-100">Stock Value</p>
              <p className="mt-2 text-2xl font-black">{formatCurrency(stockValue)}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-100">Units</p>
              <p className="mt-2 text-2xl font-black">{formatNumber(stockUnits)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Products" value={formatNumber(products.length)} helper="Fixed FMCG SKU list" icon={Boxes} tone="blue" />
        <StatCard title="Stock Units" value={`${formatNumber(stockUnits)} pcs`} helper="Current inventory pieces" icon={PackageCheck} tone="slate" />
        <StatCard title="Total Stock Value" value={formatCurrency(stockValue)} helper="Based on purchase price" icon={Warehouse} tone="indigo" />
        <StatCard title="Sales Value in Stock" value={formatCurrency(stockSellingValue)} helper="If all stock is sold" icon={CircleDollarSign} tone="emerald" />
        <StatCard title="Possible Profit" value={formatCurrency(expectedStockProfit)} helper="Selling value minus cost" icon={BarChart3} tone="emerald" />
        <StatCard title="Issued Today" value={`${formatNumber(totalIssuedToday)} pcs`} helper="Morning delivery quantity" icon={Truck} tone="amber" />
        <StatCard title="Returned Today" value={`${formatNumber(totalReturnedToday)} pcs`} helper="Added back after settlement" icon={RotateCcw} tone="slate" />
        <StatCard title="Sold Today" value={`${formatNumber(totalSoldToday)} pcs`} helper="Issued minus returned" icon={PackageCheck} tone="emerald" />
        <StatCard title="Payable Today" value={formatCurrency(payableToday)} helper="DSR collection amount" icon={CircleDollarSign} tone="emerald" />
        <StatCard title="Return Pending" value={`${formatNumber(pendingRows.length)} DSR`} helper="Evening settlement needed" icon={AlertTriangle} tone={pendingRows.length ? 'amber' : 'emerald'} />
        <StatCard title="Completed Settlement" value={`${formatNumber(completedRows.length)} DSR`} helper={`${completionRate}% of issued DSRs`} icon={CheckCircle2} tone="blue" />
        <StatCard title="Low Stock Products" value={formatNumber(lowStockAll.length)} helper={`${outOfStockCount} out of stock`} icon={AlertTriangle} tone={lowStockAll.length ? 'rose' : 'emerald'} />
        <StatCard title="Active DSRs" value={formatNumber(activeDsrs)} helper="Available for route issue" icon={UserCheck} tone="blue" />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        {ownerTasks.map((task) => {
          const Icon = task.icon;
          return (
            <div key={task.title} className="surface p-4">
              <div className="flex items-start gap-3">
                <div className={cx('rounded-lg p-2.5', task.tone === 'emerald' && 'bg-emerald-50 text-emerald-700', task.tone === 'amber' && 'bg-amber-50 text-amber-700', task.tone === 'rose' && 'bg-rose-50 text-rose-700', task.tone === 'blue' && 'bg-blue-50 text-blue-700', task.tone === 'slate' && 'bg-slate-100 text-slate-700')}>
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

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-700">
              <ClipboardList size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-950">Today Easy Summary</h2>
              <p className="text-sm font-medium text-slate-500">Simple numbers for owner checking.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <InsightLine label="DSR given products" value={`${formatNumber(issuedDsrIds.size)} / ${formatNumber(activeDsrs)}`} />
            <InsightLine label="Issue sheets made" value={formatNumber(todayIssues.length)} />
            <InsightLine label="Settlement done" value={`${formatNumber(completedRows.length)} DSR`} />
            <InsightLine label="Average cash per DSR" value={formatCurrency(averagePayable)} />
            <InsightLine label="Active DSR not issued" value={`${formatNumber(notIssuedDsrs.length)} DSR`} />
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700">
              <RotateCcw size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-950">Need Evening Return</h2>
              <p className="text-sm font-medium text-slate-500">These DSRs still need settlement.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {pendingRows.length ? (
              pendingRows.slice(0, 5).map((row) => (
                <InsightLine key={row.dsrId} label={`${row.dsrName} - ${row.area}`} value={`${formatNumber(row.issuedPieces)} pcs`} />
              ))
            ) : (
              <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-700">No DSR return is pending.</div>
            )}
          </div>
        </div>

        <div className="surface p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-50 p-2.5 text-rose-700">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-950">Stock Danger</h2>
              <p className="text-sm font-medium text-slate-500">Products that may finish soon.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {lowStockProducts.length ? (
              lowStockProducts.slice(0, 5).map((product) => <InsightLine key={product.id} label={product.name} value={formatCasePiece(product.stockPieces, product.piecesPerCase)} />)
            ) : (
              <div className="rounded-lg bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-700">No stock danger found.</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-950">Low Stock Products</h2>
            <p className="mt-1 text-sm text-slate-500">Products below four cases are shown first.</p>
          </div>
          {lowStockProducts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="table-cell font-semibold text-slate-950">{product.name}</td>
                      <td className="table-cell">{product.category}</td>
                      <td className="table-cell">{formatCasePiece(product.stockPieces, product.piecesPerCase)}</td>
                      <td className="table-cell text-right font-semibold">{formatCurrency(product.stockPieces * product.purchasePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState title="Stock levels look healthy" description="No product is below the low-stock threshold." icon={CheckCircle2} />
            </div>
          )}
        </div>

        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-950">Today's DSR Settlement Summary</h2>
            <p className="mt-1 text-sm text-slate-500">Pending DSRs still need evening return entry.</p>
          </div>
          {dsrSummary.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">DSR</th>
                    <th className="px-4 py-3">Sold</th>
                    <th className="px-4 py-3">Payable</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dsrSummary.map((row) => (
                    <tr key={row.dsrId} className="hover:bg-slate-50">
                      <td className="table-cell">
                        <p className="font-semibold text-slate-950">{row.dsrName}</p>
                        <p className="text-xs text-slate-500">{row.area}</p>
                      </td>
                      <td className="table-cell">{formatNumber(row.soldPieces)} pcs</td>
                      <td className="table-cell font-bold">{formatCurrency(row.totalPayable)}</td>
                      <td className="table-cell">
                        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState title="No DSR movement today" description="Create a morning issue to start today's settlement flow." icon={ClipboardList} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-black text-slate-950">Highest Money in Stock</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">These products hold the most inventory money.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {topStockValueProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{product.name}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">{formatCasePiece(product.stockPieces, product.piecesPerCase)}</p>
                </div>
                <p className="shrink-0 text-sm font-black text-slate-950">{formatCurrency(product.stockPieces * product.purchasePrice)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-black text-slate-950">Best Sold Today</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">Products that made the most money today.</p>
          </div>
          {topSoldProducts.length ? (
            <div className="divide-y divide-slate-100">
              {topSoldProducts.map((product) => (
                <div key={product.productId} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{product.productName}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">{formatNumber(product.soldPieces)} pcs sold</p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-emerald-700">{formatCurrency(product.payable)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState title="No product sold yet" description="Complete evening settlement to see best sold products." icon={PackageCheck} />
            </div>
          )}
        </div>

        <div className="surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-black text-slate-950">Active DSR Not Issued</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">These active salesmen have no issue sheet today.</p>
          </div>
          {notIssuedDsrs.length ? (
            <div className="divide-y divide-slate-100">
              {notIssuedDsrs.map((dsr) => (
                <div key={dsr.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{dsr.name}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">{dsr.area}</p>
                  </div>
                  <Badge tone="amber">Not Issued</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState title="All active DSRs are issued" description="Every active salesman has a morning issue sheet today." icon={UserCheck} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
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

  useEffect(() => {
    setSelectedSheet(null);
  }, [date]);

  function viewSheet(row) {
    if (row.status === 'No Issue') return;
    setSelectedSheet(buildSheetData({ date, dsrId: row.dsrId, dsrs, issues, settlements, products }));
  }

  return (
    <div>
      <SectionHeader eyebrow="Daily close" title="Daily Reports" description="Filter by date, review DSR totals, and print settlement sheets for audit or collection records." />

      <div className="mb-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="surface p-5">
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

      <div className="surface overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-950">DSR Report for {formatDate(date)}</h2>
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
