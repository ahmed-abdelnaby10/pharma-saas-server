# Project: SaaS Pharmacy Management Backend

## Stack

- Express
- TypeScript
- Prisma
- PostgreSQL
- Redis

## Architecture

- Modular monolith only
- Keep strict separation:
  - `src/core`
  - `src/shared`
  - `src/modules/platform`
  - `src/modules/tenant`
  - `src/routes`
- Controllers stay thin
- Services contain business logic and orchestration
- Repositories contain Prisma access only
- Shared must stay generic and domain-agnostic

## Core domain rules

- Platform and tenant domains must remain separate
- Tenant-owned data must always be scoped by `tenantId`
- Branch-scoped operational data must include `branchId` where relevant
- Never trust `tenantId` from request body on tenant routes
- Use i18n for backend response messages
- Use idempotency for critical write flows
- Use numeric/decimal for money
- Use transactions for critical writes

## Docs and Postman rules

- Maintain docs under `docs/<module-name>/`
- Maintain one Postman collection per module under `postman/`
- A slice is not done unless code, docs, and Postman are updated together

## Required docs content

Each module doc should explain:

- purpose
- dependencies
- endpoints
- headers
- params
- body
- response shape
- permissions
- tenant/branch scope
- side effects
- related modules

## Required Postman content

For each implemented endpoint include:

- method
- URL
- headers
- auth requirements
- path params
- query params
- request body examples
- alternate body examples if relevant
- idempotency header if relevant
- tenant/branch context if relevant

## Slice workflow

For every slice:

1. First state:
   - purpose
   - dependencies
   - touched files
   - schema impact
   - API impact
2. Then implement only that slice
3. End with:
   - what was done
   - files changed
   - commands to run
   - manual test steps
   - known gaps
   - completion checklist

## Progression rule

- Do not jump ahead unless I say `next`
- Assume previous slice is complete and accepted when I say `next`
- Do not reopen old slices unless asked

## Roadmap order

Phase 0 — Foundation

- bootstrap
- config
- prisma
- redis
- i18n
- shared errors
- middlewares
- auth base
- tenant context
- normalized responses

Phase 1 — SaaS Core

- platform auth
- plans
- tenants
- subscriptions
- trial support
- usage/limits base
- feature overrides base

Phase 2 — Tenant Access Control

- tenant auth
- branches
- users
- roles
- permissions
- tenant settings

Phase 3 — Pharmacy Core

- global catalog
- suppliers
- inventory
- inventory batches
- stock movements
- purchasing

Phase 4 — Sales

- shifts
- POS
- sales
- payments
- receipt logic
- sales returns

Phase 5 — Intelligence

- alerts
- reports
- dashboard
- analytics summaries

Phase 6 — OCR

- OCR document flow
- invoice OCR
- prescription OCR
- review workflow

Phase 7 — Platform Operations

- platform invoices
- support
- metrics
- audit explorer
- admin dashboard analytics

## Feature dependency map

- plans -> tenants -> subscriptions
- tenant auth -> branches -> RBAC
- settings -> POS / alerts / i18n / VAT
- catalog -> inventory -> purchasing -> POS
- inventory batches -> expiry -> reports -> alerts
- shifts -> POS -> reports
- OCR -> purchasing / prescriptions
- subscriptions / feature overrides / usage -> access control
- audit logs cross-cut all sensitive modules

## Current checkpoint

Codex already completed:

- Phase 1, Slice 6: plans module

Assume the repo state already includes the plans module and continue from there.

## Next expected slice

- Phase 1, Slice 7: tenants module
