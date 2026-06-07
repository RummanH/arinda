import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { DsrFinanceController } from '../controllers/dsrFinanceController.js';
import { MonthEndSummaryController } from '../controllers/monthEndSummaryController.js';
import { BackupController } from '../controllers/backupController.js';
import { DsrController } from '../controllers/dsrController.js';
import { ActivityLogController } from '../controllers/activityLogController.js';
import { ExpenseController } from '../controllers/expenseController.js';
import { IssueController } from '../controllers/issueController.js';
import { ProductController } from '../controllers/productController.js';
import { UserController } from '../controllers/userController.js';
import { SettlementController } from '../controllers/settlementController.js';
import { StateController } from '../controllers/stateController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requirePermission } from '../middleware/requireRole.js';
import { PERMISSIONS } from '../lib/permissions.js';

export function createApiRouter({ authService, env, inventoryService, auditService, userService, expenseService, dsrFinanceService, monthEndSummaryService, backupService, databaseManager }) {
  const router = Router();
  const authController = new AuthController(authService, env);
  const stateController = new StateController(inventoryService);
  const productController = new ProductController(inventoryService);
  const dsrController = new DsrController(inventoryService);
  const issueController = new IssueController(inventoryService);
  const settlementController = new SettlementController(inventoryService);
  const activityLogController = new ActivityLogController(auditService);
  const userController = new UserController(userService);
  const expenseController = new ExpenseController(expenseService);
  const dsrFinanceController = new DsrFinanceController(dsrFinanceService);
  const monthEndSummaryController = new MonthEndSummaryController(monthEndSummaryService);
  const backupController = new BackupController(backupService, databaseManager);

  router.post('/auth/login', authController.login);
  router.post('/auth/logout', authController.logout);

  router.use(requireAuth(authService, env));

  router.get('/auth/me', authController.me);
  router.get('/state', stateController.getState);

  router.get('/users', requirePermission(PERMISSIONS.MANAGE_USERS), userController.list);
  router.post('/users', requirePermission(PERMISSIONS.MANAGE_USERS), userController.create);
  router.patch('/users/:id', requirePermission(PERMISSIONS.MANAGE_USERS), userController.update);

  router.get('/activity-logs', requirePermission(PERMISSIONS.VIEW_ACTIVITY_LOGS), activityLogController.list);

  router.get('/expenses', requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.report);
  router.post('/expenses', requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.create);
  router.patch('/expenses/:id', requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.update);
  router.delete('/expenses/:id', requirePermission(PERMISSIONS.MANAGE_EXPENSES), expenseController.remove);

  router.get('/dsr-cash-receipts', requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashReport);
  router.post('/dsr-cash-receipts', requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashCreate);
  router.patch('/dsr-cash-receipts/:id', requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashUpdate);
  router.delete('/dsr-cash-receipts/:id', requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.cashDelete);

  router.get('/dsr-advances', requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.advanceReport);
  router.post('/dsr-advances', requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.advanceCreate);
  router.patch('/dsr-advances/:id', requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.advanceUpdate);
  router.delete('/dsr-advances/:id', requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), dsrFinanceController.advanceDelete);

  router.get('/month-end-summary', requirePermission(PERMISSIONS.MANAGE_DSR_FINANCE), monthEndSummaryController.getSummary);
  router.get('/database-backup', requirePermission(PERMISSIONS.MANAGE_BACKUPS), backupController.download);

  router.post('/products', requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.create);
  router.put('/products/:id', requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.update);
  router.delete('/products/:id', requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.remove);
  router.post('/products/:id/stock', requirePermission(PERMISSIONS.MANAGE_PRODUCTS), productController.addStock);

  router.post('/dsrs', requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.create);
  router.put('/dsrs/:id', requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.update);
  router.delete('/dsrs/:id', requirePermission(PERMISSIONS.MANAGE_DSRS), dsrController.remove);

  router.post('/issues', requirePermission(PERMISSIONS.CREATE_ISSUES), issueController.create);
  router.put('/issues/:id', requirePermission(PERMISSIONS.UPDATE_ISSUES), issueController.update);

  router.post('/settlements', requirePermission(PERMISSIONS.CREATE_SETTLEMENTS), settlementController.create);
  router.put('/settlements/:id', requirePermission(PERMISSIONS.UPDATE_SETTLEMENTS), settlementController.update);

  return router;
}
