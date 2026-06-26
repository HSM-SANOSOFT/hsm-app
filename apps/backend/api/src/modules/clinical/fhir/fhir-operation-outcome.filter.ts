import type {
  OperationOutcome,
  OperationOutcomeIssue,
} from '@medplum/fhirtypes';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Renders FHIR `OperationOutcome` for errors on FHIR routes (KTD7, SP4).
 *
 * Bound at CONTROLLER scope (via `FhirControllerBase`'s `@UseFilters`) so NestJS's
 * nearest-scoped filter resolution shadows the global `ResponseFilter` for FHIR
 * routes only — non-FHIR routes still get the app error envelope. This is why the
 * filter is NOT registered as an APP_FILTER.
 *
 * It deliberately emits no PHI: only the HTTP-status-derived issue type and the
 * exception's own (developer-authored) message text reach the body.
 */
@Catch(HttpException)
export class FhirOperationOutcomeFilter implements ExceptionFilter {
  private readonly logger = new Logger(FhirOperationOutcomeFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const payload = exception.getResponse();

    const diagnostics = this.extractDiagnostics(payload, exception.message);

    const issue: OperationOutcomeIssue = {
      severity: status >= HttpStatus.INTERNAL_SERVER_ERROR ? 'fatal' : 'error',
      code: this.issueCode(status),
      diagnostics,
    };

    const outcome: OperationOutcome = {
      resourceType: 'OperationOutcome',
      issue: [issue],
    };

    this.logger.debug(`FHIR OperationOutcome ${status}: ${issue.code}`);

    res.status(status).type('application/fhir+json').json(outcome);
  }

  /** Map an HTTP status to a FHIR IssueType code. */
  private issueCode(status: number): OperationOutcomeIssue['code'] {
    switch (status) {
      case HttpStatus.NOT_FOUND:
        return 'not-found';
      case HttpStatus.UNPROCESSABLE_ENTITY:
      case HttpStatus.BAD_REQUEST:
        return 'invalid';
      case HttpStatus.CONFLICT:
        return 'duplicate';
      case HttpStatus.UNAUTHORIZED:
      case HttpStatus.FORBIDDEN:
        return 'forbidden';
      default:
        return status >= HttpStatus.INTERNAL_SERVER_ERROR
          ? 'exception'
          : 'processing';
    }
  }

  private extractDiagnostics(payload: unknown, fallback: string): string {
    if (typeof payload === 'string') return payload;
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const msg = (payload as { message: unknown }).message;
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg))
        return msg.filter(m => typeof m === 'string').join('; ');
    }
    return fallback;
  }
}
