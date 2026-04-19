# Shifts Module

## Purpose

A shift is a cashier's work session at a branch. It gates POS sales — every sale transaction must reference an open shift. Opening records the cash float (`openingBalance`); closing records the actual cash counted (`closingBalance`) and stamps `closedAt`. Only one shift may be `OPEN` per branch at a time.

---

## Dependencies

- **`Branch`** — shift is scoped to a branch; must belong to tenant
- **`TenantUser`** — the cashier who opened the shift (`userId` taken from JWT)
- **Auth middleware** + **Tenant middleware** — all routes require a tenant-scoped JWT
- **POS / Sales** (future) — sales reference `shiftId`; only OPEN shifts accept new sales

---

## Endpoints

### `GET /tenant/shifts`

List shifts for a branch, newest first.

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `CUID` | **Yes** | Branch to query |
| `status` | `OPEN \| CLOSED` | No | Filter by status |
| `userId` | `CUID` | No | Filter by cashier |

**Response `200`** — array of shift objects.

---

### `GET /tenant/shifts/active`

Get the currently open shift for a branch. Returns `404` if no shift is open.

**Query Parameters**

| Param | Type | Required |
|-------|------|----------|
| `branchId` | `CUID` | **Yes** |

---

### `POST /tenant/shifts`

Open a new shift. The authenticated user becomes the cashier. Returns `409` if a shift is already open at the branch.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `CUID` | **Yes** | Branch to open shift at |
| `openingBalance` | `number` | **Yes** | Cash float at start (>= 0) |
| `notes` | `string \| null` | No | Opening notes |

**Response `201`**

```json
{
  "success": true,
  "message": "Shift opened",
  "data": {
    "id": "cuid",
    "tenantId": "cuid",
    "branchId": "cuid",
    "userId": "cuid",
    "user": { "id": "cuid", "fullName": "Ahmed Ali", "email": "ahmed@pharmacy.sa" },
    "status": "OPEN",
    "openingBalance": "500.00",
    "closingBalance": null,
    "notes": null,
    "openedAt": "2026-04-19T08:00:00.000Z",
    "closedAt": null,
    "createdAt": "2026-04-19T08:00:00.000Z",
    "updatedAt": "2026-04-19T08:00:00.000Z"
  }
}
```

**Errors**

| Code | Condition |
|------|-----------|
| `409 Conflict` | `shift.already_open` — branch already has an open shift |
| `403 Forbidden` | Branch does not belong to tenant |

---

### `GET /tenant/shifts/:shiftId`

Retrieve a single shift by ID.

---

### `POST /tenant/shifts/:shiftId/close`

Close the shift. Records `closingBalance`, sets `closedAt`, transitions status to `CLOSED`.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `closingBalance` | `number` | **Yes** | Actual cash counted at close (>= 0) |
| `notes` | `string \| null` | No | Closing notes |

**Response `200`** — updated shift with `status: "CLOSED"` and `closedAt` stamped.

**Errors**

| Code | Condition |
|------|-----------|
| `404 Not Found` | `shift.not_found` |
| `409 Conflict` | `shift.already_closed` |

---

## Permissions

All endpoints require a valid tenant JWT. The authenticated user's `userId` is used as the cashier ID when opening a shift.

---

## Tenant / Branch Scope

- Branch must belong to tenant on all operations.
- Only one `OPEN` shift is allowed per branch at a time (enforced in service).

---

## Side Effects

- None in this slice. POS/Sales (future) will validate shift is OPEN before creating a sale and link the sale to the shift.

---

## Related Modules

- **Branches** — shift is scoped to a branch
- **POS / Sales** (future) — sales reference `shiftId`; only OPEN shifts accept new sales
- **Reports** (future) — shift summary reports aggregate sales per shift
