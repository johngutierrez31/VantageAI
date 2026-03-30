import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { MembershipStatus, PlanTier, TenantRole, TrialStatus, WorkspaceMode } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import { isBillingActive } from '@/lib/billing/limits';
import { verifyPassword } from '@/lib/auth/password';
import { credentialsLoginSchema } from '@/lib/validation/auth';

const emailFrom = process.env.AUTH_EMAIL_FROM;

function getBaseUrl() {
  return process.env.APP_BASE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
}

async function sendVerificationRequest({ identifier, url }: { identifier: string; url: string }) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const subject = 'Your VantageCISO sign-in link';
  const text = `Sign in to VantageCISO: ${url}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;">
      <h2>Sign in to VantageCISO</h2>
      <p>Use the link below to continue:</p>
      <p><a href="${url}">Sign in</a></p>
      <p>If you did not request this email, you can ignore it.</p>
    </div>
  `;

  if (!resendApiKey) {
    console.log(`[auth] magic link for ${identifier}: ${url}`);
    return;
  }

  if (!emailFrom) {
    throw new Error('AUTH_EMAIL_FROM is required when RESEND_API_KEY is configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [identifier],
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to send magic link email: ${response.status}`);
  }
}

function hasActiveMembership(role: TenantRole | null | undefined): role is TenantRole {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER' || role === 'VIEWER';
}

function resolveTenantPlan(args: {
  workspaceMode: WorkspaceMode;
  trialStatus: TrialStatus;
  trialEndsAt: Date | null;
  subscriptionPlan?: PlanTier | null;
  subscriptionStatus?: string | null;
}) {
  if (args.workspaceMode === 'DEMO') return 'ENTERPRISE';

  const now = Date.now();
  const trialActive =
    args.workspaceMode === 'TRIAL' &&
    args.trialStatus === 'ACTIVE' &&
    Boolean(args.trialEndsAt && args.trialEndsAt.getTime() >= now);

  if (trialActive) return 'ENTERPRISE';

  const subscriptionPlan = args.subscriptionPlan ?? 'FREE';
  const subscriptionStatus = args.subscriptionStatus ?? null;

  if (!subscriptionStatus || !isBillingActive(subscriptionStatus)) return 'FREE';
  if (args.workspaceMode === 'TRIAL' && args.trialEndsAt && args.trialEndsAt.getTime() < now && subscriptionStatus === 'trialing') {
    return 'FREE';
  }

  return subscriptionPlan;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login'
  },
  providers: [
    CredentialsProvider({
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const parsed = credentialsLoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            credential: { select: { passwordHash: true } },
            memberships: {
              where: { status: MembershipStatus.ACTIVE },
              select: { role: true }
            }
          }
        });

        if (!user?.credential?.passwordHash) return null;
        if (!verifyPassword(parsed.data.password, user.credential.passwordHash)) return null;
        if (!user.memberships.some((membership) => hasActiveMembership(membership.role))) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name
        };
      }
    }),
    EmailProvider({
      from: emailFrom,
      maxAge: 24 * 60 * 60,
      sendVerificationRequest
    })
  ],
  callbacks: {
    async signIn({ user }) {
      const rawEmail = user.email;
      if (!rawEmail) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email: rawEmail },
        select: {
          id: true,
          memberships: {
            where: { status: MembershipStatus.ACTIVE },
            select: { role: true }
          }
        }
      });

      if (!existingUser) return false;
      return existingUser.memberships.some((membership) => hasActiveMembership(membership.role));
    },
    async jwt({ token, trigger, session }) {
      if (!token.sub && token.email) {
        const byEmail = await prisma.user.findUnique({ where: { email: token.email } });
        if (byEmail) token.sub = byEmail.id;
      }

      if (!token.sub) return token;

      const memberships = await prisma.membership.findMany({
        where: { userId: token.sub, status: MembershipStatus.ACTIVE },
        include: {
          tenant: {
            select: {
              id: true,
              slug: true,
              name: true,
              workspaceMode: true,
              trialStatus: true,
              trialEndsAt: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      const tenantIds = memberships.map((membership) => membership.tenantId);
      const subscriptions = tenantIds.length
        ? await prisma.subscription.findMany({
            where: { tenantId: { in: tenantIds } },
            orderBy: [{ tenantId: 'asc' }, { updatedAt: 'desc' }],
            select: {
              tenantId: true,
              plan: true,
              status: true
            }
          })
        : [];

      const latestSubscriptionByTenant = new Map<string, { plan: PlanTier; status: string }>();
      for (const subscription of subscriptions) {
        if (!latestSubscriptionByTenant.has(subscription.tenantId)) {
          latestSubscriptionByTenant.set(subscription.tenantId, {
            plan: subscription.plan,
            status: subscription.status
          });
        }
      }

      const claim = memberships.map((membership) => ({
        tenantId: membership.tenantId,
        tenantSlug: membership.tenant.slug,
        tenantName: membership.tenant.name,
        role: membership.role,
        workspaceMode: membership.tenant.workspaceMode,
        plan: resolveTenantPlan({
          workspaceMode: membership.tenant.workspaceMode,
          trialStatus: membership.tenant.trialStatus,
          trialEndsAt: membership.tenant.trialEndsAt,
          subscriptionPlan: latestSubscriptionByTenant.get(membership.tenantId)?.plan,
          subscriptionStatus: latestSubscriptionByTenant.get(membership.tenantId)?.status
        })
      }));

      token.memberships = claim;

      const requestedTenantId = trigger === 'update' ? session?.activeTenantId : undefined;
      if (requestedTenantId && claim.some((membership) => membership.tenantId === requestedTenantId)) {
        token.activeTenantId = requestedTenantId;
      }

      if (!token.activeTenantId || !claim.some((membership) => membership.tenantId === token.activeTenantId)) {
        token.activeTenantId = claim[0]?.tenantId;
      }

      const activeMembership = claim.find((membership) => membership.tenantId === token.activeTenantId);
      token.role = activeMembership?.role;
      token.activeTenantSlug = activeMembership?.tenantSlug;
      token.activeTenantName = activeMembership?.tenantName;
      token.activeTenantWorkspaceMode = activeMembership?.workspaceMode;
      token.activeTenantPlan = activeMembership?.plan;

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        session.user = {
          id: '',
          email: null,
          name: null,
          image: null,
          role: null,
          activeTenantId: null,
          activeTenantSlug: null,
          activeTenantName: null,
          activeTenantWorkspaceMode: null,
          activeTenantPlan: null,
          memberships: []
        };
      }

      session.user.id = token.sub ?? '';
      session.user.role = (token.role as TenantRole | undefined) ?? null;
      session.user.activeTenantId = (token.activeTenantId as string | undefined) ?? null;
      session.user.activeTenantSlug = (token.activeTenantSlug as string | undefined) ?? null;
      session.user.activeTenantName = (token.activeTenantName as string | undefined) ?? null;
      session.user.activeTenantWorkspaceMode = (token.activeTenantWorkspaceMode as WorkspaceMode | undefined) ?? null;
      session.user.activeTenantPlan = (token.activeTenantPlan as PlanTier | undefined) ?? null;
      session.user.memberships = (token.memberships as Array<{
        tenantId: string;
        tenantSlug: string;
        tenantName: string;
        role: TenantRole;
        workspaceMode: WorkspaceMode;
        plan: PlanTier;
      }> | undefined) ?? [];
      return session;
    }
  }
};

export const authBaseUrl = getBaseUrl();

