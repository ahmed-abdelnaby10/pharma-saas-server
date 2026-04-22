# OCR Document Flow

## Purpose

Provides endpoints for uploading, querying, and triggering OCR processing on documents (invoices, prescriptions) within a tenant branch. Uploaded files are stored on disk and tracked in the database with status lifecycle (`PENDING → PROCESSING → COMPLETED / FAILED`). Invoice OCR processing is dispatched asynchronously via a BullMQ job queue — clients poll `GET /:documentId` to check status.

## Dependencies

- `authMiddleware` — validates JWT
- `tenantMiddleware` — injects `tenantId` from token
- `ocrUpload` — Multer disk storage middleware (max 10 MB; JPEG, PNG, WEBP, PDF)
- `BullMQ` + Redis — async job queue for OCR processing
- `OcrDocument` Prisma model
- `Tenant`, `Branch`, `TenantUser` models (foreign keys)

## Endpoints

### `GET /tenant/ocr/documents`

List OCR documents for a branch.

**Headers**

| Header | Required | Description |
|---|---|---|
| `Authorization` | ✅ | `Bearer <jwt>` |
| `Accept-Language` | ❌ | `en` (default) or `ar` |

**Query Parameters**

| Param | Type | Required | Description |
|---|---|---|---|
| `branchId` | `string (cuid)` | ✅ | Filter by branch |
| `documentType` | `INVOICE \| PRESCRIPTION` | ❌ | Filter by type |
| `status` | `PENDING \| PROCESSING \| COMPLETED \| FAILED` | ❌ | Filter by status |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "id": "clx...",
      "tenantId": "clx...",
      "branchId": "clx...",
      "documentType": "INVOICE",
      "status": "PENDING",
      "fileName": "invoice.pdf",
      "filePath": "uploads/ocr/1714000000000-invoice.pdf",
      "mimeType": "application/pdf",
      "fileSize": 204800,
      "errorMessage": null,
      "extractedData": null,
      "reviewedAt": null,
      "reviewedById": null,
      "createdAt": "2026-04-22T10:00:00.000Z",
      "updatedAt": "2026-04-22T10:00:00.000Z"
    }
  ],
  "meta": { "count": 1 }
}
```

---

### `GET /tenant/ocr/documents/:documentId`

Fetch a single OCR document by ID.

**Headers**

| Header | Required | Description |
|---|---|---|
| `Authorization` | ✅ | `Bearer <jwt>` |

**Path Parameters**

| Param | Type | Description |
|---|---|---|
| `documentId` | `string (cuid)` | OCR document ID |

**Response `200`**

```json
{
  "success": true,
  "message": "OK",
  "data": { ... }
}
```

**Error `404`** — document not found or belongs to different tenant.

---

### `POST /tenant/ocr/documents`

Upload a new OCR document. Uses `multipart/form-data`.

**Headers**

| Header | Required | Description |
|---|---|---|
| `Authorization` | ✅ | `Bearer <jwt>` |
| `Content-Type` | ✅ | `multipart/form-data` |

**Form Fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | ✅ | Document file (JPEG, PNG, WEBP, PDF; max 10 MB) |
| `branchId` | `string (cuid)` | ✅ | Target branch |
| `documentType` | `INVOICE \| PRESCRIPTION` | ✅ | Document category |

**Response `201`**

```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "id": "clx...",
    "status": "PENDING",
    ...
  }
}
```

**Error `400`** — file missing, invalid type, or oversized.

---

### `POST /tenant/ocr/documents/:documentId/process`

Enqueue an invoice document for async OCR processing. The document transitions `PENDING → PROCESSING → COMPLETED / FAILED` asynchronously. Poll `GET /:documentId` to check status.

**Headers**

| Header | Required | Description |
|---|---|---|
| `Authorization` | ✅ | `Bearer <jwt>` |

**Path Parameters**

| Param | Type | Description |
|---|---|---|
| `documentId` | `string (cuid)` | OCR document ID |

**Constraints**

- `documentType` must be `INVOICE`
- `status` must be `PENDING`

**Response `202`**

```json
{
  "success": true,
  "message": "OCR processing has been queued",
  "data": {
    "id": "clx...",
    "status": "PENDING",
    ...
  }
}
```

**Error `400`** — document type does not support OCR processing.  
**Error `409`** — document is not in PENDING status (already processing or done).

### Extracted Data Shape (on COMPLETED — Invoice)

```json
{
  "invoiceNumber": "INV-001",
  "invoiceDate": "2026-04-22",
  "supplierName": "Pharma Supplier Ltd",
  "supplierTaxId": "300-000-0000",
  "lineItems": [
    { "description": "Paracetamol 500mg × 100", "quantity": 10, "unitPrice": 5.0, "total": 50.0 }
  ],
  "subtotal": 50.0,
  "vatAmount": 7.5,
  "totalAmount": 57.5,
  "currency": "SAR",
  "confidence": 0.94
}
```

### Extracted Data Shape (on COMPLETED — Prescription)

```json
{
  "patientName": "Ahmed Al-Rashidi",
  "patientDateOfBirth": "1990-06-15",
  "doctorName": "Dr. Fatima Al-Zahraa",
  "doctorLicenseNumber": "SAH-00123",
  "prescriptionDate": "2026-04-22",
  "medications": [
    {
      "name": "Amoxicillin 500mg",
      "dosage": "500mg",
      "frequency": "Three times daily",
      "duration": "7 days",
      "quantity": 21,
      "instructions": "Take with food"
    }
  ],
  "notes": "Patient allergic to penicillin — verify before dispensing.",
  "confidence": 0.91
}
```

---

## Permissions

All endpoints require a valid tenant JWT. `tenantId` is always taken from the token — never from the request body.

## Tenant / Branch Scope

- All queries are scoped by `tenantId` from JWT.
- Documents are associated to a `branchId` provided in query/body.

## Side Effects

- `POST /` writes a file to `uploads/ocr/` on disk and creates an `OcrDocument` record with `status: PENDING`.
- File path stored as a relative path (relative to `process.cwd()`).
- `POST /:documentId/process` enqueues a BullMQ job on the `ocr` queue. The worker transitions status `PENDING → PROCESSING → COMPLETED / FAILED` and writes `extractedData`.

## Related Modules

- **Invoice OCR** (Slice 29) — processes `INVOICE` documents, populates `extractedData`
- **Prescription OCR** (Slice 30) — processes `PRESCRIPTION` documents
- **Review Workflow** (Slice 31) — allows staff to review and approve extracted data
- **Purchasing** — invoice OCR feeds into purchase orders
