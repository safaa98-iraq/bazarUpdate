import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import { logAdminAction } from '../middleware/adminLog';
import { adminService } from '../services/admin.service';
import { storeService } from '../services/store.service';
import { productService } from '../services/product.service';
import prisma from '@storebuilder/database';

const router = Router();

// All admin routes require SUPER_ADMIN
router.use(verifyToken, requireRole('SUPER_ADMIN'));

// ─── Merchants ──────────────────────────────────────────────────────────────

router.get('/merchants', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await adminService.listMerchants({
      page,
      limit,
      search: req.query.search as string,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
    });
    res.json({
      success: true,
      data: result.merchants,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/merchants/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchant = await adminService.getMerchantById(req.params.id);
    res.json({ success: true, data: merchant });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/merchants/:id/activate',
  logAdminAction('MERCHANT_ACTIVATED', 'USER', (req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const merchant = await adminService.setMerchantActive(req.params.id, true);
      res.json({ success: true, data: merchant, message: 'Merchant activated' });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/merchants/:id/deactivate',
  logAdminAction('MERCHANT_DEACTIVATED', 'USER', (req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const merchant = await adminService.setMerchantActive(req.params.id, false);
      res.json({ success: true, data: merchant, message: 'Merchant deactivated' });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/merchants/:id',
  logAdminAction('MERCHANT_DELETED', 'USER', (req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await adminService.deleteMerchant(req.params.id);
      res.json({ success: true, message: 'Merchant deleted' });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/merchants/:id/plan',
  logAdminAction('MERCHANT_PLAN_CHANGED', 'USER', (req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const merchant = await adminService.updateMerchantPlan(req.params.id, req.body.plan);
      res.json({ success: true, data: merchant });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Stores ─────────────────────────────────────────────────────────────────

router.get('/stores', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await adminService.listStores({
      page,
      limit,
      search: req.query.search as string,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
    });
    res.json({
      success: true,
      data: result.stores,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/stores/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await adminService.getStoreById(req.params.id);
    res.json({ success: true, data: store });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/stores/:id/enable',
  logAdminAction('STORE_ENABLED', 'STORE', (req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await adminService.setStoreActive(req.params.id, true);
      res.json({ success: true, data: store, message: 'Store enabled' });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/stores/:id/disable',
  logAdminAction('STORE_DISABLED', 'STORE', (req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await adminService.setStoreActive(req.params.id, false);
      res.json({ success: true, data: store, message: 'Store disabled' });
    } catch (err) {
      next(err);
    }
  }
);

// Admin enters store editor mode
router.post(
  '/stores/:id/editor/enter',
  logAdminAction('STORE_EDITOR_ENTERED', 'STORE', (req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await adminService.getStoreById(req.params.id);
      res.json({ success: true, data: store, message: 'Entered editor mode' });
    } catch (err) {
      next(err);
    }
  }
);

// Suspend a store with a reason
router.patch(
  '/stores/:id/suspend',
  logAdminAction('STORE_SUSPENDED', 'STORE', (req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reason } = req.body;
      const store = await prisma.store.update({
        where: { id: req.params.id },
        data: { isActive: false, suspendedAt: new Date(), suspendReason: reason ?? 'Suspended by admin' },
      });
      res.json({ success: true, data: store, message: 'Store suspended' });
    } catch (err) {
      next(err);
    }
  }
);

// Unsuspend a store
router.patch(
  '/stores/:id/unsuspend',
  logAdminAction('STORE_UNSUSPENDED', 'STORE', (req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.update({
        where: { id: req.params.id },
        data: { isActive: true, suspendedAt: null, suspendReason: null },
      });
      res.json({ success: true, data: store, message: 'Store unsuspended' });
    } catch (err) {
      next(err);
    }
  }
);

// Admin edits store settings on behalf of merchant
router.patch(
  '/stores/:id/settings',
  logAdminAction('STORE_SETTINGS_UPDATED', 'STORE', (req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await storeService.adminUpdate(req.params.id, req.body);
      res.json({ success: true, data: store });
    } catch (err) {
      next(err);
    }
  }
);

// Admin manages products in a store
router.get(
  '/stores/:storeId/products',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await productService.list(req.params.storeId, {
        page: Number(req.query.page ?? 1),
        limit: Number(req.query.limit ?? 20),
      });
      res.json({ success: true, data: result.items });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/stores/:storeId/products/:productId',
  logAdminAction('STORE_PRODUCT_UPDATED', 'PRODUCT', (req) => req.params.productId, (req) => ({
    storeId: req.params.storeId,
    changes: req.body,
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await productService.update(
        req.params.productId,
        req.params.storeId,
        req.body
      );
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }
);

// ─── All Orders ──────────────────────────────────────────────────────────────

router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await adminService.listAllOrders({
      page,
      limit,
      storeId: req.query.storeId as string,
      status: req.query.status as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });
    res.json({
      success: true,
      data: result.orders,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const csv = await adminService.exportOrdersCsv({
      storeId: req.query.storeId as string,
      status: req.query.status as string,
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/orders/:id/status',
  logAdminAction('ORDER_STATUS_UPDATED', 'ORDER', (req) => req.params.id),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await prisma.order.update({
        where: { id: req.params.id },
        data: { status: req.body.status },
      });
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Analytics ───────────────────────────────────────────────────────────────

router.get('/analytics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await adminService.getAnalytics();
    res.json({ success: true, data: analytics });
  } catch (err) {
    next(err);
  }
});

router.get('/analytics/compare-stores', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await adminService.compareStores();
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// ─── Merchant health signals ───────────────────────────────────────────────────

router.get('/merchant-issues', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const issues = await adminService.getMerchantIssues();
    res.json({ success: true, data: issues });
  } catch (err) {
    next(err);
  }
});

// ─── Audit Log ───────────────────────────────────────────────────────────────

router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 50);
    const result = await adminService.getLogs({
      page,
      limit,
      action: req.query.action as string,
      adminId: req.query.adminId as string,
    });
    res.json({
      success: true,
      data: result.logs,
      pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
