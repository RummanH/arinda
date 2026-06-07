import { useEffect, useMemo, useState } from 'react';
import { aggregateIssuesFor, buildSheetData, getSettlementFor } from '../../../models/inventoryViewData.js';
import { calculatePayable, calculateSold, createId, toPieces } from '../../../utils/calculations.js';

function toExtraReturnRow(item) {
  const piecesPerCase = Math.max(1, Number(item.piecesPerCase || 1));
  const returnedPieces = Number(item.returnedPieces || 0);
  return {
    id: item.id || createId('extra-return'),
    productId: item.productId || '',
    productName: item.productName || '',
    piecesPerCase,
    caseQty: Math.floor(returnedPieces / piecesPerCase),
    pieceQty: returnedPieces % piecesPerCase,
  };
}

export function useSettlementViewModel({ products, dsrs, issues, settlements, today, saveSettlementAction, t }) {
  const activeDsrs = useMemo(() => dsrs.filter((dsr) => dsr.status === 'Active'), [dsrs]);
  const [date, setDate] = useState(today);
  const [dsrId, setDsrId] = useState(activeDsrs[0]?.id || '');
  const [returns, setReturns] = useState({});
  const [extraReturns, setExtraReturns] = useState([]);
  const [previousDueInput, setPreviousDueInput] = useState('');
  const [amountPaidInput, setAmountPaidInput] = useState('');
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
    if (!completedSettlement) {
      setReturns({});
      setExtraReturns([]);
      setPreviousDueInput('');
      setAmountPaidInput('');
      setMessage(null);
      return;
    }

    setReturns(
      completedSettlement.items.reduce((map, item) => {
        const piecesPerCase = Number(item.piecesPerCase || 1);
        map[`${item.productId}-${item.rate}`] = {
          caseQty: Math.floor(Number(item.returnedPieces || 0) / piecesPerCase),
          pieceQty: Number(item.returnedPieces || 0) % piecesPerCase,
        };
        return map;
      }, {}),
    );
    setPreviousDueInput(String(Number(completedSettlement.previousDue || 0)));
    setAmountPaidInput(String(Number(completedSettlement.amountPaid || 0)));
    setExtraReturns((completedSettlement.extraReturns || []).map(toExtraReturnRow));
    setMessage(null);
  }, [date, dsrId, issueKey, completedSettlement?.id]);

  const displayRows = issueData.rows.map((row) => {
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

  const totalPayable = displayRows.reduce((sum, item) => sum + item.payable, 0);
  const totalExtraReturnedPieces = extraReturns.reduce((sum, item) => sum + toPieces(item.caseQty, item.pieceQty, item.piecesPerCase), 0);
  const previousDue = Math.max(0, Number(previousDueInput || 0));
  const receivableTotal = totalPayable + previousDue;
  const amountPaid = Math.min(Math.max(0, Number(amountPaidInput || 0)), receivableTotal);
  const dueAmount = Math.max(receivableTotal - amountPaid, 0);
  const hasInvalidReturns = displayRows.some((row) => row.invalid);
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

  function addExtraReturn() {
    const nextProduct = products.find((product) => !extraReturns.some((row) => row.productId === product.id));
    if (!nextProduct) {
      return;
    }

    setExtraReturns((current) => [
      ...current,
      {
        id: createId('extra-return'),
        productId: nextProduct.id,
        productName: nextProduct.name,
        piecesPerCase: Math.max(1, Number(nextProduct.piecesPerCase || 1)),
        caseQty: '',
        pieceQty: '',
      },
    ]);
  }

  function updateExtraReturn(rowId, field, value) {
    setExtraReturns((current) => current.map((row) => {
      if (row.id !== rowId) {
        return row;
      }

      if (field === 'productId') {
        const product = products.find((candidate) => candidate.id === value);
        if (!product) {
          return row;
        }

        return {
          ...row,
          productId: product.id,
          productName: product.name,
          piecesPerCase: Math.max(1, Number(product.piecesPerCase || 1)),
        };
      }

      return {
        ...row,
        [field]: value,
      };
    }));
  }

  function removeExtraReturn(rowId) {
    setExtraReturns((current) => current.filter((row) => row.id !== rowId));
  }

  async function completeSettlement() {
    const dsr = dsrs.find((candidate) => candidate.id === dsrId);
    if (!dsr) {
      setMessage({ type: 'error', text: t('settlement.selectValidDsr') });
      return;
    }
    if (!issueData.rows.length) {
      setMessage({ type: 'error', text: t('settlement.noMorningIssue') });
      return;
    }
    if (hasInvalidReturns) {
      setMessage({ type: 'error', text: t('settlement.returnQuantityExceeded') });
      return;
    }

    if (extraReturns.some((row) => !row.productId || toPieces(row.caseQty, row.pieceQty, row.piecesPerCase) <= 0)) {
      setMessage({ type: 'error', text: t('settlement.extraReturnInvalid') });
      return;
    }

    const items = displayRows.map((row) => ({
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
      id: completedSettlement?.id,
      date,
      dsrId: dsr.id,
      dsrName: dsr.name,
      area: dsr.area,
      phone: dsr.phone,
      issueIds: issueData.issueIds,
      items,
      totalPayable: items.reduce((sum, item) => sum + item.payable, 0),
      previousDue,
      amountPaid,
      dueAmount,
      status: 'Completed',
      extraReturns: extraReturns.map((row) => ({
        id: row.id,
        productId: row.productId,
        productName: row.productName,
        piecesPerCase: row.piecesPerCase,
        returnedPieces: toPieces(row.caseQty, row.pieceQty, row.piecesPerCase),
      })),
    };

    setSaving(true);
    const result = await saveSettlementAction(settlement);
    setSaving(false);
    if (result.ok) {
      setMessage(null);
    }
  }

  return {
    activeDsrs,
    date,
    setDate,
    dsrId,
    setDsrId,
    returns,
    previousDueInput,
    setPreviousDueInput,
    amountPaidInput,
    setAmountPaidInput,
    message,
    saving,
    completedSettlement,
    displayRows,
    extraReturns,
    totalExtraReturnedPieces,
    totalPayable,
    dueAmount,
    hasInvalidReturns,
    sheet,
    updateReturn,
    addExtraReturn,
    updateExtraReturn,
    removeExtraReturn,
    completeSettlement,
  };
}
