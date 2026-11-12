/**
 * Online payment gateway for subscriptions.
 *
 * Selected with the PAYMENT_GATEWAY env var:
 *   - unset / "none" → only manual payments (bank transfer / ZainCash, approved by the admin)
 *   - "test"         → a built-in fake gateway for trying the whole flow end to end
 *   - "live"         → the real gateway (fill in `liveProvider` below when its details arrive)
 *
 * The gateway is linked to the plans and billing cycles: every checkout carries the plan, the cycle
 * (monthly / yearly / lifetime / lifetime installment / lifetime upgrade) and the exact USD amount
 * from lib/billing.ts `quote()`. Optional PAYMENT_GATEWAY_PRICE_MAP lets a gateway that uses its own
 * product/price ids map "PRO:MONTHLY" etc. to them.
 *
 * Paid → the webhook (or the test page) calls settlePaymentRequest(), which activates the plan exactly
 * like an admin approval does.
 */
import crypto from 'crypto';
import type { Request } from 'express';
import { AppError } from '../middleware/errorHandler';

export interface CheckoutInput {
  requestId: string;
  amount: number;
  currency: string;
  plan: string;
  cycle: string;
  installment?: number | null;
  /** Gateway's own price id for this plan + cycle, from PAYMENT_GATEWAY_PRICE_MAP (if any). */
  priceId?: string | null;
  description: string;
  customer: { id: string; email: string; name: string };
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string;
}

export interface WebhookResult {
  requestId: string;
  paid: boolean;
  providerRef?: string | null;
}

export interface GatewayProvider {
  key: string;
  /** Shown on the pay button, e.g. "بطاقة / Qi Card". */
  label: string;
  createCheckout(input: CheckoutInput): Promise<{ redirectUrl: string; providerRef?: string | null }>;
  /** Verify and read a webhook call. Return null when it is not a payment result we care about. */
  parseWebhook(req: Request): Promise<WebhookResult | null>;
}

const secret = () => process.env.PAYMENT_GATEWAY_SECRET || process.env.JWT_SECRET || 'dev-secret';
export const signTestRequest = (requestId: string) =>
  crypto.createHmac('sha256', secret()).update(`test-gateway:${requestId}`).digest('hex').slice(0, 32);

/** Fake gateway: sends the merchant to /billing/test-gateway where they press "pay" or "cancel". */
const testProvider: GatewayProvider = {
  key: 'test',
  label: 'بوابة تجريبية',
  async createCheckout(input) {
    const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const qs = new URLSearchParams({ request: input.requestId, sig: signTestRequest(input.requestId), amount: String(input.amount), plan: input.plan, cycle: input.cycle });
    return { redirectUrl: `${appUrl}/billing/test-gateway?${qs}`, providerRef: `test_${input.requestId}` };
  },
  async parseWebhook(req) {
    const body = typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '{}');
    const { request, sig, action } = body as { request?: string; sig?: string; action?: string };
    if (!request || !sig || sig !== signTestRequest(request)) return null;
    return { requestId: request, paid: action === 'pay', providerRef: `test_${request}` };
  },
};

/**
 * The real gateway goes here. Fill in:
 *   createCheckout → call the gateway's "create payment / checkout session" API with input.amount,
 *                    input.currency, input.requestId (as the order reference), input.successUrl,
 *                    input.cancelUrl and input.webhookUrl; return the hosted payment page URL.
 *   parseWebhook   → verify the gateway's signature (raw body is in req.body as a Buffer), then return
 *                    { requestId: <the reference you sent>, paid: <status is success>, providerRef }.
 * Credentials come from env vars (PAYMENT_GATEWAY_API_KEY, PAYMENT_GATEWAY_SECRET, …) — never hard-code them.
 */
const liveProvider: GatewayProvider = {
  key: 'live',
  label: process.env.PAYMENT_GATEWAY_LABEL || 'الدفع الإلكتروني',
  async createCheckout() {
    throw new AppError(503, 'بوابة الدفع لم تُربط بعد');
  },
  async parseWebhook() {
    return null;
  },
};

export function activeGateway(): GatewayProvider | null {
  switch ((process.env.PAYMENT_GATEWAY ?? 'none').toLowerCase()) {
    case 'test': return testProvider;
    case 'live': return liveProvider;
    default: return null;
  }
}

/** Gateway price id for "PLAN:CYCLE" from PAYMENT_GATEWAY_PRICE_MAP (JSON), if configured. */
export function gatewayPriceId(plan: string, cycle: string): string | null {
  try {
    const map = JSON.parse(process.env.PAYMENT_GATEWAY_PRICE_MAP ?? '{}') as Record<string, string>;
    return map[`${plan}:${cycle}`] ?? null;
  } catch { return null; }
}
