# Owner Runbook Checklist

Use this file as your personal tracker for finishing setup, staging validation, and release readiness.

## Runbook Metadata

- [ ] Owner name:
- [ ] Date started:
- [ ] Target environment: `local` / `staging`
- [ ] Staging URL: `https://app.vantageciso.com`
- [ ] Branch name:
- [ ] Last commit SHA reviewed:

---

## 1. Local Environment Setup

### 1.1 Open project and create `.env`

- [ ] Open terminal in project root:
```powershell
cd C:\Users\JohnC\Desktop\VantageAI\VantageAI
```
- [ ] Copy environment template:
```powershell
Copy-Item .env.example .env
```
- [ ] Open `.env`:
```powershell
notepad .env
```
- [ ] Set these minimum values in `.env`:
- [ ] `DATABASE_URL`
- [ ] `NEXTAUTH_URL`
- [ ] `APP_BASE_URL`
- [ ] `AUTH_SECRET`
- [ ] `NEXTAUTH_SECRET`

### 1.2 Generate auth secrets

- [ ] Run command (first secret):
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
- [ ] Paste output into `AUTH_SECRET`.
- [ ] Run command again (second secret).
- [ ] Paste output into `NEXTAUTH_SECRET`.

### 1.3 Start PostgreSQL (Docker path)

- [ ] Install Docker Desktop (if not installed).
- [ ] Start DB container:
```powershell
docker run --name vantage-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=vantageciso -p 5432:5432 -d postgres:16
```
- [ ] If container already exists, start it:
```powershell
docker start vantage-postgres
```
- [ ] Confirm container is running:
```powershell
docker ps
```

### 1.4 Install and prepare app

- [ ] Install dependencies:
```powershell
cmd /c npm install
```
- [ ] Run migrations:
```powershell
cmd /c npm run prisma:migrate
```
- [ ] Seed baseline data:
```powershell
cmd /c npm run prisma:seed
```
- [ ] Start app:
```powershell
cmd /c npm run dev
```
- [ ] Open app:
`http://localhost:3000`

---

## 2. First Login and Access Validation

### 2.1 Login flow (seeded user)

- [ ] Go to `http://localhost:3000/login`.
- [ ] Use seeded email from `prisma/seed.ts`: `admin@vantageciso.local`.
- [ ] Click `Send magic link`.
- [ ] If no Resend key is configured, copy magic link from terminal log and open in browser.
- [ ] Confirm redirect into app (`/app/templates`).

### 2.2 Membership gating checks

- [ ] Confirm authenticated access works for:
- [ ] `/app/templates`
- [ ] `/app/assessments`
- [ ] Confirm unauthenticated browser session is redirected to `/login`.
- [ ] Confirm protected API without auth returns `401`.

---

## 3. Product Workflow Smoke Test (UI)

### 3.1 Templates and assessments

- [ ] Open `/app/templates` and confirm templates are listed.
- [ ] Open `/app/assessments/new`.
- [ ] Create one assessment.
- [ ] Open new assessment detail page.

### 3.2 Evidence vault

- [ ] In `Evidence Vault`, submit one evidence item.
- [ ] Confirm item appears in list.
- [ ] Confirm ingestion status is `COMPLETED`.
- [ ] Confirm chunk count is greater than `0`.

### 3.3 Questionnaire import

- [ ] In `Questionnaire Import`, keep default CSV.
- [ ] Click `Preview mapping`.
- [ ] Confirm rows and match percentages appear.
- [ ] Click `Apply mappings`.
- [ ] Confirm success message with applied/skipped counts.

### 3.4 RAG draft generation

- [ ] In `ResponseEditor`, click `Generate with evidence` on one question.
- [ ] If plan does not allow AI, confirm gating error appears.
- [ ] If AI is enabled, confirm draft answer populates.
- [ ] If AI is enabled, confirm citations are shown.

### 3.5 Report generation and export

- [ ] Click `Generate report`.
- [ ] Export `HTML`.
- [ ] Export `Markdown`.
- [ ] Export `JSON`.
- [ ] Export `PDF` and verify plan gate behavior.

---

## 4. Provider Setup (Staging-Ready)

### 4.0 Subdomain provisioning (`app.vantageciso.com`)

