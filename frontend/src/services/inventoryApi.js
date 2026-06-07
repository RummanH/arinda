async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function downloadRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(data?.message || 'Request failed.');
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);

  return {
    blob,
    filename: match?.[1] || 'arinda-database-backup.sql',
  };
}

export const inventoryApi = {
  getCurrentUser() {
    return apiRequest('/auth/me');
  },
  login(credentials) {
    return apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  },
  logout() {
    return apiRequest('/auth/logout', { method: 'POST' });
  },
  getState() {
    return apiRequest('/state');
  },
  listUsers() {
    return apiRequest('/users');
  },
  createUser(user) {
    return apiRequest('/users', { method: 'POST', body: JSON.stringify(user) });
  },
  updateUser(userId, user) {
    return apiRequest(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(user) });
  },
  listActivityLogs(limit = 100) {
    return apiRequest(`/activity-logs?limit=${encodeURIComponent(limit)}`);
  },
  getExpenseReport({ date, month } = {}) {
    const params = new URLSearchParams();
    if (date) {
      params.set('date', date);
    }
    if (month) {
      params.set('month', month);
    }
    const query = params.toString();
    return apiRequest(`/expenses${query ? `?${query}` : ''}`);
  },
  createExpense(expense) {
    return apiRequest('/expenses', { method: 'POST', body: JSON.stringify(expense) });
  },
  updateExpense(expense) {
    return apiRequest(`/expenses/${expense.id}`, { method: 'PATCH', body: JSON.stringify(expense) });
  },
  deleteExpense(expenseId) {
    return apiRequest(`/expenses/${expenseId}`, { method: 'DELETE' });
  },
  getCashReceiptReport({ date, month, dsrId } = {}) {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (month) params.set('month', month);
    if (dsrId) params.set('dsrId', dsrId);
    const query = params.toString();
    return apiRequest(`/dsr-cash-receipts${query ? `?${query}` : ''}`);
  },
  createCashReceipt(record) {
    return apiRequest('/dsr-cash-receipts', { method: 'POST', body: JSON.stringify(record) });
  },
  updateCashReceipt(record) {
    return apiRequest(`/dsr-cash-receipts/${record.id}`, { method: 'PATCH', body: JSON.stringify(record) });
  },
  deleteCashReceipt(recordId) {
    return apiRequest(`/dsr-cash-receipts/${recordId}`, { method: 'DELETE' });
  },
  getAdvanceReport({ date, month, dsrId } = {}) {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (month) params.set('month', month);
    if (dsrId) params.set('dsrId', dsrId);
    const query = params.toString();
    return apiRequest(`/dsr-advances${query ? `?${query}` : ''}`);
  },
  createAdvance(record) {
    return apiRequest('/dsr-advances', { method: 'POST', body: JSON.stringify(record) });
  },
  updateAdvance(record) {
    return apiRequest(`/dsr-advances/${record.id}`, { method: 'PATCH', body: JSON.stringify(record) });
  },
  deleteAdvance(recordId) {
    return apiRequest(`/dsr-advances/${recordId}`, { method: 'DELETE' });
  },
  getMonthEndSummary({ month } = {}) {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    const query = params.toString();
    return apiRequest(`/month-end-summary${query ? `?${query}` : ''}`);
  },
  downloadDatabaseBackup() {
    return downloadRequest('/database-backup');
  },
  createProduct(product) {
    return apiRequest('/products', { method: 'POST', body: JSON.stringify(product) });
  },
  updateProduct(product) {
    return apiRequest(`/products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) });
  },
  deleteProduct(productId) {
    return apiRequest(`/products/${productId}`, { method: 'DELETE' });
  },
  addProductStock(productId, addPieces) {
    return apiRequest(`/products/${productId}/stock`, { method: 'POST', body: JSON.stringify({ addPieces }) });
  },
  createDsr(dsr) {
    return apiRequest('/dsrs', { method: 'POST', body: JSON.stringify(dsr) });
  },
  updateDsr(dsr) {
    return apiRequest(`/dsrs/${dsr.id}`, { method: 'PUT', body: JSON.stringify(dsr) });
  },
  deleteDsr(dsrId) {
    return apiRequest(`/dsrs/${dsrId}`, { method: 'DELETE' });
  },
  saveIssue(issue) {
    return apiRequest('/issues', { method: 'POST', body: JSON.stringify(issue) });
  },
  saveSettlement(settlement) {
    return apiRequest('/settlements', { method: 'POST', body: JSON.stringify(settlement) });
  },
};
