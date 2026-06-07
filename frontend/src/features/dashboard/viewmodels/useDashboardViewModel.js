import {
  buildCategoryInventory,
  buildDailyRows,
  buildRoutePerformance,
  buildTopPayableProducts,
  buildTradingTrend,
} from '../../../models/inventoryViewData.js';
import { formatCasePiece, formatCurrency, formatNumber } from '../../../utils/calculations.js';

export function useDashboardViewModel({ products, dsrs, issues, settlements, today, t }) {
  const activeDsrs = dsrs.filter((dsr) => dsr.status === 'Active').length;
  const stockUnits = products.reduce((sum, product) => sum + product.stockPieces, 0);
  const stockValue = products.reduce((sum, product) => sum + product.stockPieces * Number(product.purchasePrice || 0), 0);
  const stockSellingValue = products.reduce((sum, product) => sum + product.stockPieces * Number(product.sellingPrice || 0), 0);
  const expectedStockProfit = stockSellingValue - stockValue;
  const todayIssues = issues.filter((issue) => issue.date === today);
  const totalIssuedToday = todayIssues.reduce((sum, issue) => sum + issue.items.reduce((itemSum, item) => itemSum + item.issuedPieces, 0), 0);
  const todaySettlements = settlements.filter((settlement) => settlement.date === today);
  const totalReturnedToday = todaySettlements.reduce((sum, settlement) => sum + settlement.items.reduce((itemSum, item) => itemSum + item.returnedPieces, 0), 0);
  const totalSoldToday = todaySettlements.reduce((sum, settlement) => sum + settlement.items.reduce((itemSum, item) => itemSum + item.soldPieces, 0), 0);
  const payableToday = todaySettlements.reduce((sum, settlement) => sum + Number(settlement.amountPaid || 0), 0);
  const lowStockAll = products.filter((product) => product.stockPieces <= product.piecesPerCase * 4);
  const outOfStockCount = products.filter((product) => product.stockPieces === 0).length;
  const lowStockProducts = [...lowStockAll].sort((a, b) => a.stockPieces - b.stockPieces).slice(0, 8);
  const dailyRows = buildDailyRows({ date: today, dsrs, issues, settlements, products });
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

  return {
    activeDsrs,
    stockValue,
    stockSellingValue,
    expectedStockProfit,
    stockUnits,
    totalIssuedToday,
    totalReturnedToday,
    totalSoldToday,
    payableToday,
    lowStockAll,
    outOfStockCount,
    pendingRows,
    completedRows,
    completionRate,
    ownerTasks: [
      {
        iconKey: totalIssuedToday ? 'morningStarted' : 'morningPending',
        title: totalIssuedToday ? t('dashboard.taskMorningStarted') : t('dashboard.taskMorningPending'),
        detail: totalIssuedToday ? t('dashboard.taskMorningStartedDetail', { count: formatNumber(totalIssuedToday) }) : t('dashboard.taskMorningPendingDetail'),
        tone: totalIssuedToday ? 'emerald' : 'amber',
      },
      {
        iconKey: pendingRows.length ? 'returnPending' : 'returnClear',
        title: pendingRows.length ? t('dashboard.taskReturnPending') : t('dashboard.taskReturnClear'),
        detail: pendingRows.length ? t('dashboard.taskReturnPendingDetail', { count: formatNumber(pendingRows.length) }) : t('dashboard.taskReturnClearDetail'),
        tone: pendingRows.length ? 'amber' : 'emerald',
      },
      {
        iconKey: lowStockAll.length ? 'stockAttention' : 'stockHealthy',
        title: lowStockAll.length ? t('dashboard.taskStockAttention') : t('dashboard.taskStockHealthy'),
        detail: lowStockAll.length ? t('dashboard.taskStockAttentionDetail', { lowStock: formatNumber(lowStockAll.length), outOfStock: formatNumber(outOfStockCount) }) : t('dashboard.taskStockHealthyDetail'),
        tone: lowStockAll.length ? 'rose' : 'emerald',
      },
      {
        iconKey: payableToday ? 'cashVisible' : 'cashEmpty',
        title: payableToday ? t('dashboard.taskCashVisible') : t('dashboard.taskCashEmpty'),
        detail: payableToday ? t('dashboard.taskCashVisibleDetail', { amount: formatCurrency(payableToday) }) : t('dashboard.taskCashEmptyDetail'),
        tone: payableToday ? 'blue' : 'slate',
      },
    ],
    tradingTrend: buildTradingTrend({ issues, settlements, today }),
    inventoryByCategory: buildCategoryInventory(products),
    routePerformance: buildRoutePerformance(dailyRows),
    topPayableProducts: buildTopPayableProducts(todaySettlements),
    settlementMix: [
      { label: t('dashboard.completed'), value: completedRows.length, color: '#0f766e' },
      { label: t('dashboard.pending'), value: pendingRows.length, color: '#f59e0b' },
      { label: t('dashboard.noIssue'), value: Math.max(activeDsrs - issuedDsrIds.size, 0), color: '#cbd5e1' },
    ],
    operationalPulse: [
      { title: t('dashboard.collectionFlow'), value: `${formatNumber(completionRate)}%`, subtitle: t('dashboard.collectionFlowDesc') },
      { title: t('dashboard.averageTicket'), value: formatCurrency(averagePayable), subtitle: t('dashboard.averageTicketDesc') },
      { title: t('dashboard.attentionStock'), value: formatNumber(lowStockAll.length), subtitle: t('dashboard.attentionStockDesc') },
    ],
    summaryLines: [
      { label: t('dashboard.issuedTodaySummary'), value: `${formatNumber(issuedDsrIds.size)} / ${formatNumber(activeDsrs)}` },
      { label: t('dashboard.issueSheetsMade'), value: formatNumber(todayIssues.length) },
      { label: t('dashboard.averageCashPerDsr'), value: formatCurrency(averagePayable) },
      { label: t('dashboard.activeDsrNotIssued'), value: `${formatNumber(notIssuedDsrs.length)} DSR` },
      { label: t('dashboard.highestStockSku'), value: topStockValueProducts[0] ? topStockValueProducts[0].name : '-' },
      { label: t('dashboard.bestSoldToday'), value: topSoldProducts[0] ? topSoldProducts[0].productName : '-' },
    ],
    actionQueue: {
      pendingRows,
      lowStockProducts,
      formatCasePiece,
    },
  };
}
