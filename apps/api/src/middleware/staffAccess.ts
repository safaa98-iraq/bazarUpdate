import { Request } from 'express';
import prisma from '@storebuilder/database';
import type { JwtPayload, StaffPermission } from '@storebuilder/types';

/**
 * Staff tokens carry role MERCHANT and the owner's userId, so every existing
 * merchant route keeps working. This decides, per request, whether the staff
 * member's permissions allow it.
 *
 * Rules:
 *  - Owner-only areas (billing, staff management) are always denied.
 *  - Customer data (orders, chat) needs the matching permission even to read.
 *  - Any write (non-GET) needs the permission mapped to its route prefix.
 *  - Unmapped write routes are denied by default.
 */
const OWNER_ONLY = ['/api/billing', '/api/staff', '/api/auth/referrals'];

const READ_PROTECTED: [string, StaffPermission][] = [
  ['/api/orders', 'orders'],
  ['/api/shipments', 'orders'],
  ['/api/chat', 'chat'],
  ['/api/customer', 'orders'],
];

const WRITE_RULES: [string, StaffPermission][] = [
  ['/api/orders', 'orders'],
  ['/api/shipments', 'orders'],
  ['/api/products', 'products'],
  ['/api/categories', 'products'],
  ['/api/brands', 'products'],
  ['/api/attributes', 'products'],
  ['/api/reviews', 'products'],
  ['/api/coupons', 'marketing'],
  ['/api/affiliates', 'marketing'],
  ['/api/promotions', 'marketing'],
  ['/api/gift-cards', 'marketing'],
  ['/api/loyalty', 'marketing'],
  ['/api/banners', 'design'],
  ['/api/chat', 'chat'],
  ['/api/warehouses', 'branches'],
  ['/api/stores', 'settings'],
];

/** Writes any signed-in staff member may make. */
const WRITE_ALLOWED = ['/api/upload', '/api/notifications', '/api/track'];

const startsWith = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?');

export function staffDecision(path: string, method: string, permissions: string[]): string | null {
  if (OWNER_ONLY.some(p => startsWith(path, p))) return 'هذه الصفحة لصاحب المتجر فقط';

  // Store builder edits go through PUT /api/stores/... — they need "design", other store edits "settings".
  if (method !== 'GET' && startsWith(path, '/api/stores') && /builder|template|banner/i.test(path)) {
    return permissions.includes('design') || permissions.includes('settings') ? null : 'لا تملك صلاحية تعديل تصميم المتجر';
  }

  if (method === 'GET') {
    const rule = READ_PROTECTED.find(([p]) => startsWith(path, p));
    if (rule && !permissions.includes(rule[1])) return 'لا تملك صلاحية عرض هذه البيانات';
    return null;
  }

  if (WRITE_ALLOWED.some(p => startsWith(path, p))) return null;
  const rule = WRITE_RULES.find(([p]) => startsWith(path, p));
  if (!rule) return 'لا تملك صلاحية تنفيذ هذا الإجراء';
  return permissions.includes(rule[1]) ? null : 'لا تملك صلاحية تنفيذ هذا الإجراء';
}

/** Returns an error message when the staff member may not make this request, otherwise null. */
export async function checkStaffAccess(req: Request, payload: JwtPayload): Promise<string | null> {
  if (!payload.staffId) return null;
  const staff = await prisma.staffMember.findUnique({
    where: { id: payload.staffId },
    select: { isActive: true, permissions: true, store: { select: { merchantId: true } } },
  });
  if (!staff || !staff.isActive || staff.store.merchantId !== payload.userId) return 'تم إيقاف حساب الموظف';
  // Always use the live permissions so changes apply without re-login.
  const perms = Array.isArray(staff.permissions) ? (staff.permissions as string[]) : [];
  payload.permissions = perms;
  const path = req.originalUrl.split('?')[0];
  return staffDecision(path, req.method.toUpperCase(), perms);
}
