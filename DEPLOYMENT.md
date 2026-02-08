# Tuition Scheduler Deployment Guide (Vercel + Neon)

## 1. Tech Stack (Current Project)
- Frontend/Web: Next.js 14
- ORM: Prisma
- Database: PostgreSQL

This project is ready for deployment on Vercel with a managed PostgreSQL database (recommended: Neon).

## 2. Create Production Database (Neon)
1. Create a Neon project and production database.
2. Copy the connection string:
   - `DATABASE_URL`
   - `DIRECT_DATABASE_URL` (can be same value as `DATABASE_URL` initially)

Example:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
```

## 3. Configure Vercel Project
1. Import this repository into Vercel.
2. Framework preset: `Next.js`.
3. Build settings:
   - Install Command: `npm ci`
   - Build Command: `npx prisma generate && npm run build`

## 4. Required Environment Variables (Vercel)
Set these in Vercel Project Settings -> Environment Variables:

```env
DATABASE_URL=
DIRECT_DATABASE_URL=
MANAGER_EMAILS=admin1@yourdomain.com,admin2@yourdomain.com
OWNER_MANAGER_EMAIL=owner@yourdomain.com
CRON_SECRET=use_a_random_string_with_32+_chars
```

## 5. First-time Production Migration
Run once against production database:

```bash
npx prisma migrate deploy
npx prisma db seed
```

You can run this locally (pointing to production DB carefully) or through your CI/release workflow.

## 6. Vercel Cron Job
This repo includes `vercel.json` cron config:
- Path: `/api/cron/conflict-audit`
- Schedule: daily at `01:00 UTC`

Security:
- Keep `CRON_SECRET` set in Vercel.
- Route accepts `Authorization: Bearer <CRON_SECRET>` (Vercel cron compatible).

## 7. Domain Setup Recommendation
- `app.yourdomain.com` for staff (admin/teacher)
- `booking.yourdomain.com` for student booking links

## 8. Post-deploy Checklist
- Open `/admin/login` and verify staff login.
- Generate a booking link and verify `/booking/{token}`.
- Confirm cron endpoint is called successfully in Vercel logs.
- Verify DB backup policy in Neon is enabled.

## 9. Useful Commands
```bash
npm ci
npx prisma generate
npm run build
npm run start
```
