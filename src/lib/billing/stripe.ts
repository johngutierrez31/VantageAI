import Stripe from 'stripe';
import { PlanTier } from '@prisma/client';

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}

export function getPriceIdForPlan(plan: PlanTier) {
  const mapping: Record<PlanTier, string | undefined> = {
    STARTER: process.env.STRIPE_PRICE_STARTER,
    PRO: process.env.STRIPE_PRICE_PRO,
    PARTNER: process.env.STRIPE_PRICE_PARTNER
  };

  const priceId = mapping[plan];
  if (!priceId) {
    throw new Error(`Stripe price not configured for plan ${plan}`);
  }

  return priceId;
}

export function planFromPriceId(priceId: string | null | undefined): PlanTier {
  if (!priceId) return 'STARTER';

  if (priceId === process.env.STRIPE_PRICE_PARTNER) return 'PARTNER';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'PRO';
  return 'STARTER';
}
