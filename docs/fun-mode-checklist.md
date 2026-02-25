# UI Mode Rollout Checklist

Use this checklist before merging or deploying default Academia mode and Fun Mode changes.

## 1) Prereqs

- [ ] `DATABASE_URL` points to the DB branch you are validating.
- [ ] Migrations are applied: `npx prisma migrate deploy`.
- [ ] Prisma client is generated: `npx prisma generate`.
- [ ] App runs locally: `npm run dev`.

## 2) Build Quality Gates

- [ ] Typecheck passes: `npx tsc --noEmit`.
- [ ] Lint passes: `npm run lint`.
- [ ] Tests pass: `npm run test`.
- [ ] Production build passes: `npx next build`.

Note: if `npm run build` fails with Prisma `EPERM` on Windows, stop `next dev` first and rerun.

## 3) Global Toggle Behavior

- [ ] Open any `/app/*` page and confirm topbar shows `Fun Mode: OFF`.
- [ ] Toggle on and confirm UI restyles immediately (no refresh needed).
- [ ] Refresh the page; confirm mode persists.
- [ ] Open a second route (`/app/templates`, `/app/assessments`) and confirm mode persists.
- [ ] Toggle off and confirm default theme returns immediately and on refresh.

## 4) Visual Regression Scan (Fun Mode ON)

- [ ] Background uses retro tiled texture.
- [ ] Buttons show Win95 bevel style and pressed state.
- [ ] Inputs/selects/textarea look inset.
- [ ] Cards show title-bar treatment and inset content surface.
- [ ] Tables show visible grid borders and alternating rows.
- [ ] Sidebar shows hit-counter panel + color-square block.
- [ ] Header shows marquee strip + construction stripe.
- [ ] Focus outline is dotted and keyboard visible.
- [ ] Links are blue/underlined, red on hover, purple visited.

## 5) Visual Regression Scan (Default Academia Mode)

- [ ] Background uses deep mahogany palette with subtle texture/vignette.
- [ ] Headings render in serif display style (Cormorant) and body copy in book serif style (Crimson).
- [ ] Buttons use brass styling (or crimson for destructive) and maintain visible keyboard focus rings.
- [ ] Cards show parchment-on-wood contrast and ornamental framing cues.
- [ ] Page headers show `Volume` label and decorative divider.
- [ ] Links are brass-toned and underlined with readable hover contrast.
- [ ] Form controls use card-toned surfaces, italic placeholders, and clear focus state.
- [ ] Fun Mode toggle still appears in top bar.

## 6) Route Coverage

- [ ] `/app/overview`
- [ ] `/app/templates`
- [ ] `/app/templates/[templateId]`
- [ ] `/app/assessments`
- [ ] `/app/assessments/[assessmentId]`
- [ ] `/app/evidence`
- [ ] `/app/questionnaires`
- [ ] `/app/questionnaires/[id]`
- [ ] `/app/trust`
- [ ] `/app/trust/inbox`
- [ ] `/app/trust/inbox/[id]`
- [ ] `/app/reports`
- [ ] `/app/copilot`
- [ ] `/app/policies`
- [ ] `/app/settings/members`
- [ ] `/app/settings/billing`

## 7) Policy Generator Smoke Test

- [ ] Open `/app/policies` without runtime Zod error.
- [ ] Catalog renders with non-empty template list.
- [ ] Filter/search still works.
- [ ] Generate action returns a response for at least one template.

## 8) Deploy Checklist

- [ ] Netlify env vars are correct for target domain (`NEXTAUTH_URL`, `APP_BASE_URL`, `DATABASE_URL`, auth/email keys).
- [ ] Trigger deploy with clear cache if Prisma/generated client changed.
- [ ] Verify production route `/app/policies` and one assessment route load.
- [ ] Validate magic link sign-in end to end in production.
