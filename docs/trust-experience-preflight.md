# Trust Experience Preflight

Date: 2026-03-12
Phase: External Trust Experience

## Current Dirty Files

Protected existing worktree changes observed before this phase:

- `.agents/skills/README.md`
- `docs/demo-walkthrough-suite.md`
- `prisma/demo-seed.ts`
- `prisma/demo-suite-story.ts`
- `src/app/app/command-center/page.tsx`
- `src/app/app/tools/page.tsx`
- `src/lib/product/contextual-help.ts`
- `.agents/skills/vantage-demo-export-auditor/SKILL.md`
- `.agents/skills/vantage-demo-tenant-curator/SKILL.md`
- `.agents/skills/vantage-demo-walkthrough-planner/SKILL.md`
- `docs/demo-polish-pr.md`
- `docs/demo-polish-preflight.md`
- `docs/demo-polish-summary.md`
- `docs/demo-qa-checklist.md`
- `src/components/app/demo-path-card.tsx`
- `src/lib/demo/demo-path.ts`
- `tests/demo-path.unit.test.ts`

## TrustOps Surfaces Inspected

Confirmed current TrustOps sharing and packet surfaces:

- Internal TrustOps page and packet launcher: `src/app/app/trust/page.tsx`
- Trust packet operator UI: `src/components/app/trust-packet-panel.tsx`
- Trust inbox detail workflow: `src/components/app/trust-inbox-detail-panel.tsx`
- Trust packet creation/update/export routes:
  - `src/app/api/trust/packets/route.ts`
  - `src/app/api/trust/packets/[id]/route.ts`
  - `src/app/api/trust/packets/[id]/export/route.ts`
- Trust inbox routes:
  - `src/app/api/trust/inbox/route.ts`
  - `src/app/api/trust/inbox/[id]/route.ts`
  - `src/app/api/trust/inbox/[id]/export/route.ts`
- Trust packet packaging logic:
  - `src/lib/trust/packets.ts`
  - `src/lib/trust/package-export.ts`
- Trust validation:
  - `src/lib/validation/trust.ts`

Current state summary:

- Trust packets support `INTERNAL_REVIEW` and `EXTERNAL_SHARE`.
- External-safe manifest content already exists for exports.
- External sharing is still export-centric, not room-centric.
- There is no buyer-facing trust room route, access request model, or engagement analytics model.

## Files Expected To Change

Minimal-safe-diff targets for this phase:

- `prisma/schema.prisma`
- `prisma/demo-seed.ts`
- `src/lib/validation/trust.ts`
- `src/lib/trust/packets.ts`
- `src/lib/trust/package-export.ts`
- `src/app/api/trust/packets/route.ts`
- `src/app/api/trust/packets/[id]/route.ts`
- `src/app/app/trust/page.tsx`
- `src/components/app/trust-packet-panel.tsx`
- `src/components/app/trust-inbox-detail-panel.tsx`
- `src/app/app/tools/page.tsx`
- `src/components/copilot-panel.tsx`
- `src/app/api/copilot/route.ts`
- New TrustOps internal operator surfaces under `src/app/app/trust/...`
- New buyer-facing room surfaces under `src/app/trust-room/...`
- New TrustOps API routes under `src/app/api/trust/...`
- New TrustOps helpers under `src/lib/trust/...`
- New tests covering trust-room publishing, request flow, and engagement summaries
- `.agents/skills/README.md`
- `.agents/skills/vantage-trust-room-publisher/SKILL.md`
- `.agents/skills/vantage-buyer-engagement-summary/SKILL.md`
- `.agents/skills/vantage-external-request-triage/SKILL.md`
- `docs/trust-experience-summary.md`
- `docs/trust-experience-qa-checklist.md`
- `docs/trust-experience-pr.md`

## Risks To Avoid

- Do not expose internal notes, reviewer comments, weak evidence, or unapproved artifacts in any external room or export.
- Do not destabilize the existing internal TrustOps packet, evidence map, questionnaire, or review queue workflows.
- Do not assume public access can reuse internal `/app` authentication flows.
- Do not overbuild public CMS behavior beyond buyer-facing packet delivery and request handling.
- Do not break tenant scoping, audit logging, or current export behavior while adding room publishing.
- Do not overwrite protected in-progress demo-polish changes; extend them carefully if they must be touched.

## Items Intentionally Untouched

- Public marketing-site behavior outside the product app
- Non-TrustOps module architecture in Pulse, Response Ops, and AI Governance
- Billing and packaging logic outside current entitlement-aware patterns
- Generic portal automation not tied to durable TrustOps workflows
- Heavy PDF-specific work beyond current HTML/Markdown/JSON export support
