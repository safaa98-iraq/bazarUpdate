# StoreBuilder — Quick Start

## Prerequisites
- Node.js 18+
- Docker + Docker Compose
- A Stripe account (test keys)

## 1. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials (Stripe keys, etc.)
```

## 2. Start database

```bash
docker compose up -d
# PostgreSQL → localhost:5432
# Redis     → localhost:6379
# Adminer   → http://localhost:8080
```

## 3. Install dependencies

```bash
npm install
```

## 4. Push schema and seed

```bash
npm run db:push    # applies schema to Postgres
npm run db:seed    # creates super admin + demo merchant
```

Seed credentials:
- **Super Admin**: admin@storebuilder.com / Admin@123456
- **Demo Merchant**: merchant@demo.com / Merchant@123
- **Demo Store**: http://localhost:3000/store/demo-store

## 5. Start dev servers

```bash
npm run dev
# API  → http://localhost:4000
# Web  → http://localhost:3000
```

## Portals

| Portal | URL | Login |
|---|---|---|
| Landing page | http://localhost:3000 | — |
| Merchant register | http://localhost:3000/register | — |
| Merchant dashboard | http://localhost:3000/dashboard | merchant@demo.com |
| Super admin | http://localhost:3000/admin | admin@storebuilder.com |
| Demo storefront | http://localhost:3000/store/demo-store | — |

## Testing Stripe payments

Use Stripe test card: **4242 4242 4242 4242**, any future expiry, any CVC.

## Project structure

```
apps/api      Express backend  (port 4000)
apps/web      Next.js frontend (port 3000)
packages/database   Prisma schema + client
packages/types      Shared TypeScript types
```
