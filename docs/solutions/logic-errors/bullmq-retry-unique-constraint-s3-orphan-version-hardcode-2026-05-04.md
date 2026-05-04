---
title: "BullMQ retry exhausted by UNIQUE constraint when version is hardcoded and S3 upload precedes DB transaction"
date: 2026-05-04
category: logic-errors
module: "@hsm/worker"
problem_type: logic_error
symptoms:
  - "All 3 BullMQ retry attempts exhausted on document generation jobs after any transient DB failure"
  - "Document record permanently stuck in FAILED status despite S3 upload succeeding on every attempt"
  - "2-3 orphan S3 objects accumulate per failed job — one per retry attempt — with no corresponding DB record"
  - "PostgreSQL UNIQUE constraint violation on (document_id, version) appears on the second and third retry attempts"
  - "PROCESSING status update before the try block leaves document stranded at PROCESSING on early crashes"
root_cause: logic_error
resolution_type: code_fix
severity: critical
tags:
  - "bullmq"
  - "retry"
  - "idempotency"
  - "typeorm"
  - "unique-constraint"
  - "s3"
  - "minio"
  - "orphan-objects"
  - "document-generation"
  - "version-sequencing"
  - "distributed-transaction"
applies_when:
  - "A BullMQ processor writes to both S3 and a relational DB in the same job handler"
  - "The entity being inserted has a composite unique constraint that includes a sequential integer field (e.g. version)"
  - "The queue is configured with more than 1 attempt (default queue config: 3 attempts)"
---

# BullMQ retry exhausted by UNIQUE constraint when version is hardcoded and S3 upload precedes DB transaction

## Problem

A NestJS/BullMQ document generation processor had two compounding bugs: a hardcoded `version: 1` on an entity with a `@Unique(['document', 'version'])` constraint, and an S3 upload that preceded the DB transaction with no compensating delete in the catch path. On any transient DB failure, BullMQ retried the job — but every retry hit the UNIQUE constraint and burned remaining attempts, permanently failing documents and leaving orphaned S3 files.

## Symptoms

- All 3 BullMQ retry attempts exhausted on document generation jobs after any transient DB error (or phantom commit where TCP drops after COMMIT).
- Document records permanently stuck in `FAILED` status despite each S3 upload completing successfully.
- 2-3 orphan PDF/XLSX objects accumulating in S3/MinIO under document folder keys (e.g., `hcu-001/{uuid}.pdf`) with no corresponding `DocumentStorageObjectEntity` row.
- PostgreSQL logs a UNIQUE constraint violation on `(document_id, version)` on the second and third retry attempts — not on the first.
- `PROCESSING` status updates placed before the `try` block left documents stranded at `PROCESSING` on crashes that bypassed the catch handler.

## What Didn't Work

- **Reading only the BullMQ job failure message**: the surface error is a UNIQUE constraint violation, which looks like a data-integrity bug or duplicate job submission rather than a retry-safety problem. The underlying cause — a hardcoded sequential field — only becomes visible when you trace the full retry sequence.
- **Assuming "one document per job" made version=1 safe**: the field is only collision-free when exactly one attempt ever runs. BullMQ's retry mechanism makes every job a potential multi-attempt operation regardless of intent.
- **Assuming orphan objects would be caught by a periodic cleanup job**: no such job existed, so files accumulated silently with no signal to operators.

## Solution

### Fix 1 — Dynamic version number (eliminates the UNIQUE constraint violation on retry)

Query the maximum existing version for the document before inserting, and use `MAX + 1`. On the first-ever attempt there are no existing rows so `COALESCE(MAX, 0) + 1 = 1`. On each retry the previous attempt's row (if committed) acts as a floor and the next attempt uses `2`, `3`, etc.

**Before:**
```typescript
// apps/backend/worker/src/modules/core/docs/docs-processor.service.ts
const version = manager.create(DocumentsVersionEntity, {
  version: 1, // hardcoded — guaranteed UNIQUE violation on retry if prior row committed
  filename,
  mimeType: contentType,
  size: buffer.length,
  document: { id: data.documentId },
});
```

**After:**
```typescript
await this.docsRepo.manager.transaction(async manager => {
  // Query INSIDE the transaction with pessimistic lock — prevents concurrent jobs
  // for the same documentId from reading the same MAX before either INSERT commits.
  // getRawOne<T> is a compile-time cast only: PostgreSQL returns numeric aggregates as
  // strings, so <{ max: string }> is honest. Coerce explicitly with Number().
  const raw = await manager
    .createQueryBuilder(DocumentsVersionEntity, 'v')
    .setLock('pessimistic_write')
    .select('COALESCE(MAX(v.version), 0)', 'max')
    .where('v.documentId = :id', { id: data.documentId })
    .getRawOne<{ max: string }>();
  const nextVersion = Number(raw?.max ?? 0) + 1; // 1 on first attempt, 2 on retry

  const version = manager.create(DocumentsVersionEntity, {
    version: nextVersion,
    filename,
    mimeType: contentType,
    size: buffer.length,
    document: { id: data.documentId },
  });
  // ... rest of inserts
});
```

