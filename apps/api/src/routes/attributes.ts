import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken, requireRole } from '../middleware/auth';
import prisma from '@storebuilder/database';

const router = Router();

async function getStore(merchantId: string) {
  return prisma.store.findUnique({ where: { merchantId } });
}

// GET /api/attributes — list for merchant's store
router.get('/', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
    const attrs = await prisma.productAttribute.findMany({
      where: { storeId: store.id },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: attrs });
  } catch (e) { next(e); }
});

// POST /api/attributes
router.post('/', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
    const { name, kind = 'select', options = [], isRequired = false, sortOrder = 0 } = req.body;
    if (!name) { res.status(400).json({ success: false, error: 'name required' }); return; }
    const attr = await prisma.productAttribute.create({
      data: { storeId: store.id, name, kind, options, isRequired, sortOrder },
    });
    res.status(201).json({ success: true, data: attr });
  } catch (e) { next(e); }
});

// PUT /api/attributes/:id
router.patch('/:id', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
    const existing = await prisma.productAttribute.findFirst({ where: { id: req.params.id, storeId: store.id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    const updated = await prisma.productAttribute.update({
      where: { id: req.params.id },
      data: { name: req.body.name, kind: req.body.kind, options: req.body.options, isRequired: req.body.isRequired, sortOrder: req.body.sortOrder },
    });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
});

// DELETE /api/attributes/:id
router.delete('/:id', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
    await prisma.productAttribute.deleteMany({ where: { id: req.params.id, storeId: store.id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /api/attributes/product/:productId — get values for a product
router.get('/product/:productId', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
    const values = await prisma.productAttributeValue.findMany({
      where: { productId: req.params.productId },
      include: { attribute: true },
    });
    res.json({ success: true, data: values });
  } catch (e) { next(e); }
});

// POST /api/attributes/product/:productId — upsert attribute values for a product
router.post('/product/:productId', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
    // req.body.values = [{ attributeId, value }]
    const { values = [] } = req.body;
    for (const v of values) {
      await prisma.productAttributeValue.upsert({
        where: { productId_attributeId: { productId: req.params.productId, attributeId: v.attributeId } },
        create: { productId: req.params.productId, attributeId: v.attributeId, value: String(v.value) },
        update: { value: String(v.value) },
      });
    }
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /api/attributes/product/:productId/:attributeId — remove one spec from a product
router.delete('/product/:productId/:attributeId', verifyToken, requireRole('MERCHANT'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const store = await getStore(req.user!.userId);
    if (!store) { res.status(404).json({ success: false, error: 'Store not found' }); return; }
    await prisma.productAttributeValue.deleteMany({
      where: { productId: req.params.productId, attributeId: req.params.attributeId },
    });
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
