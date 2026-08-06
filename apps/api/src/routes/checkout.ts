import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { optionalToken } from '../middleware/auth';
import { stripeService } from '../services/stripe.service';
import { orderService } from '../services/order.service';
import prisma from '@storebuilder/database';

const router = Router();

// POST /api/checkout/intent — create Stripe PaymentIntent
router.post(
  '/intent',
  optionalToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId, items } = req.body as {
        storeId: string;
        items: { productId: string; quantity: number }[];
      };

      const productIds = items.map((i) => i.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, storeId, isActive: true },
      });

      const total = items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        return sum + (product ? Number(product.price) * item.quantity : 0);
      }, 0);

      const intent = await stripeService.createPaymentIntent({
        amount: total,
        metadata: { storeId },
      });

      res.json({
        success: true,
        data: { clientSecret: intent.client_secret, amount: total },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/checkout/confirm — confirm order after payment
router.post(
  '/confirm',
  optionalToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { stripePaymentId } = req.body;

      const intent = await stripeService.confirmPaymentIntent(stripePaymentId);
      if (intent.status !== 'succeeded') {
        res.status(400).json({ success: false, error: 'Payment not confirmed' });
        return;
      }

      const order = await orderService.create(
        { ...req.body, stripePaymentId },
        req.user?.userId
      );

      // Clear cart after successful order
      if (req.user?.userId) {
        const cart = await prisma.cart.findFirst({
          where: { customerId: req.user.userId, storeId: req.body.storeId },
        });
        if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/checkout/webhook — Stripe webhook
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;

    try {
      const event = stripeService.constructWebhookEvent(req.body as Buffer, sig);

      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object;
        await prisma.order.updateMany({
          where: { stripePaymentId: intent.id },
          data: { status: 'PAID' },
        });
      }

      res.json({ received: true });
    } catch {
      res.status(400).json({ error: 'Webhook error' });
    }
  }
);

export default router;
