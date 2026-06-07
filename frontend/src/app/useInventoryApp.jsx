import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { inventoryApi } from '../services/inventoryApi';
import { formatCurrency, formatDate, todayISO } from '../utils/calculations';
import { createTranslator, supportedLanguages } from '../i18n/translations';
import { hasPermission } from './permissions';

const InventoryAppContext = createContext(null);
const LANGUAGE_STORAGE_KEY = 'arinda.language';

function createToastId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getInitialLanguage() {
  if (typeof window === 'undefined') {
    return 'bn';
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return supportedLanguages.includes(stored) ? stored : 'bn';
}

function interpolateConfirm(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const value = values[name];
    return value === undefined || value === null ? '' : String(value);
  });
}

function getFriendlyError(error, t) {
  if (error?.status === 403) {
    return t('alerts.forbidden');
  }

  return error?.message || t('alerts.requestFailed');
}

export function InventoryAppProvider({ children }) {
  const today = todayISO();
  const [language, setLanguageState] = useState(getInitialLanguage);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [dsrs, setDsrs] = useState([]);
  const [issues, setIssues] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toasts, setToasts] = useState([]);
  const confirmResolverRef = useRef(null);
  const [confirmation, setConfirmation] = useState(null);

  const t = useMemo(() => createTranslator(language), [language]);

  function setLanguage(nextLanguage) {
    if (!supportedLanguages.includes(nextLanguage)) {
      return;
    }

    setLanguageState(nextLanguage);
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr';
  }, [language]);

  function pushToast(type, title, message = '') {
    const id = createToastId();
    setToasts((current) => [...current, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function closeConfirmation(result) {
    const resolver = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setConfirmation(null);
    if (resolver) {
      resolver(Boolean(result));
    }
  }

  function confirm(options) {
    return new Promise((resolve) => {
      if (confirmResolverRef.current) {
        confirmResolverRef.current(false);
      }

      confirmResolverRef.current = resolve;
      setConfirmation({
        title: options.title,
        description: options.description || '',
        confirmLabel: options.confirmLabel || t('common.delete'),
        cancelLabel: options.cancelLabel || t('common.cancel'),
        tone: options.tone || 'rose',
      });
    });
  }

  function applyState(nextState) {
    setProducts(nextState.products || []);
    setDsrs(nextState.dsrs || []);
    setIssues(nextState.issues || []);
    setSettlements(nextState.settlements || []);
  }

  function resetInventoryState() {
    setProducts([]);
    setDsrs([]);
    setIssues([]);
    setSettlements([]);
  }

  function handleUnauthorized() {
    setUser(null);
    resetInventoryState();
    setLoadError('');
    setLoading(false);
  }

  async function refreshState() {
    try {
      setLoading(true);
      setLoadError('');
      applyState(await inventoryApi.getState());
    } catch (error) {
      if (error.status === 401) {
        handleUnauthorized();
        return;
      }

      const message = getFriendlyError(error, t);
      setLoadError(message);
      pushToast('error', t('alerts.unableToLoad'), message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAuthenticatedSession() {
      try {
        setAuthLoading(true);
        const result = await inventoryApi.getCurrentUser();
        if (cancelled) {
          return;
        }

        setUser(result.user);
        await refreshState();
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error.status !== 401) {
          const message = getFriendlyError(error, t);
          setLoadError(message);
          pushToast('error', t('alerts.unableToVerify'), message);
        }
        handleUnauthorized();
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    loadAuthenticatedSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleWheel(event) {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLInputElement && activeElement.type === 'number') {
        event.preventDefault();
      }
    }

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  async function saveProduct(product) {
    try {
      const state = product.id ? await inventoryApi.updateProduct(product) : await inventoryApi.createProduct(product);
      applyState(state);
      pushToast('success', product.id ? t('products.editTitle') : t('products.addTitle'), `${product.name} ${product.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteProduct(product) {
    const confirmMessage = t('products.deleteConfirm', { name: product.name });
    if (!(await confirm({
      title: t('products.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { name: product.name }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
    }))) {
      return { ok: false };
    }

    try {
      applyState(await inventoryApi.deleteProduct(product.id));
      pushToast('success', t('common.delete'), `${product.name} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function addStock(productId, addPieces) {
    try {
      applyState(await inventoryApi.addProductStock(productId, addPieces));
      pushToast('success', t('products.updateStock'), t('products.stockUpdateSuccess'));
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.updateFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveDsr(dsr) {
    try {
      const state = dsr.id ? await inventoryApi.updateDsr(dsr) : await inventoryApi.createDsr(dsr);
      applyState(state);
      pushToast('success', dsr.id ? t('dsr.editTitle') : t('dsr.addTitle'), `${dsr.name} ${dsr.id ? t('alerts.updated') : t('alerts.created')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function deleteDsr(dsr) {
    const confirmMessage = t('dsr.deleteConfirm', { name: dsr.name });
    if (!(await confirm({
      title: t('dsr.deleteTitle'),
      description: interpolateConfirm(confirmMessage, { name: dsr.name }),
      confirmLabel: t('common.delete'),
      tone: 'rose',
    }))) {
      return { ok: false };
    }

    try {
      applyState(await inventoryApi.deleteDsr(dsr.id));
      pushToast('success', t('common.delete'), `${dsr.name} ${t('alerts.deleted')}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.deleteFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveIssue(issue) {
    try {
      applyState(await inventoryApi.saveIssue(issue));
      pushToast('success', t('nav.morningIssue'), `${issue.dsrName} - ${formatDate(issue.date)}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function saveSettlement(settlement) {
    try {
      applyState(await inventoryApi.saveSettlement(settlement));
      pushToast('success', t('nav.eveningSettlement'), `${settlement.dsrName} - ${formatCurrency(settlement.totalPayable)}`);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error, t);
      pushToast('error', t('alerts.requestFailed'), message);
      return { ok: false, message };
    }
  }

  async function login(credentials) {
    try {
      const result = await inventoryApi.login(credentials);
      setUser(result.user);
      await refreshState();
      pushToast('success', t('alerts.loggedIn'), result.user.name);
      return { ok: true };
    } catch (error) {
      const message = getFriendlyError(error);
      pushToast('error', t('auth.loginFailed'), message);
      return { ok: false, message };
    }
  }

  async function logout() {
    try {
      await inventoryApi.logout();
    } catch (error) {
      if (error.status !== 401) {
        pushToast('error', t('auth.logout'), getFriendlyError(error, t));
      }
    } finally {
      handleUnauthorized();
    }
  }

  const value = useMemo(
    () => ({
      today,
      language,
      setLanguage,
      t,
      can: (permission) => hasPermission(user?.role, permission),
      user,
      authLoading,
      products,
      dsrs,
      issues,
      settlements,
      loading,
      loadError,
      toasts,
      dismissToast,
      confirmation,
      confirm,
      closeConfirmation,
      login,
      logout,
      saveProduct,
      deleteProduct,
      addStock,
      saveDsr,
      deleteDsr,
      saveIssue,
      saveSettlement,
    }),
    [today, language, t, user, authLoading, products, dsrs, issues, settlements, loading, loadError, toasts, confirmation],
  );

  return <InventoryAppContext.Provider value={value}>{children}</InventoryAppContext.Provider>;
}

export function useInventoryApp() {
  const context = useContext(InventoryAppContext);
  if (!context) {
    throw new Error('useInventoryApp must be used within InventoryAppProvider.');
  }

  return context;
}
