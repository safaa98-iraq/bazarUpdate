/**
 * Courier adapters. "manual" = the merchant prints the waybill and updates the status by hand.
 * "alwaseet" talks to the Al-Waseet merchant API.
 *
 * ⚠️ The Al-Waseet adapter follows their public merchant API (login → create-order → order status)
 * but has not been verified against a live merchant account yet. Every call is defensive and
 * reports failures in Shipment.lastError instead of breaking the order flow.
 */
import type { ShipmentStatus } from '@storebuilder/types';

export interface ShippingSettings {
  carrier?: 'manual' | 'alwaseet';
  username?: string;
  password?: string;
  senderName?: string;
  senderPhone?: string;
  pickupAddress?: string;
}

export function readShippingSettings(raw: unknown): ShippingSettings {
  return raw && typeof raw === 'object' ? (raw as ShippingSettings) : {};
}

export function publicShippingSettings(raw: unknown) {
  const s = readShippingSettings(raw);
  return {
    carrier: s.carrier ?? 'manual',
    username: s.username ?? '',
    hasPassword: !!s.password,
    senderName: s.senderName ?? '',
    senderPhone: s.senderPhone ?? '',
    pickupAddress: s.pickupAddress ?? '',
  };
}

export const CARRIERS = [
  { key: 'manual', label: 'يدوي (أطبع البوليصة وأحدّث الحالة بنفسي)', api: false },
  { key: 'alwaseet', label: 'الوسيط — ربط تلقائي (تجريبي)', api: true },
] as const;

/** Map a courier's free-text status to ours (keyword based, Arabic + English). */
export function mapCourierStatus(text: string): ShipmentStatus {
  const t = text.toLowerCase();
  if (/(تم التسليم|تم تسليم|مسلم|delivered)/.test(t)) return 'DELIVERED';
  if (/(راجع|مرتجع|ارجاع|إرجاع|return)/.test(t)) return 'RETURNED';
  if (/(ملغ|الغاء|إلغاء|cancel)/.test(t)) return 'CANCELLED';
  if (/(قيد التوصيل|مع المندوب|خرج للتوصيل|out for delivery)/.test(t)) return 'OUT_FOR_DELIVERY';
  if (/(استلام|المخزن|تم الاستلام|picked)/.test(t)) return 'PICKED_UP';
  return 'IN_TRANSIT';
}

const WASEET = process.env.ALWASEET_API_URL ?? 'https://api.alwaseet-iq.net/v1/merchant';

async function waseetLogin(s: ShippingSettings): Promise<string> {
  const form = new URLSearchParams({ username: s.username ?? '', password: s.password ?? '' });
  const res = await fetch(`${WASEET}/login`, { method: 'POST', body: form, signal: AbortSignal.timeout(15000) });
  const json = await res.json().catch(() => null) as { status?: boolean; data?: { token?: string }; msg?: string } | null;
  if (!json?.status || !json.data?.token) throw new Error(json?.msg ?? 'فشل تسجيل الدخول إلى الوسيط');
  return json.data.token;
}

async function waseetCityId(token: string, governorate: string): Promise<string | null> {
  const res = await fetch(`${WASEET}/citys?token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(15000) });
  const json = await res.json().catch(() => null) as { data?: { id: string | number; city_name: string }[] } | null;
  const city = json?.data?.find(c => governorate && (c.city_name.includes(governorate) || governorate.includes(c.city_name)));
  return city ? String(city.id) : null;
}

export interface CourierOrder {
  customerName: string; customerPhone: string; governorate: string; city: string; address: string;
  itemsCount: number; codAmount: number; note: string; reference: string;
}

export async function createCourierShipment(s: ShippingSettings, o: CourierOrder): Promise<{ trackingNumber: string }> {
  if (s.carrier !== 'alwaseet') throw new Error('لا يوجد ربط مع شركة توصيل');
  const token = await waseetLogin(s);
  const cityId = await waseetCityId(token, o.governorate);
  if (!cityId) throw new Error(`لم يتم العثور على المحافظة "${o.governorate}" لدى الوسيط`);
  const form = new URLSearchParams({
    client_name: o.customerName,
    client_mobile: `+964${o.customerPhone.replace(/\D/g, '').replace(/^(964|0)/, '')}`,
    city_id: cityId,
    region_id: '0',
    location: `${o.city} - ${o.address}`.slice(0, 250),
    type_name: 'طلب متجر',
    items_number: String(o.itemsCount),
    price: String(Math.round(o.codAmount)),
    package_size: '1',
    merchant_notes: `${o.reference} ${o.note}`.trim().slice(0, 250),
    replacement: '0',
  });
  const res = await fetch(`${WASEET}/create-order?token=${encodeURIComponent(token)}`, { method: 'POST', body: form, signal: AbortSignal.timeout(20000) });
  const json = await res.json().catch(() => null) as { status?: boolean; data?: { qr_id?: string | number; id?: string | number }; msg?: string } | null;
  const id = json?.data?.qr_id ?? json?.data?.id;
  if (!json?.status || !id) throw new Error(json?.msg ?? 'رفض الوسيط إنشاء الشحنة');
  return { trackingNumber: String(id) };
}

/** Current courier status text for each tracking number. */
export async function fetchCourierStatuses(s: ShippingSettings, trackingNumbers: string[]): Promise<Record<string, string>> {
  if (s.carrier !== 'alwaseet' || !trackingNumbers.length) return {};
  const token = await waseetLogin(s);
  const form = new URLSearchParams({ ids: trackingNumbers.join(',') });
  const res = await fetch(`${WASEET}/get-orders-by-ids-bulk?token=${encodeURIComponent(token)}`, { method: 'POST', body: form, signal: AbortSignal.timeout(20000) });
  const json = await res.json().catch(() => null) as { data?: { id?: string | number; qr_id?: string | number; status?: string }[] } | null;
  const out: Record<string, string> = {};
  for (const row of json?.data ?? []) {
    const key = String(row.qr_id ?? row.id ?? '');
    if (key && row.status) out[key] = row.status;
  }
  return out;
}
