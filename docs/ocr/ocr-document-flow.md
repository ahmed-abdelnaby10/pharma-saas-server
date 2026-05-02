# OCR Document Flow

## Purpose

Provides endpoints for uploading, querying, and triggering OCR processing on documents (invoices, prescriptions) within a tenant branch. Uploaded files are stored on disk and tracked in the database with status lifecycle (`PENDING → PROCESSING → COMPLETED / FAILED`). OCR processing is dispatched asynchronously via a BullMQ job queue — clients poll `GET /:documentId` to check status.

---

## OCR Engine

**Provider:** Anthropic Claude Vision (`claude-opus-4-7`)

Both invoice and prescription documents are processed by dedicated extractor classes:

| Document type | Extractor class |
|---|---|
| `INVOICE` | `AnthropicInvoiceExtractor` |
| `PRESCRIPTION` | `AnthropicPrescriptionExtractor` |

**How it works:**
1. The BullMQ worker reads the file from disk and base64-encodes it.
2. PDFs are sent as `document` content blocks (`media_type: application/pdf`); images (JPEG, PNG, WEBP) as `image` content blocks.
3. Claude is given a domain-specific system prompt and asked to return a strict JSON object matching the extraction schema.
4. The response is validated against a Zod schema via `messages.parse()` — if Claude returns unexpected structure the job fails and retries.
5. The validated object is stored in `extractedData` on the `OcrDocument` record.

**Confidence field:** Every extracted document includes a `confidence` float (0–1) set by the model:
- `1.0` — all fields clearly readable
- `0.7–0.9` — most fields extracted; some may be inferred
- `< 0.5` — document is unclear or partially legible; human review strongly recommended
- `0` — stub/dev mode only (real extractor never returns 0)

**Cost optimisation:** The system prompts are marked with `cache_control: ephemeral` — Anthropic caches them across calls, reducing input token cost on repeated OCR runs.

**Environment requirement:**
```
ANTHROPIC_API_KEY=sk-ant-...    # required; worker fails at startup if absent
```

---

## Dependencies

- `authMiddleware` — validates JWT
- `tenantMiddleware` — injects `tenantId` from token
- `ocrUpload` — Multer disk storage middleware (max 10 MB; JPEG, PNG, WEBP, PDF)
- `BullMQ` + Redis — async job queue for OCR processing
- `@anthropic-ai/sdk` — Anthropic TypeScript SDK (Claude Vision)
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

- `documentType` must be `INVOICE` or `PRESCRIPTION`
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

### `POST /tenant/ocr/documents/:documentId/review`

Mark an OCR-completed document as reviewed by the current user. Optionally provide `correctedData` to override `extractedData`.

**Headers**

| Header | Required | Description |
|---|---|---|
| `Authorization` | ✅ | `Bearer <jwt>` |
| `Content-Type` | ✅ | `application/json` |

**Path Parameters**

| Param | Type | Description |
|---|---|---|
| `documentId` | `string (cuid)` | OCR document ID |

**Body**

```json
{
  "correctedData": { ... }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `correctedData` | `object` | ❌ | Corrected extracted data to store |

**Constraints**

- `status` must be `COMPLETED`
- `reviewedAt` must be `null` (not previously reviewed)

**Response `200`**

```json
{
  "success": true,
  "message": "Document reviewed successfully",
  "data": {
    "id": "clx...",
    "status": "COMPLETED",
    "reviewedAt": "2026-04-22T12:00:00.000Z",
    "reviewedById": "clx...",
    "extractedData": { ... },
    ...
  }
}
```

**Error `400`** — document is not in COMPLETED status.  
**Error `409`** — document has already been reviewed.

---

## Permissions

All endpoints require a valid tenant JWT. `tenantId` is always taken from the token — never from the request body.

## Tenant / Branch Scope

- All queries are scoped by `tenantId` from JWT.
- Documents are associated to a `branchId` provided in query/body.

## Side Effects

- `POST /` writes a file to `uploads/ocr/` on disk and creates an `OcrDocument` record with `status: PENDING`.
- File path stored as a relative path (relative to `process.cwd()`).
- `POST /:documentId/process` enqueues a BullMQ job on the `ocr` queue. The worker transitions status `PENDING → PROCESSING → COMPLETED / FAILED`, calls the Anthropic Claude Vision extractor, and writes `extractedData`.
- `POST /:documentId/review` stamps `reviewedAt` + `reviewedById` on the document. Optionally overwrites `extractedData` if `correctedData` is provided.

## Worker Behaviour

The BullMQ worker (`startOcrInvoiceWorker`) processes both `INVOICE` and `PRESCRIPTION` jobs on the `ocr` queue with concurrency 3 and up to 2 automatic retries on transient failures (e.g. Anthropic API timeout).

**Job failure path:**
- Status transitions to `FAILED`
- `errorMessage` is set to the caught error message
- BullMQ retries up to 2 times with exponential backoff before giving up

**Low-confidence results:**
- The job still completes with `status: COMPLETED`
- `extractedData.confidence` below ~0.6 is a signal to the frontend to prompt the user for manual review via `POST /:documentId/review`

## Related Modules

- **Purchasing** — invoice OCR `extractedData` can be used to pre-fill a purchase order
- **Notifications** — future: `OCR_COMPLETED` / `OCR_FAILED` notification types are reserved in the `NotificationType` enum for push to user inbox once wired
- **Anthropic SDK** — `@anthropic-ai/sdk` v0.91+; extractor classes in `src/modules/tenant/ocr/extractor/`
