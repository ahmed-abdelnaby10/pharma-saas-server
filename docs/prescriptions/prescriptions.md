# Prescriptions Module

## Purpose

Tenant + branch scoped prescription registry. Prescriptions track doctor-issued medication orders and can be manually created, linked to an OCR document, and dispensed by linking to a completed sale.

**Status lifecycle:** `PENDING → DISPENSED` (via dispense) or `PENDING → CANCELLED`.

## Dependencies

- `authMiddleware`, `tenantMiddleware` — all routes require tenant JWT
- `Prescription`, `PrescriptionItem` Prisma models
- `Patient` — optional FK (prescriptions can exist without a registered patient)
- `Sale` — linked on dispense; enforces one-prescription-per-sale uniqueness
- `Branch` — branch membership validated on create

---

## Endpoints

### `GET /tenant/prescriptions`

List prescriptions for the tenant.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `branchId` | cuid | Filter by branch |
| `patientId` | cuid | Filter by patient |
| `status` | `PENDING\|DISPENSED\|CANCELLED` | Filter by status |
| `search` | string | Partial match on `prescriptionNumber`, `doctorName`, `doctorLicense`, or any `items.drugName` |

---

### `GET /tenant/prescriptions/:prescriptionId`

Get single prescription with all items.

**Error `404`** — not found or different tenant.

---

### `POST /tenant/prescriptions`

Create a prescription manually.

**Body:**
```json
{
  "branchId": "clx...",
  "patientId": "clx...",
  "prescriptionNumber": "RX-20260428-001",
  "doctorName": "Dr. Amr Khaled",
  "doctorLicense": "LIC-12345",
  "issuedAt": "2026-04-28T09:00:00.000Z",
  "notes": "Take with food",
  "items": [
    {
      "drugName": "Amoxicillin 500mg",
      "quantity": 21,
      "dosageInstructions": "1 capsule three times daily for 7 days"
    }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `branchId` | ✅ | Must belong to tenant |
| `items` | ✅ | At least one item |
| `patientId` | ❌ | Must belong to tenant if provided |
| All other fields | ❌ | |

**Response `201`** — prescription with items.

---

### `PATCH /tenant/prescriptions/:prescriptionId`

Update a `PENDING` prescription. If `items` is provided, existing items are replaced entirely.

**Error `400`** — prescription is not `PENDING`.

---

### `POST /tenant/prescriptions/:prescriptionId/dispense`

Link a completed sale to this prescription and mark it `DISPENSED`.

**Body:**
```json
{ "saleId": "clx..." }
```

**Constraints:**
- Prescription must be `PENDING`
- Sale must belong to the same tenant
- A sale can only be linked to one prescription (`409` if already linked)

**Side effects:** Sets `status: DISPENSED`, `saleId`, `dispensedAt: now`.

---

### `DELETE /tenant/prescriptions/:prescriptionId`

Cancel a `PENDING` prescription. `DISPENSED` prescriptions cannot be cancelled (`400`). Cancelling an already-cancelled prescription is idempotent.

---

## Tenant / Branch Scope

All queries scoped by `tenantId` from JWT. `branchId` is set at creation and not changeable.

## Related Modules

- **Patients** — prescriptions optionally linked to a patient
- **Sales (POS)** — dispense links a sale to close out the prescription
- **OCR** — `ocrDocumentId` field reserved for future Phase 6 integration
