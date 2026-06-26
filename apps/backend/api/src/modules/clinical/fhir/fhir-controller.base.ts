import { RolesClinicalEnum } from '@hsm/common/enums';
import {
  applyDecorators,
  Controller,
  UseFilters,
  VERSION_NEUTRAL,
  Version,
} from '@nestjs/common';
import { Roles } from '../../security/roles/roles.decorator';
import { FhirEndpoint } from './fhir.decorator';
import { FhirOperationOutcomeFilter } from './fhir-operation-outcome.filter';

/**
 * Shared FHIR controller conventions (KTD7 + KTD11), composed onto each resource
 * controller via `@FhirController('Patient')` etc. This is justified by concrete
 * shared behavior, not a speculative abstraction — every FHIR controller needs all
 * of it:
 *
 * - `@Controller('fhir/R4/<resourceType>')` — the advertised FHIR base path.
 * - `@Version(VERSION_NEUTRAL)` — the app uses global URI versioning
 *   (`defaultVersion: '1'`); without this a controller would serve at
 *   `/v1/fhir/R4/...`. VERSION_NEUTRAL serves at the un-prefixed `/fhir/R4/...`.
 * - `@FhirEndpoint()` (class-level) — marks every route so the global
 *   `ResponseInterceptor` returns raw FHIR (no envelope) and the
 *   `HttpLoggingInterceptor` suppresses PHI bodies.
 * - `@UseFilters(FhirOperationOutcomeFilter)` — controller-scoped filter that
 *   out-ranks the global `ResponseFilter`, rendering OperationOutcome on errors
 *   for FHIR routes only.
 * - `@Roles(...clinical staff)` — PHI authorization gate from day one (KTD11). The
 *   global `AuthJwtAtGuard` only authenticates; this authorizes. A single broad
 *   clinical-staff grant for now; the fine-grained registry refines it later.
 */
export const CLINICAL_STAFF_ROLES = Object.values(RolesClinicalEnum);

export function FhirController(resourceType: string): ClassDecorator {
  return applyDecorators(
    Controller(`fhir/R4/${resourceType}`),
    Version(VERSION_NEUTRAL),
    FhirEndpoint(),
    UseFilters(FhirOperationOutcomeFilter),
    Roles(...CLINICAL_STAFF_ROLES),
  );
}
