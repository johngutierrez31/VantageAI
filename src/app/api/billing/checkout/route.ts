import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { requireRole } from '@/lib/rbac/authorize';
import { checkoutSchema } from '@/lib/validation/billing';
import { getStripeClient, getPriceIdForPlan } from '@/lib/billing/stripe';
import { prisma } from '@/lib/db/prisma';
import { handleRouteError, notFound } from '@/lib/http';
import { writeAuditLog } from '@/lib/audit';
import { authBaseUrl } from '@/lib/auth/options';

export async function POST(request: Request) {
  try {
    const session = await getSessionContext();
    requireRole(session, 'ADMIN');

    const payload = checkoutSchema.parse(await request.json());

    const stripe = getStripeClient();

    let stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { tenantId: session.tenantId }
    });

    if (!stripeCustomer) {
      const createdCustomer = await stripe.customers.create({
        email: undefined,
        name: session.tenantName,
        metadata: {
          tenantId: session.tenantId,
          tenantSlug: session.tenantSlug
        }
      });

      stripeCustomer = await prisma.stripeCustomer.create({
        data: {
          tenantId: session.tenantId,
          stripeCustomerId: createdCustomer.id
        }
      });
    }

    const priceId = getPriceIdForPlan(payload.plan);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomer.stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${authBaseUrl}/app/assessments?billing=success`,
      cancel_url: `${authBaseUrl}/app/assessments?billing=cancel`,
      metadata: {
        tenantId: session.tenantId,
        requestedPlan: payload.plan
      },
      allow_promotion_codes: true
    });

    if (!checkoutSession.url) {
      return notFound('Stripe checkout URL unavailable');
    }

    await writeAuditLog({
      tenantId: session.tenantId,
      actorUserId: session.userId,
      entityType: 'billing_checkout',
      entityId: checkoutSession.id,
      action: 'create',
      metadata: {
        plan: payload.plan,
        stripeCustomerId: stripeCustomer.stripeCustomerId
      }
    });

    return NextResponse.json({
      url: checkoutSession.url,
      id: checkoutSession.id
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
