# Initial SaaS Schema

## Purpose

Define the first SaaS core schema needed to onboard platform admins, tenants, plans, subscriptions, tenant settings, and tenant users before any pharmacy operational modules are introduced.

## Dependencies

- `prisma/schema.prisma`
- PostgreSQL
- Prisma Migrate
- Existing shared language enum usage (`PreferredLanguage`)

## Endpoints

No HTTP endpoints are added in this slice.

## Headers

None.

## Path Params

None.

## Query Params

None.

## Request Body

None.

## Response Shape

Not applicable in this slice.

## Validation Rules

- Money fields use `Decimal`, not float.
- `Plan.code` is unique.
- `TenantSettings` is one-to-one with `Tenant`.
- `TenantUser.email` is unique per tenant, not globally.
- `PlanFeature.featureKey` is unique per plan.

## Permissions Required

None in this slice.

## Tenant / Branch Scope Rules

- Shared-schema tenant isolation starts here with `tenantId` on tenant-owned tables.
- Branch-scoped operational tables are intentionally out of scope for this slice.

## Side Effects

- Introduces the initial SaaS schema migration under `prisma/migrations/20260415193000_init_saas_core/`.

## Related Modules

- Future `platform/auth`
- Future `platform/tenants`
- Future `platform/plans`
- Future `platform/subscriptions`
- Future `tenant/auth`
- Future `tenant/settings`
- Future `tenant/users`
