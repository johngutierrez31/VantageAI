# Setup

1. Copy `.env.example` to `.env` and fill required values:
   - `DATABASE_URL`
   - `AUTH_SECRET` (or `NEXTAUTH_SECRET`)
   - `NEXTAUTH_URL` / `APP_BASE_URL`
   - `AUTH_EMAIL_FROM` (+ `RESEND_API_KEY` for real email delivery)
   - Optional demo bypass: `DEMO_MODE=true` with `DEMO_USER_EMAIL`
2. Install dependencies: `npm install`.
3. Generate Prisma client: `npx prisma generate`.
4. Run migrations: `npm run prisma:migrate`.
5. Seed baseline tenant/template data: `npm run prisma:seed`.
6. Start the app: `npm run dev`.

## Optional providers

- OpenAI embeddings/RAG/Copilot: set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`, default `gpt-4o-mini`).
- S3-compatible object storage: set `S3_*` values.
- Stripe billing: set `STRIPE_*` values and configure webhook endpoint `/api/stripe/webhook`.

## Demo mode (optional)

- Set `DEMO_MODE=true` to bypass auth/magic-link and run app/API as the user in `DEMO_USER_EMAIL`.
- Keep `DEMO_MODE=false` in production.
