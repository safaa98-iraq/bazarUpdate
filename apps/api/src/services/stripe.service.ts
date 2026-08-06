import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2023-10-16',
});

export interface CreatePaymentIntentParams {
  amount: number; // in cents
  currency?: string;
  metadata?: Record<string, string>;
}

export class StripeService {
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
    return stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100),
      currency: params.currency ?? 'usd',
      metadata: params.metadata ?? {},
      automatic_payment_methods: { enabled: true },
    });
  }

  async confirmPaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    return stripe.paymentIntents.retrieve(id);
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? ''
    );
  }
}

export const stripeService = new StripeService();
