# Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install deps: `npm install`.
3. Run migrations: `npm run prisma:migrate`.
4. Seed baseline templates: `npm run prisma:seed`.
5. Start app: `npm run dev`.

Deploy target: Netlify for web + Neon/Supabase for Postgres.
