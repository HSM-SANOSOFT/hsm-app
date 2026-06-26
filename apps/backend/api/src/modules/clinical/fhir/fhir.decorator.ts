import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route (or controller) as a FHIR REST endpoint (KTD7).
 *
 * The metadata is read by two globals so FHIR routes behave differently from the
 * rest of the app:
 * - `ResponseInterceptor` returns the RAW resource/Bundle/OperationOutcome instead
 *   of wrapping it in the `SuccessResponseDto` envelope (SP4).
 * - `HttpLoggingInterceptor` suppresses request/response BODY logging so PHI
 *   (names, MRNs, birthDates) never reaches plaintext logs (SP11/KTD11).
 *
 * Error-envelope bypass (rendering OperationOutcome instead of the app error
 * envelope) is handled separately by binding `FhirOperationOutcomeFilter` at
 * controller scope (see `FhirControllerBase`), which out-ranks the global
 * `ResponseFilter`.
 */
export const FHIR_ENDPOINT_KEY = 'isFhirEndpoint';

export const FhirEndpoint = () => SetMetadata(FHIR_ENDPOINT_KEY, true);