- [ ] Confirm root domain ownership for `vantageciso.com`.
- [ ] In your DNS provider, create subdomain record for `app`.
- [ ] Preferred DNS setup:
- [ ] If hosting gives a CNAME target, add `CNAME` record:
`app -> <hosting-target>`
- [ ] If hosting requires A record(s), add those for `app`.
- [ ] Add custom domain `app.vantageciso.com` in hosting project settings.
- [ ] Wait until SSL certificate status is active.
- [ ] Verify URL loads:
`https://app.vantageciso.com`
- [ ] If DNS is managed in Cloudflare, ensure proxy mode matches hosting guidance.

### 4.1 Resend (magic-link email)

- [ ] Go to `https://resend.com/domains`.
- [ ] Add and verify sending domain.
- [ ] Create API key at `https://resend.com/api-keys`.
- [ ] Set env vars:
- [ ] `RESEND_API_KEY`
- [ ] `AUTH_EMAIL_FROM` (verified sender address)
- [ ] Restart app after env changes.

### 4.2 Stripe (subscriptions)

- [ ] Open Stripe test dashboard.
- [ ] Copy test secret key from `https://dashboard.stripe.com/test/apikeys`.
- [ ] Create recurring prices for Starter, Pro, Partner.
- [ ] Set env vars:
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PRICE_STARTER`
- [ ] `STRIPE_PRICE_PRO`
- [ ] `STRIPE_PRICE_PARTNER`

### 4.3 Stripe webhook

- [ ] Create webhook endpoint in Stripe:
`https://app.vantageciso.com/api/stripe/webhook`
- [ ] Subscribe to events:
- [ ] `checkout.session.completed`
- [ ] `customer.subscription.created`
- [ ] `customer.subscription.updated`
- [ ] `customer.subscription.deleted`
- [ ] Copy signing secret and set `STRIPE_WEBHOOK_SECRET`.
- [ ] Replay one event and confirm duplicate is handled safely.

### 4.4 Optional providers

- [ ] Optional: set `OPENAI_API_KEY` for semantic embeddings/RAG.
- [ ] Optional: set `S3_*` variables for object storage.

---

## 5. Staging Deploy Checklist

### 5.1 Deploy and env config

- [ ] Deploy app to staging host.
- [ ] Set staging env vars:
- [ ] `DATABASE_URL` (staging DB)
- [ ] `NEXTAUTH_URL=https://app.vantageciso.com`
- [ ] `APP_BASE_URL=https://app.vantageciso.com`
- [ ] Auth, Resend, Stripe vars from sections above.

### 5.2 Staging DB prep

- [ ] Run on staging:
```powershell
cmd /c npm run prisma:migrate
cmd /c npm run prisma:seed
```
- [ ] Confirm seed tenant/user/template data exists.

### 5.3 Staging auth test

- [ ] Login through staging URL.
- [ ] Confirm magic link delivery via real email.
- [ ] Confirm active membership user can access `/app/*`.
- [ ] Confirm user without active membership is denied.

---

## 6. Reliability and Data Verification

### 6.1 Automated checks

- [ ] Run tests:
```powershell
cmd /c npm test
```
- [ ] Run type-check:
```powershell
cmd /c npx tsc --noEmit
```
- [ ] Run lint:
```powershell
cmd /c npm run lint
```
- [ ] Run production build:
```powershell
cmd /c npm run build
```

### 6.2 Verify critical DB records

- [ ] Start Prisma Studio:
```powershell
cmd /c npx prisma studio
```
- [ ] Open `http://localhost:5555` (or shown URL).
- [ ] Confirm `AuditLog` contains actions for:
- [ ] template operations
- [ ] assessment response updates
- [ ] evidence ingestion
- [ ] report generation/export
- [ ] billing actions
- [ ] Confirm `BillingWebhookEvent` rows are created for Stripe events.

---

## 7. Release Readiness

- [ ] Capture open issues with severity + owner.
- [ ] Resolve blockers or explicitly defer with acceptance.
- [ ] Confirm product signoff.
- [ ] Confirm engineering signoff.
- [ ] Tag final commit/version for release candidate.

---

## 8. Progress Notes

- [ ] Note 1:
- [ ] Note 2:
- [ ] Note 3:

---

## 9. Final Completion

- [ ] I completed all required runbook steps.
- [ ] I can repeat setup and staging validation without missing information.
- [ ] Date completed:
