import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '@storebuilder/database';
import { STAFF_PERMISSIONS, STAFF_ROLE_PRESETS, type StaffMemberPublic, type StaffRolePreset } from '@storebuilder/types';
import { verifyToken, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { assertUnderLimit } from '../lib/limits';
import { getMerchantContext, assertPlan } from '../lib/plan';

const router = Router();
// Staff tokens are rejected for /api/staff by staffAccess, so only the owner reaches these handlers.
const owner = [verifyToken, requireRole('MERCHANT')];

const VALID_PERMS = new Set(STAFF_PERMISSIONS.map(p => p.key));

function toPublic(s: {
  id: string; name: string; email: string; role: string; permissions: unknown; warehouseId: string | null;
  isActive: boolean; lastLoginAt: Date | null; createdAt: Date; warehouse?: { name: string } | null;
}): StaffMemberPublic {
  return {
    id: s.id, name: s.name, email: s.email,
    role: s.role as StaffRolePreset,
    permissions: (Array.isArray(s.permissions) ? s.permissions : []) as StaffMemberPublic['permissions'],
    warehouseId: s.warehouseId, warehouseName: s.warehouse?.name ?? null,
    isActive: s.isActive,
    lastLoginAt: s.lastLoginAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

function cleanPermissions(role: StaffRolePreset, permissions: unknown): string[] {
  if (role !== 'custom') return STAFF_ROLE_PRESETS[role].permissions;
  return Array.isArray(permissions) ? [...new Set(permissions.filter((p): p is string => typeof p === 'string' && VALID_PERMS.has(p as never)))] : [];
}

function validPassword(pw: unknown): pw is string {
  return typeof pw === 'string' && pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

router.get('/', ...owner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const staff = await prisma.staffMember.findMany({
      where: { storeId: store.id }, include: { warehouse: { select: { name: true } } }, orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: staff.map(toPublic) });
  } catch (err) { next(err); }
});

router.post('/', ...owner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store, plan } = await getMerchantContext(req);
    assertPlan(plan, 'ENTERPRISE', 'حسابات الموظفين');
    const { name, email, password, role = 'custom', permissions, warehouseId } = req.body ?? {};
    if (!name?.trim()) throw new AppError(400, 'اسم الموظف مطلوب');
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new AppError(400, 'البريد الإلكتروني غير صالح');
    if (!validPassword(password)) throw new AppError(400, 'كلمة المرور 8 أحرف على الأقل وتحتوي حرفاً ورقماً');
    if (!(role in STAFF_ROLE_PRESETS)) throw new AppError(400, 'دور غير معروف');

    const count = await prisma.staffMember.count({ where: { storeId: store.id } });
    assertUnderLimit(plan, 'maxStaff', count, 'حسابات الموظفين');

    const normalized = String(email).trim().toLowerCase();
    const [staffTaken, userTaken] = await Promise.all([
      prisma.staffMember.findUnique({ where: { email: normalized } }),
      prisma.user.findUnique({ where: { email: normalized } }),
    ]);
    if (staffTaken || userTaken) throw new AppError(409, 'هذا البريد مستخدم مسبقاً');

    if (warehouseId) {
      const wh = await prisma.warehouse.findFirst({ where: { id: warehouseId, storeId: store.id } });
      if (!wh) throw new AppError(400, 'الفرع غير موجود');
    }

    const rounds = Math.min(Number(process.env.BCRYPT_ROUNDS ?? 12), 14);
    const created = await prisma.staffMember.create({
      data: {
        storeId: store.id, name: name.trim(), email: normalized,
        password: await bcrypt.hash(password, rounds),
        role, permissions: cleanPermissions(role, permissions),
        warehouseId: warehouseId || null,
      },
      include: { warehouse: { select: { name: true } } },
    });
    res.status(201).json({ success: true, data: toPublic(created) });
  } catch (err) { next(err); }
});

router.patch('/:id', ...owner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const existing = await prisma.staffMember.findFirst({ where: { id: req.params.id, storeId: store.id } });
    if (!existing) throw new AppError(404, 'الموظف غير موجود');

    const { name, role, permissions, warehouseId, isActive, password } = req.body ?? {};
    const nextRole = (role ?? existing.role) as StaffRolePreset;
    if (!(nextRole in STAFF_ROLE_PRESETS)) throw new AppError(400, 'دور غير معروف');
    if (password !== undefined && password !== '' && !validPassword(password)) {
      throw new AppError(400, 'كلمة المرور 8 أحرف على الأقل وتحتوي حرفاً ورقماً');
    }
    if (warehouseId) {
      const wh = await prisma.warehouse.findFirst({ where: { id: warehouseId, storeId: store.id } });
      if (!wh) throw new AppError(400, 'الفرع غير موجود');
    }

    const rounds = Math.min(Number(process.env.BCRYPT_ROUNDS ?? 12), 14);
    const updated = await prisma.staffMember.update({
      where: { id: existing.id },
      data: {
        ...(name?.trim() ? { name: name.trim() } : {}),
        role: nextRole,
        permissions: cleanPermissions(nextRole, permissions ?? existing.permissions),
        ...(warehouseId !== undefined ? { warehouseId: warehouseId || null } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(password ? { password: await bcrypt.hash(password, rounds) } : {}),
      },
      include: { warehouse: { select: { name: true } } },
    });
    res.json({ success: true, data: toPublic(updated) });
  } catch (err) { next(err); }
});

router.delete('/:id', ...owner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { store } = await getMerchantContext(req);
    const result = await prisma.staffMember.deleteMany({ where: { id: req.params.id, storeId: store.id } });
    if (!result.count) throw new AppError(404, 'الموظف غير موجود');
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
