---
name: vantage-trial-workspace-provisioner
description: Provision and validate real VantageAI trial workspaces that are blank by default, tenant-scoped, full-access for 14 days, and clearly separate from demo or paid workspaces. Use when implementing or auditing trial signup flows, tenant creation, workspace mode persistence, trial lifecycle fields, or trial entitlement behavior.
---

# Vantage Trial Workspace Provisioner

## Required behavior

1. Provision a brand-new tenant for trial users instead of routing them into the demo tenant.
2. Persist workspace mode at the tenant level with explicit `DEMO`, `TRIAL`, and `PAID` behavior.
3. Store trial lifecycle data with `trialStartedAt`, `trialEndsAt`, and `trialStatus`.
4. Grant full trial access through the existing entitlement and subscription patterns instead of inventing parallel billing logic.
5. Keep the trial workspace blank by default. Do not seed fake buyer requests, incidents, or executive artifacts into a real trial.
6. Create the requesting user as an active workspace owner or admin and keep all records tenant-scoped and audit-aware.
7. Preserve the seeded demo workspace as a separate code path for demos and sales storytelling.

## Workflow

### 1. Confirm the current provisioning path

- Inspect tenant creation routes, auth/session selection, and any demo bootstrap helpers first.
- Identify where the app currently assumes the demo tenant, a free plan, or seeded workspace data.
- Reuse existing tenant creation and audit patterns rather than building a side flow.

### 2. Implement trial tenant creation

- Create a dedicated trial start path that provisions a new tenant, membership, branding record, and trial subscription state.
- Set `workspaceMode=TRIAL`, `trialStatus=ACTIVE`, and calculate a 14-day end date.
- Keep the initial workspace usable but empty, with no automatic sample operations data.

### 3. Wire entitlements and session behavior

- Treat an active trial as full-suite access inside the current entitlement resolver.
- Remove contradictory disabled messaging such as AI or PDF lockouts for active trial workspaces.
- Keep demo-only language and seeded paths scoped to `workspaceMode=DEMO`.

### 4. Validate the split

- Verify demo reset still produces the seeded demo tenant.
- Verify the trial path lands in a different tenant slug and tenant id.
- Verify paid behavior still follows the standard subscription and entitlement path.

## Expected output

- `workspace_mode_model`
- `trial_provisioning_path`
- `trial_entitlement_behavior`
- `demo_preservation_notes`
- `validation_results`

## Product mapping

- Extend `src/app/api/tenants/create/route.ts`, `src/app/api/trial/start/route.ts`, auth/session helpers, Prisma tenant fields, and billing/entitlement helpers first.
- Reuse `Tenant`, `Membership`, `Subscription`, `TenantBranding`, and audit log patterns already present locally.
- Avoid destructive schema moves, fake trial-on-demo shortcuts, and any Stripe checkout expansion in this skill.