### Fix 2 — S3 orphan cleanup (compensates for the lack of distributed transactions)

Track the uploaded key in a variable accessible to the catch block. If the DB transaction fails, delete the orphan before rethrowing.

**Before:**
```typescript
// S3 upload succeeded, but if transaction below throws: orphan lives forever
const uploadResult = await this.s3Service.uploadFiles({ ... });
const { fileId, key } = uploadResult[0].files[0];
await this.docsRepo.manager.transaction(async manager => { ... }); // may throw
```

**After:**
```typescript
let uploadedKey: string | undefined;
let uploadedBucket: string | undefined;

try {
  // ... generation ...
  const uploadResult = await this.s3Service.uploadFiles({ ... });
  const { fileId, key } = uploadResult[0].files[0];
  uploadedKey = key;       // assigned before the transaction
  uploadedBucket = DOCS_BUCKET;

  await this.docsRepo.manager.transaction(async manager => { ... }); // may throw

  await this.docsRepo.update(data.documentId, { status: DocumentStatusEnum.COMPLETED });
} catch (err) {
  // Compensate: delete the uploaded S3 object before this job is retried
  if (uploadedKey && uploadedBucket) {
    try {
      await this.s3Service.deleteFiles({
        documents: [{
          bucket: uploadedBucket,
          files: [{ folderName: '', fileInfo: { fileId: uploadedKey } }],
        }],
      });
    } catch (cleanupErr) {
      this.logger.error(`Failed to clean up orphaned S3 object key="${uploadedKey}"`, cleanupErr);
    }
  }

  // Secondary failure must not mask original error
  try {
    await this.docsRepo.update(data.documentId, { status: DocumentStatusEnum.FAILED });
  } catch (updateErr) {
    this.logger.error(`Failed to mark document FAILED`, updateErr);
  }

  throw err; // always rethrow original so BullMQ can retry / dead-letter
}
```

### Fix 3 — PROCESSING update inside the try block

```typescript
// Before: outside try — DB failure here bypasses the catch handler entirely
await this.docsRepo.update(id, { status: DocumentStatusEnum.PROCESSING });
try { ... }

// After: inside try — any failure is caught and sets FAILED before rethrowing
try {
  await this.docsRepo.update(id, { status: DocumentStatusEnum.PROCESSING });
  // ...
} catch (err) { ... }
```

## Why This Works

**Bug 1** is a retry-idempotency failure. BullMQ retries are a first-class feature of the queue — every job handler must be safe to run multiple times. A hardcoded `version: 1` satisfies the unique constraint only when exactly one attempt ever runs. Querying `MAX(version)` and incrementing makes the version monotonically increasing across all attempts, so even if a prior attempt partially committed, the next attempt produces a distinct, non-conflicting row.

**Bug 2** is a distributed atomicity problem. S3 and PostgreSQL cannot participate in a single ACID transaction. The canonical pattern for non-atomic two-phase operations is: complete phase 1 (upload), record its output, execute phase 2 (DB), and implement a compensating action (delete) in the error path. Without compensation, each retry leaves a new orphan — a resource leak that grows linearly with retry count and has no automatic cleanup path.

**Bug 3**: Placing the `PROCESSING` status update outside the try block creates a gap where a DB failure before the catch runs leaves the document in an intermediate state (`PENDING` or a prior `FAILED`) with no recovery path until the job exhausts retries or is manually reset.

## Prevention

- **Treat every BullMQ job as inherently retryable.** Any INSERT with a unique constraint on a sequential or developer-controlled field must derive that field dynamically (e.g., `MAX + 1`, UUID generated inside the transaction). Hardcoded constants are only safe when exactly one attempt can ever run — which is never guaranteed in a queued system.
- **Track multi-phase operation state for compensation.** When a job spans S3 + DB (or any two non-atomic systems), record the completion of phase 1 in a variable accessible to the catch block before starting phase 2. The catch block should attempt compensating rollback and log failures without rethrowing them.
- **Keep status-transition updates inside the primary try/catch.** Status writes like `PROCESSING` and `COMPLETED` that bracket the job body belong inside the try block so failures are caught and a `FAILED` transition is always attempted.
- **Wrap secondary catch-block writes in their own try/catch.** The `FAILED` status update in the catch block can itself fail (e.g., the DB is still down). Wrap it in a separate try/catch that logs but never rethrows, so the original error is always preserved and propagated to BullMQ for correct retry and dead-letter handling.
- **Add an integration test covering the retry path.** Mock the DB transaction to fail after S3 upload. Assert: (a) the S3 object is deleted in the cleanup call, (b) document status is `FAILED`, (c) re-running the job (simulating a second attempt) completes successfully without a constraint error.

## Related Issues

- `docs/solutions/runtime-errors/typeorm-entity-circular-import-silent-drop-2026-05-04.md` — TypeORM entity registration failure; different problem but same `@hsm/worker`/`@hsm/database` module area.
