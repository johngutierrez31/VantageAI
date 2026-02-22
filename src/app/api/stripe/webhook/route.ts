import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getStripeClient, planFromPriceId } from '@/lib/billing/stripe';

async function resolveTenantIdFromCustomer(customerId: string | null | undefined) {
  if (!customerId) return null;
  const customer = await prisma.stripeCustomer.findUnique({
    where: { stripeCustomerId: customerId }
  });
  return customer?.tenantId ?? null;
}

async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const tenantId = await resolveTenantIdFromCustomer(customerId);

  if (!tenantId) {
    return;
  }

  const activePriceId = subscription.items.data[0]?.price?.id;
  const plan = planFromPriceId(activePriceId);
  const currentPeriodStart = subscription.items.data[0]?.current_period_start ?? null;
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null;

  const existing = await prisma.subscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: subscription.id },
        { tenantId }
      ]
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        tenantId,
        plan,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000) : null,
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null
      }
    });
    return;
  }

  await prisma.subscription.create({
    data: {
      tenantId,
      plan,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodStart: currentPeriodStart ? new Date(currentPeriodStart * 1000) : null,
      currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000) : null
    }
  });
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook signature not configured' }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  const duplicate = await prisma.billingWebhookEvent.findUnique({
    where: { stripeEventId: event.id }
  });

  if (duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const tenantId = session.metadata?.tenantId;

        if (tenantId && customerId) {
          await prisma.stripeCustomer.upsert({
            where: { tenantId },
            update: { stripeCustomerId: customerId },
            create: {
              tenantId,
              stripeCustomerId: customerId
            }
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscriptionFromStripe(subscription);
        break;
      }
      default:
        break;
    }

    const tenantId = await resolveTenantIdFromCustomer(
      (() => {
        if ('customer' in event.data.object) {
          const customer = (event.data.object as { customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null })
            .customer;
          return typeof customer === 'string' ? customer : customer?.id;
        }
        return null;
      })()
    );

    await prisma.billingWebhookEvent.create({
      data: {
        stripeEventId: event.id,
        tenantId,
        type: event.type,
        payload: event as unknown as Prisma.InputJsonValue
      }
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
