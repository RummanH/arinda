import { assert } from './errors.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH_PATTERN = /^\d{4}-\d{2}$/;

export function normalizeIsoDate(value, fallback, message = 'Date must be in YYYY-MM-DD format.') {
  const raw = String(value || '').trim();
  if (!raw) {
    return fallback;
  }

  assert(ISO_DATE_PATTERN.test(raw), message);
  return raw;
}

export function normalizeIsoMonth(value, fallback, message = 'Month must be in YYYY-MM format.') {
  const raw = String(value || '').trim();
  if (!raw) {
    return fallback;
  }

  assert(ISO_MONTH_PATTERN.test(raw), message);
  return raw;
}

export function startOfMonth(month) {
  return `${month}-01`;
}

export function startOfNextMonth(month) {
  const [year, monthPart] = month.split('-').map(Number);
  const next = new Date(Date.UTC(year, monthPart - 1, 1));
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString().slice(0, 10);
}
