import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { requireRole } from '@/lib/rbac/authorize';
import { getStripeClient } from '@/lib/billing/stripe';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError, notFound } from '@/lib/http';
import { authBaseUrl } from '@/lib/auth/options';

export async function POST() {
  try {
    const session = await getSessionContext();
    requireRole(session, 'ADMIN');

    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { tenantId: session.tenantId }
    });

    if (!stripeCustomer) return notFound('Stripe customer not found');

    const stripe = getStripeClient();
    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.stripeCustomerId,
      return_url: `${authBaseUrl}/app/assessments`
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    return handleRouteError(error);
  }
}
