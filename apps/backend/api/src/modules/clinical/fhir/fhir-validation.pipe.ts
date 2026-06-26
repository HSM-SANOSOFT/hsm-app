import { validateResource } from '@medplum/core';
import type { Resource } from '@medplum/fhirtypes';
import {
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import { loadFhirDefinitions } from './fhir-definitions';

/**
 * Validates an inbound FHIR resource body against base R4 (SP5, KTD5).
 *
 * The U3 spike confirmed `validateResource` is a no-op without indexed
 * StructureDefinitions (it rejects every resource as "Invalid resource type"), so
 * the pipe loads base-R4 definitions once before validating. With them loaded it
 * enforces structure, required (min=1) elements, primitive types, and
 * unknown-property rejection. Terminology/code bindings are NOT checked here
 * (KTD6) — routing-critical enums are enforced separately in the resource
 * services/search pipe.
 *
 * On failure it throws `UnprocessableEntityException` (422); the controller-scoped
 * `FhirOperationOutcomeFilter` renders it as a FHIR `OperationOutcome`.
 *
 * The pipe is applied to the raw body param (no class-validated DTO), so the
 * global ValidationPipe's `forbidNonWhitelisted` never fires on FHIR fields.
 */
@Injectable()
export class FhirValidationPipe implements PipeTransform {
  constructor() {
    loadFhirDefinitions();
  }

  transform(value: unknown): Resource {
    if (!value || typeof value !== 'object') {
      throw new UnprocessableEntityException(
        'FHIR resource body must be a JSON object',
      );
    }

    try {
      validateResource(value as Resource);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid FHIR resource';
      // Surface the first concrete validation issue if Medplum attached an
      // OperationOutcome to the error; otherwise the message text.
      const outcome = (
        err as {
          outcome?: {
            issue?: Array<{
              details?: { text?: string };
              diagnostics?: string;
            }>;
          };
        }
      ).outcome;
      const detail = outcome?.issue
        ?.map(i => i.details?.text ?? i.diagnostics)
        .filter(Boolean)
        .join('; ');
      throw new UnprocessableEntityException(detail || message);
    }

    return value as Resource;
  }
}
