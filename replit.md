# ArthaSetu — Merchant Assurance Layer

## Overview
A production-ready fintech app demonstrating **offline payment trust scoring** with cryptographic proof, fraud detection, merchant decisions, and offline sync. Built as a pnpm monorepo.

## Architecture

### Stack
- **Frontend**: React + Vite (arthasetu-mal artifact) at port from `$PORT`
- **Backend**: Express 5 API server (api-server artifact) at port 8080
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **API Contract**: OpenAPI/Orval codegen (`lib/api-client-react`, `lib/api-zod`)
- **State Management**: React Query (TanStack Query)

### Monorepo Layout
```
artifacts/
  arthasetu-mal/    — React+Vite frontend (3-tab dashboard)
  api-server/       — Express 5 REST API
lib/
  db/               — Drizzle ORM schema + migrations
  api-client-react/ — Orval-generated React Query hooks
  api-zod/          — Orval-generated Zod schemas
```

## DB Schema
- **transactions** — txn_id, amount, customer/merchant info, status, signature, proof_strength, confidence_score, confidence_level, merchant_decision, fraud_flags[], score_breakdown[], network_mode
- **logs** — id, timestamp, level, message, txn_id
- **network_status** — id, mode (ONLINE|OFFLINE), updated_at
- **user_profiles** — customer_id, customer_name, success_count, failed_count, fraud_count, total_transactions, avg_amount, reliability_score, last_updated

## API Routes
```
GET  /api/health
GET  /api/transactions
POST /api/transactions
GET  /api/transactions/:txnId
POST /api/transactions/:txnId/decide  — merchant decisions
POST /api/fraud/simulate              — fraud simulation
POST /api/sync                        — offline sync
GET  /api/logs
POST /api/logs/clear
GET  /api/network/status
POST /api/network/status              — toggle ONLINE/OFFLINE
POST /api/demo/run                    — seeds cinematic demo data
GET  /api/profiles/:customerId
GET  /api/profiles/
```

## Frontend Components
- **CustomerPanel** — payment form + transaction history with "Why?" trust explainer
- **MerchantPanel** — pending/decided transactions with TrustBreakdown + UserTrustProfile per transaction, Accept/Reject/Accept-with-Risk controls
- **SystemPanel** — network toggle, sync engine, fraud simulator, recharts visualizations (score distribution bar, outcome pie, score trend line), live system logs, trust memory profiles list
- **TrustBreakdown** — animated ring, factor-by-factor breakdown with color-coded deltas
- **UserTrustProfile** — reliability ring, success/fraud/total/avg-amount stats
- **CinematicDemo** — 10-step animated modal overlay, auto-advancing, wires up demo API + sync + network toggle
- **Dashboard** — header with Demo button + network badge, 3-tab layout

## Trust Scoring Engine (`artifacts/api-server/src/lib/scoring.ts`)
Factors: Base (50) + Trust Memory (±25) + Established Customer (+5) + Amount Risk (−5 to −20) + Network Status (−15 offline) + Frequency (−20 rapid/+5 normal) + Proof Strength (±5)

Fully explainable — returns `score_breakdown[]` with label, delta, reason per factor.

## Key Design Decisions
- Transactions are UNCONFIRMED (not PENDING) when created offline — they have cryptographic proof but no bank confirmation
- `upsertUserProfile()` updates trust memory after sync — reliability score affects future transactions
- Score breakdown is stored in the DB so the frontend can render it without re-computing
- HMAC-SHA256 signature is generated at transaction time using txn_id + amount + customer_id + timestamp
- Fraud simulation inserts transactions with pre-set low scores and fraud flags

## Development
- API server: `pnpm --filter @workspace/api-server run dev` (port 8080)
- Frontend: `pnpm --filter @workspace/arthasetu-mal run dev` (port from $PORT)
- DB push: `cd lib/db && pnpm db:push`
- Codegen: Run Orval to regenerate `lib/api-client-react/src/generated/api.ts`
