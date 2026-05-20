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
  "invoiceNumber": "184836",
  "invoiceDate": "2025-09-10",
  "supplierName": "الشمس فارم",
  "supplierTaxId": "2390900",
  "lineItems": [
    {
      "description": "فيسيرالجين اقراص سيديكو س ج",
      "nameEn": "Viseralgine tablets (Metamizole)",
      "quantity": 1,
      "unitPrice": 42.0,
      "discountPercent": 29,
      "total": 29.82,
      "batchNumber": "1024552",
      "expiryDate": "2027-10-01"
    }
  ],
  "subtotal": 454.9,
  "vatAmount": null,
  "totalAmount": 1322.279,
  "currency": "EGP",
  "confidence": 0.94
}
```

**New line-item fields (Egyptian invoice support):**

| Field | Type | Description |
|-------|------|-------------|
| `nameEn` | `string \| null` | Gemini's English / generic drug name translation. Used as the primary catalog-match key so Arabic descriptions map to English catalog entries. |
| `discountPercent` | `number \| null` | Line discount % from `الخصم` column (e.g. `29` = 29%). Formula: `total = unitPrice × qty × (1 − discount/100)`. |
| `batchNumber` | `string \| null` | Lot number from `التشغيلة` column. Passed through `resolution[]` to pre-fill the receive step. |
| `expiryDate` | `string \| null` | Expiry date from `الصلاحية` column (ISO `YYYY-MM-DD`). Passed through `resolution[]` to pre-fill the receive step. |
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
    "autoCreatedSupplier": {
      "id": "clx...",
      "nameEn": "الشمس فارم",
      "nameAr": "الشمس فارم",
      "taxId": "2390900",
      "created": true
    }
  }
}
```

**`autoCreatedSupplier` field:**
- Present only when `documentType === INVOICE` and `extractedData.supplierName` is non-empty.
- `null` for prescription documents or when no supplier name was extracted.
- `created: true` — a new supplier record was inserted.
- `created: false` — a supplier with a matching name already existed; the existing record is returned so the frontend can link it.
- Supplier creation is **best-effort**: if it fails (e.g. DB error), the review still succeeds and `autoCreatedSupplier` is `null`.
- `nameEn` and `nameAr` are both set to the raw OCR value as a placeholder. Edit via `PATCH /tenant/suppliers/:id` to add a proper English name.

**Error `400`** — document is not in COMPLETED status.  
**Error `409`** — document has already been reviewed.

---

### `POST /tenant/ocr/documents/:documentId/to-purchase-order`

One-shot bridge: turn a **COMPLETED INVOICE** document into a purchase order and — optionally — immediately receive all stock into inventory.

**Per line item the service:**
1. Matches the OCR `description` + `nameEn` (English translation) against the catalog (ACTIVE globally, or this tenant's own PENDING_REVIEW).
2. If no match → creates a `PENDING_REVIEW` catalog item (crowdsource flow) attributed to the tenant.
3. Finds the branch `InventoryItem` for that catalog item, or creates one.
4. Merges duplicate descriptions (same resolved inventory item) so the PO has no duplicate lines.

Then creates a DRAFT PO with `externalId = ocr:<documentId>` (data-level idempotency), adds one line per merged item with all OCR pricing fields (`unitCost`, `originalUnitPrice`, `discountPercent`, `batchNumber`, `expiryDate`), and stamps the OCR document as reviewed.

**Idempotent:** calling it again for the same document returns the existing PO (`200`, `alreadyConverted: true`) instead of creating a duplicate.

**Body (all optional):**
| Field               | Type         | Description |
|---------------------|--------------|-------------|
| `branchId`          | cuid         | Target branch. Defaults to the OCR document's branch. |
| `supplierId`        | cuid \| null | Link the PO to a known supplier. |
| `defaultSellingPrice` | number     | `sellingPrice` set on any `InventoryItem` created on the fly (the price you charge patients — separate from the purchase cost). Omit to leave it `null` and set later. |
| `markOrdered`       | boolean      | Transition the PO `DRAFT → ORDERED`. |
| `autoReceive`       | boolean      | **Recommended for the standard OCR intake flow.** Transitions to `ORDERED` then immediately receives every line using the batch/expiry data from the OCR extraction. Inventory `quantityOnHand` is updated and the PO ends as `RECEIVED`. Items whose batch or expiry was not extracted get safe fallbacks (generated batch key; expiry 2 years from today). Implies `markOrdered`. |

**Typical UX call:** `{ "autoReceive": true, "supplierId": "<id>" }`

**Response `201`** (or `200` if already converted):
```json
{
  "success": true,
  "message": "Purchase order created from invoice",
  "data": {
    "purchaseOrder": {
      "id": "...",
      "status": "RECEIVED",
      "subtotalBeforeDiscount": "42.0000",
      "totalDiscount": "12.1800",
      "subtotal": "29.8200",
      "items": [
        {
          "quantityOrdered": "1.000",
          "quantityReceived": "1.000",
          "unitCost": "29.82",
          "originalUnitPrice": "42.00",
          "discountPercent": "29",
          "lineTotal": "29.8200",
          "lineTotalBeforeDiscount": "42.0000",
          "batchNumber": "1024552",
          "expiryDate": "2027-10-01T00:00:00.000Z"
        }
      ]
    },
    "alreadyConverted": false,
    "resolution": [
      {
        "description": "فيسيرالجين اقراص سيديكو س ج",
        "catalogItemId": "...", "catalogStatus": "ACTIVE", "catalogCreated": false,
        "inventoryItemId": "...", "inventoryCreated": true,
        "quantity": 1,
        "unitCost": 29.82,
        "originalUnitPrice": 42.0,
        "discountPercent": 29,
        "batchNumber": "1024552",
        "expiryDate": "2027-10-01"
      }
    ]
  }
}
```

**`resolution[]` field notes:**
- `unitCost` — price after discount (`unitPrice × (1 − discountPercent/100)`).
- `originalUnitPrice` — raw price before discount as printed on the invoice.
- `discountPercent` — percentage (e.g. `29` = 29%).
- `batchNumber` + `expiryDate` — from OCR; used automatically when `autoReceive: true`.

**Error `400`** — not an INVOICE, not COMPLETED, or no usable line items.

**Next step:** the PO is `DRAFT` (or `ORDERED` if `markOrdered`). The user still completes receiving via `POST /tenant/purchasing/orders/:id/receive` with batch numbers + expiry dates (OCR cannot extract those reliably).

---

### `POST /tenant/ocr/documents/:documentId/to-prescription`

One-shot bridge: turn a **COMPLETED PRESCRIPTION** document into a **PENDING Prescription** record, one item per extracted medication. Doctor name/license and prescription date are carried over; each medication's dosage/frequency/duration/instructions are combined into `dosageInstructions`.

**Body (all optional):**
| Field     | Type | Description                                       |
|-----------|------|---------------------------------------------------|
| branchId  | cuid | Target branch. Defaults to the OCR doc's branch.  |
| patientId | cuid | Link the prescription to an existing patient.     |

**Response `201`:** the created `Prescription` with items (`status: PENDING`). The OCR document is stamped reviewed.

**Error `400`** — not a PRESCRIPTION, not COMPLETED, or no usable medications.

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
- `POST /:documentId/to-purchase-order` may create catalog items (`PENDING_REVIEW`), inventory items, and a DRAFT/ORDERED purchase order; stamps the document reviewed. Idempotent via PO `externalId = ocr:<documentId>`.
- `POST /:documentId/to-prescription` creates a PENDING prescription with items; stamps the document reviewed.

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
