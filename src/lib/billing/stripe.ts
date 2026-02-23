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
    FREE: undefined,
    STARTER: process.env.STRIPE_PRICE_STARTER,
    PRO: process.env.STRIPE_PRICE_PRO,
    BUSINESS: process.env.STRIPE_PRICE_BUSINESS ?? process.env.STRIPE_PRICE_PARTNER,
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE
  };

  const priceId = mapping[plan];
  if (!priceId) {
    throw new Error(`Stripe price not configured for plan ${plan}`);
  }

  return priceId;
}

export function planFromPriceId(priceId: string | null | undefined): PlanTier {
  if (!priceId) return 'FREE';

  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return 'ENTERPRISE';
  if (priceId === (process.env.STRIPE_PRICE_BUSINESS ?? process.env.STRIPE_PRICE_PARTNER)) return 'BUSINESS';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'PRO';
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'STARTER';
  return 'STARTER';
}

