# Support

## Purpose

Bidirectional support ticket system. Tenant users submit tickets; platform admins triage, assign, and resolve them. Status lifecycle: `OPEN → IN_PROGRESS → RESOLVED / CLOSED`.

## Dependencies

- `authMiddleware`, `tenantMiddleware` — tenant endpoints
- `authMiddleware`, `platformMiddleware` — platform admin endpoints
- `SupportTicket` Prisma model; `Tenant`, `TenantUser` foreign keys

## Tenant Endpoints (`/tenant/support/tickets`)

### `POST /tenant/support/tickets`

Submit a new support ticket.

**Body**

| Field | Type | Required | Default |
|---|---|---|---|
| `subject` | string (5–200) | ✅ | — |
| `description` | string (10–5000) | ✅ | — |
| `category` | `BILLING \| TECHNICAL \| GENERAL \| FEATURE_REQUEST` | ❌ | GENERAL |
| `priority` | `LOW \| MEDIUM \| HIGH \| URGENT` | ❌ | MEDIUM |

**Response `201`** — ticket with `status: OPEN`.

### `GET /tenant/support/tickets`

List the current tenant's tickets, newest first.

### `GET /tenant/support/tickets/:ticketId`

Get a single ticket (scoped to tenant). **Error `404`** if not found.

---

## Platform Admin Endpoints (`/platform/support/tickets`)

### `GET /platform/support/tickets`

List all tickets across tenants.

**Query Parameters**

| Param | Type | Description |
|---|---|---|
| `tenantId` | cuid | Filter by tenant |
| `status` | `OPEN \| IN_PROGRESS \| RESOLVED \| CLOSED` | Filter by status |
| `priority` | `LOW \| MEDIUM \| HIGH \| URGENT` | Filter by priority |
| `category` | `BILLING \| TECHNICAL \| GENERAL \| FEATURE_REQUEST` | Filter by category |

### `GET /platform/support/tickets/:ticketId`

Get a single ticket.

### `PATCH /platform/support/tickets/:ticketId/status`

Update ticket status, optionally add a resolution note.

**Body**

```json
{ "status": "RESOLVED", "resolutionNote": "Issue fixed in v2.1" }
```

Sets `resolvedAt` automatically when status is `RESOLVED` or `CLOSED`.

### `PATCH /platform/support/tickets/:ticketId/assign`

Assign a ticket to a platform admin (by their ID). Transitions status to `IN_PROGRESS`.

**Body**

```json
{ "assignedToId": "clx..." }
```

## Side Effects

- Assigning a ticket auto-sets `status → IN_PROGRESS`.
- Resolving/closing auto-sets `resolvedAt`.
- Tenant response shape omits `assignedToId` (internal platform field).

## Related Modules

- **Platform Invoices** — billing disputes may come in as BILLING tickets
