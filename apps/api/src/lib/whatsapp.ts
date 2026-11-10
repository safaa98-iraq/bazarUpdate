import crypto from 'crypto';
import prisma from '@storebuilder/database';

export interface WhatsappSettings {
  /** Send the confirmation automatically when a new order arrives (needs Cloud API credentials). */
  autoConfirm?: boolean;
  /** Message template; placeholders: {name} {store} {total} {link} {order} */
  message?: string;
  /** WhatsApp Business Cloud API credentials (optional — without them the merchant sends via wa.me). */
  phoneNumberId?: string;
  accessToken?: string;
  /** Approved template for business-initiated messages; body params = name, store, total; URL button param = token. */
  templateName?: string;
  templateLang?: string;
}

export const DEFAULT_CONFIRM_MESSAGE =
  'مرحباً {name} 👋\nاستلمنا طلبك رقم #{order} من {store} بقيمة {total}.\nرجاءً أكّد طلبك قبل الشحن بالضغط على الرابط:\n{link}\nشكراً لك 🌷';

export function readWhatsappSettings(raw: unknown): WhatsappSettings {
  return raw && typeof raw === 'object' ? (raw as WhatsappSettings) : {};
}

/** Settings safe to return to the dashboard (token masked). */
export function publicWhatsappSettings(raw: unknown) {
  const s = readWhatsappSettings(raw);
  return {
    autoConfirm: !!s.autoConfirm,
    message: s.message || DEFAULT_CONFIRM_MESSAGE,
    phoneNumberId: s.phoneNumberId ?? '',
    templateName: s.templateName ?? '',
    templateLang: s.templateLang ?? 'ar',
    hasAccessToken: !!s.accessToken,
    apiConfigured: apiConfigured(s),
  };
}

function apiConfigured(s: WhatsappSettings): boolean {
  return !!((s.phoneNumberId && s.accessToken) || (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN));
}

/** Iraqi numbers: 07XXXXXXXXX / 7XXXXXXXXX / +9647XXXXXXXXX → 9647XXXXXXXXX (digits only). */
export function normalizeIraqiPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/[^\d]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('964')) return d.length >= 12 ? d : null;
  if (d.startsWith('0')) d = d.slice(1);
  if (d.startsWith('7') && d.length === 10) return `964${d}`;
  return d.length >= 10 ? d : null;
}

export function appUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function confirmUrl(slug: string, token: string): string {
  return `${appUrl()}/store/${slug}/confirm/${token}`;
}

export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export function formatIQD(n: number): string {
  return `${Math.round(n).toLocaleString('en-US')} د.ع`;
}

/** Make sure the order has a confirmation token; returns the public link + a ready wa.me link. */
export async function ensureConfirmation(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { store: { select: { name: true, slug: true, whatsappSettings: true } } },
  });
  if (!order) return null;
  let token = order.confirmationToken;
  if (!token) {
    token = crypto.randomBytes(16).toString('hex');
    await prisma.order.update({
      where: { id: order.id },
      data: { confirmationToken: token, ...(order.confirmationStatus === 'NONE' ? { confirmationStatus: 'PENDING' } : {}) },
    });
  }
  const settings = readWhatsappSettings(order.store.whatsappSettings);
  const link = confirmUrl(order.store.slug, token);
  const text = fillTemplate(settings.message || DEFAULT_CONFIRM_MESSAGE, {
    name: order.customerName, store: order.store.name, total: formatIQD(Number(order.total)),
    link, order: order.id.slice(-6).toUpperCase(),
  });
  const phone = normalizeIraqiPhone(order.customerPhone);
  return {
    token, link, text, phone,
    waLink: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : null,
    settings, store: order.store, order,
  };
}

/** Send through the WhatsApp Business Cloud API. Returns null on success, or an error message. */
export async function sendViaCloudApi(s: WhatsappSettings, to: string, text: string, params: { name: string; store: string; total: string; token: string }): Promise<string | null> {
  const phoneNumberId = s.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = s.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return 'لم يتم ربط WhatsApp Business API';
  const templateName = s.templateName || process.env.WHATSAPP_CONFIRM_TEMPLATE;

  // Business-initiated messages must use an approved template; free text only works inside a 24h customer window.
  const body = templateName
    ? {
        messaging_product: 'whatsapp', to, type: 'template',
        template: {
          name: templateName,
          language: { code: s.templateLang || 'ar' },
          components: [
            { type: 'body', parameters: [params.name, params.store, params.total].map(t => ({ type: 'text', text: t })) },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: params.token }] },
          ],
        },
      }
    : { messaging_product: 'whatsapp', to, type: 'text', text: { body: text, preview_url: true } };

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return null;
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    return err.error?.message ?? `WhatsApp API ${res.status}`;
  } catch (e) {
    return e instanceof Error ? e.message : 'تعذّر الاتصال بواتساب';
  }
}

/** Create the token and, when the store enabled auto-confirmation with the API, send it now. */
export async function autoSendConfirmation(orderId: string): Promise<void> {
  const c = await ensureConfirmation(orderId);
  if (!c || !c.settings.autoConfirm || !c.phone || !apiConfigured(c.settings)) return;
  // Auto-send (API) is Business-plan only — a downgraded store stops sending automatically.
  const owner = await prisma.order.findUnique({ where: { id: orderId }, select: { store: { select: { merchant: { select: { plan: true } } } } } });
  if (owner?.store.merchant.plan !== 'ENTERPRISE') return;
  const err = await sendViaCloudApi(c.settings, c.phone, c.text, {
    name: c.order.customerName, store: c.store.name, total: formatIQD(Number(c.order.total)), token: c.token,
  });
  if (!err) await prisma.order.update({ where: { id: orderId }, data: { confirmationSentAt: new Date() } });
  else console.warn(`WhatsApp confirmation for ${orderId} failed: ${err}`);
}
