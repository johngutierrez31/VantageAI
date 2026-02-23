# Owner Runbook (Simple)

This is the easy version.
Follow steps in order. Do not skip around.

## Big Picture

- Phase A = get app working now on Netlify URL.
- Phase B = switch to `app.vantageciso.com` later.

Current working URL:
`https://fabulous-twilight-a84549.netlify.app`

Future URL:
`https://app.vantageciso.com`

---

## Phase A: Get It Working Now

### Step 1: Open project

```powershell
cd C:\Users\JohnC\Desktop\VantageAI\VantageAI
```

### Step 2: Create `.env` locally

```powershell
Copy-Item .env.example .env
notepad .env
```

Put plain `KEY=VALUE` lines in `.env` (do not include markdown dashes/backticks):

```env
NEXTAUTH_URL=http://localhost:3000
APP_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vantageciso
AUTH_SECRET=replace-me
NEXTAUTH_SECRET=replace-me
```

Optional for Copilot + RAG features:

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

Generate secrets (run twice) and replace `AUTH_SECRET` + `NEXTAUTH_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste first output into `AUTH_SECRET`.
Paste second output into `NEXTAUTH_SECRET`.

### Step 3: Install + database setup

```powershell
cmd /c npm install
cmd /c npm run prisma:migrate
cmd /c npm run prisma:seed
```

### Step 4: Run app

```powershell
cmd /c npm run dev
```

Open:
`http://localhost:3000/login`

Use email:
`admin@vantageciso.local`

If email service is not configured yet, use magic link printed in terminal logs.

### Step 5: Test core app flow

- Open `/app/templates`
- Create assessment in `/app/assessments/new`
- In assessment page:
- Add evidence
- Run questionnaire preview + apply
- Generate report
- Export HTML/Markdown/JSON
- Open `/app/copilot` and verify AI response

### Step 6: Quality checks

```powershell
cmd /c npm test
cmd /c npx tsc --noEmit
cmd /c npm run lint
cmd /c npm run build
```

If all pass, Phase A is done.

---

## Phase A (Netlify Variables)

In Netlify -> `Site configuration` -> `Environment variables`, set:

Important before setting vars:

- Use a dedicated Netlify site for this app repo (`VantageAI`).
- Do not attach `app.vantageciso.com` to the main marketing site.
- Keep root/main DNS records (`@`, `www`) pointing to your main site.

Required now:

- `NEXTAUTH_URL=https://fabulous-twilight-a84549.netlify.app`
- `APP_BASE_URL=https://fabulous-twilight-a84549.netlify.app`
- `DATABASE_URL=...`
- `AUTH_SECRET=...`
- `NEXTAUTH_SECRET=...`
- `OPENAI_API_KEY=...` (required for `/app/copilot` and AI draft features)
- `OPENAI_MODEL=gpt-4o-mini` (optional override)

Add later when ready:

- `AUTH_EMAIL_FROM=...`
- `RESEND_API_KEY=...`
- `STRIPE_SECRET_KEY=...`
- `STRIPE_WEBHOOK_SECRET=...`
- `STRIPE_PRICE_STARTER=...`
- `STRIPE_PRICE_PRO=...`
- `STRIPE_PRICE_PARTNER=...`

After changing variables, redeploy.

---

## Phase B: Switch To Subdomain Later

Only do this after Phase A is stable.

### Step 1: DNS

In Squarespace DNS, add:

- Type: `CNAME`
- Host: `app`
- Value: `fabulous-twilight-a84549.netlify.app`

Do not create URL forwarding for `app`.

### Step 2: Netlify custom domain

In Netlify -> `Domain management`:

- Ensure `app.vantageciso.com` is attached to the app Netlify site (not the main site).
- Add custom domain: `app.vantageciso.com`
- Wait for domain verification
- Wait for HTTPS certificate active

### Step 3: Change Netlify env vars

Replace values:

- `NEXTAUTH_URL=https://app.vantageciso.com`
- `APP_BASE_URL=https://app.vantageciso.com`

Redeploy.

### Step 4: Stripe webhook URL

Set webhook endpoint to:

`https://app.vantageciso.com/api/stripe/webhook`

Events to include:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## Quick Rule

- If subdomain is not live yet, keep using Netlify URL values.
- If subdomain is live and HTTPS works, switch both URL vars to subdomain.

---

## My Progress Checklist

- [ ] Phase A setup complete
- [ ] I can login
- [ ] I can create template/assessment
- [ ] Evidence flow works
- [ ] Questionnaire import works
- [ ] Report generation/export works
- [ ] Test/type/lint/build all pass
- [ ] DNS for `app.vantageciso.com` created
- [ ] Netlify domain + HTTPS active
- [ ] Switched env vars to subdomain
- [ ] Stripe webhook moved to subdomain

---

## Deploy To Completion (Exact Order)

1. Finish local validation:
- [ ] I can login locally with magic link.
- [ ] Core flow works (`/app/templates`, assessment, evidence, questionnaire, report export).
- [ ] `npm test`, `tsc --noEmit`, `npm run lint`, `npm run build` pass.

2. Push code:
- [ ] Commit/push local changes (never commit `.env`).

3. App Netlify site:
- [ ] Create/import a dedicated Netlify site from this repo.
- [ ] Framework: Next.js, build command: `npm run build`.
- [ ] Do not use static export publish directory (`out`).

4. App site env vars (initial):
- [ ] `NEXTAUTH_URL=https://fabulous-twilight-a84549.netlify.app`
- [ ] `APP_BASE_URL=https://fabulous-twilight-a84549.netlify.app`
- [ ] `DATABASE_URL=<hosted db url>` (not localhost)
- [ ] `AUTH_SECRET=...`
- [ ] `NEXTAUTH_SECRET=...`
- [ ] `OPENAI_API_KEY=...`
- [ ] `OPENAI_MODEL=gpt-4o-mini` (optional)

5. Hosted DB prep (for deployed env):
- [ ] Run `prisma migrate deploy` against hosted DB.
- [ ] Run seed against hosted DB.

6. Deploy and verify app URL:
- [ ] Deploy app Netlify site.
- [ ] Confirm `https://fabulous-twilight-a84549.netlify.app/login` works.

7. Move subdomain:
- [ ] DNS `app` CNAME -> app site Netlify URL.
- [ ] In app site, add `app.vantageciso.com`.
- [ ] Wait for SSL active.

8. Final URL switch:
- [ ] Update app site env vars:
- [ ] `NEXTAUTH_URL=https://app.vantageciso.com`
- [ ] `APP_BASE_URL=https://app.vantageciso.com`
- [ ] Redeploy.

9. Final validation:
- [ ] Confirm `https://app.vantageciso.com/login` serves this app directly.
- [ ] Confirm login and core flow on subdomain.
