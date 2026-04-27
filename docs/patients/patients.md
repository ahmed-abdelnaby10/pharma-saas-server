# Patients Module

## Purpose

Tenant-scoped patient registry. Patients can be optionally linked to sales at the point of dispensing and to prescriptions. All fields except `fullName` are optional to support walk-in customers.

## Dependencies

- `authMiddleware`, `tenantMiddleware` — all routes require tenant JWT
- `Patient` Prisma model
- `Sale` — `patientId` optional FK on Sale
- `Prescription` — `patientId` optional FK on Prescription

---

## Endpoints

### `GET /tenant/patients`

List patients for the authenticated tenant.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `isActive` | `true\|false` | Filter by active status (omit for all) |
| `search` | string | Case-insensitive partial match on `fullName`, `phone`, `email`, `nationalId` |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "tenantId": "clx...",
      "fullName": "Ahmed Hassan",
      "dateOfBirth": "1985-03-15T00:00:00.000Z",
      "phone": "+201001234567",
      "email": "ahmed@example.com",
      "nationalId": "28503151234567",
      "gender": "MALE",
      "notes": "Allergic to penicillin",
      "isActive": true,
      "createdAt": "2026-04-28T09:00:00.000Z",
      "updatedAt": "2026-04-28T09:00:00.000Z"
    }
  ],
  "meta": { "count": 1 }
}
```

---

### `GET /tenant/patients/:patientId`

Get a single patient by ID.

**Error `404`** — patient not found or belongs to a different tenant.

---

### `POST /tenant/patients`

Create a new patient.

**Body:**
```json
{
  "fullName": "Ahmed Hassan",
  "dateOfBirth": "1985-03-15T00:00:00.000Z",
  "phone": "+201001234567",
  "email": "ahmed@example.com",
  "nationalId": "28503151234567",
  "gender": "MALE",
  "notes": "Allergic to penicillin"
}
```

| Field | Required | Notes |
|---|---|---|
| `fullName` | ✅ | Max 200 chars |
| `dateOfBirth` | ❌ | ISO datetime |
| `phone` | ❌ | Max 30 chars |
| `email` | ❌ | Valid email |
| `nationalId` | ❌ | Must be unique per tenant if provided |
| `gender` | ❌ | `MALE`, `FEMALE`, `OTHER` |
| `notes` | ❌ | Max 2000 chars |

**Error `409`** — `nationalId` already registered for this tenant.

**Response `201`** — created patient object.

---

### `PATCH /tenant/patients/:patientId`

Update any subset of patient fields. Partial update — omitted fields unchanged.

**Error `404`** — patient not found.  
**Error `409`** — new `nationalId` already taken.

---

### `DELETE /tenant/patients/:patientId`

Soft-delete — sets `isActive: false`. Patient history (sales, prescriptions) is preserved.

**Response `200`** — patient object with `isActive: false`.

---

## Tenant / User Scope

All queries are scoped by `tenantId` from JWT. Users never access patients from another tenant.

## Side Effects

None on read. `POST` creates a patient record. `PATCH` updates it. `DELETE` soft-deletes.

## Related Modules

- **Sales (POS)** — `POST /tenant/pos` accepts optional `patientId`
- **Prescriptions** — prescriptions may be linked to a patient via `patientId`
