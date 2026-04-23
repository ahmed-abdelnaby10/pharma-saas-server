# Audit Explorer

## Purpose

Read-only platform-admin interface for browsing the system-wide audit log. Every sensitive write operation across the application emits an `AuditLog` entry via the shared `logAudit()` utility (fire-and-forget). Platform admins can filter, paginate, and inspect these entries. The log is append-only — no entry is ever modified or deleted.

## Dependencies

- `authMiddleware`, `platformMiddleware` — all endpoints are platform-admin only
- `AuditLog` Prisma model
- `src/core/audit/audit-logger.ts` — shared writer used by other modules

## Shared Audit Logger

Other modules emit audit entries by importing and calling:

```typescript
import { logAudit } from "../../../core/audit/audit-logger";

logAudit({
  tenantId:   auth.tenantId,          // optional — omit for platform-level actions
  actorId:    auth.userId,
  actorType:  ActorType.TENANT_USER,  // or PLATFORM_ADMIN
  action:     "sale.create",
  resource:   "Sale",
  resourceId: sale.id,
  metadata:   { total: sale.totalAmount },
  ipAddress:  req.ip,
});
```

Errors are swallowed — audit failures never interrupt the main request.

## Platform Admin Endpoints (`/platform/audit`)

All endpoints require `Authorization: Bearer <platformToken>`.

---

### `GET /platform/audit`

List audit log entries, newest first, with cursor-based pagination.

**Query Parameters**

| Param | Type | Description |
|---|---|---|
| `tenantId` | cuid | Filter by tenant |
| `actorId` | string | Filter by actor (user/admin ID) |
| `actorType` | `PLATFORM_ADMIN \| TENANT_USER` | Filter by actor type |
| `action` | string | Partial match on action string (case-insensitive) |
| `resource` | string | Partial match on resource name (case-insensitive) |
| `dateFrom` | ISO 8601 datetime | Start of time range |
| `dateTo` | ISO 8601 datetime | End of time range |
| `cursor` | cuid | Cursor for next page (from previous response `nextCursor`) |
| `limit` | 1–100 | Page size (default: 50) |

**Response `200`**

```json
{
  "data": [
    {
      "id": "clx...",
      "tenantId": "clx...",
      "actorId": "clx...",
      "actorType": "TENANT_USER",
      "action": "sale.create",
      "resource": "Sale",
      "resourceId": "clx...",
      "metadata": { "total": "450.00" },
      "ipAddress": "192.168.1.10",
      "createdAt": "2026-04-23T12:00:00.000Z"
    }
  ],
  "meta": {
    "count": 50,
    "nextCursor": "clx..."
  }
}
```

`nextCursor` is `null` when there are no more results.

---

### `GET /platform/audit/:logId`

Get a single audit log entry by ID.

**Path Parameters**

| Param | Type | Required |
|---|---|---|
| `logId` | cuid | ✅ |

**Response `200`** — single log entry object.

**Error `404`** — if entry not found.

## Pagination Pattern

This endpoint uses cursor-based pagination:

1. Call `GET /platform/audit?limit=50` — receive first page + `nextCursor`
2. Call `GET /platform/audit?limit=50&cursor=<nextCursor>` — receive next page
3. When `nextCursor` is `null`, you have reached the end

## AuditLog Schema

| Field | Type | Description |
|---|---|---|
| `id` | cuid | Entry ID |
| `tenantId` | cuid? | Tenant context (null for platform-level actions) |
| `actorId` | string | ID of the user or admin who performed the action |
| `actorType` | enum | `PLATFORM_ADMIN` or `TENANT_USER` |
| `action` | string | Dot-namespaced action code (e.g. `sale.create`) |
| `resource` | string | Prisma model name (e.g. `Sale`) |
| `resourceId` | string? | ID of the affected record |
| `metadata` | JSON? | Freeform context (amounts, status transitions, etc.) |
| `ipAddress` | string? | Caller's IP address |
| `createdAt` | datetime | Immutable timestamp |

## Side Effects

None — read-only endpoints. Writes happen only via `logAudit()` called from other modules.

## Related Modules

All write-heavy modules are candidates for audit emission:
- **Auth** — login, token refresh
- **Tenants** — status changes
- **Subscriptions** — plan changes, status transitions
- **Platform Invoices** — issue, mark-paid, void
- **Support** — ticket assignment and resolution
- **Sales** — sale creation, returns
- **Inventory / Stock Movements** — adjustments
