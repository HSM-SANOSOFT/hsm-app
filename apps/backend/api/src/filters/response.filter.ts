import { MetadataDto, UnsuccessResponseDto } from '@hsm/common/dtos';
import { ApiErrorCode } from '@hsm/common/enums';
import { IUnsuccessResponse } from '@hsm/common/interfaces';
import { extractApiVersion } from '@hsm/common/utils';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  collectValidationDetails,
  flattenValidationMessages,
} from './validation-details.util';

/**
 * Type guards
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(x => typeof x === 'string');
}

/**
 * Map an HTTP status to a stable, generic {@link ApiErrorCode}. Used only as a
 * fallback when the thrown payload did not carry an explicit `issue.code`.
 */
function codeForStatus(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return ApiErrorCode.Unauthorized;
    case 403:
      return ApiErrorCode.Forbidden;
    case 404:
      return ApiErrorCode.NotFound;
    case 409:
      return ApiErrorCode.Conflict;
    case 429:
      return ApiErrorCode.TooManyRequests;
    case 400:
    case 422:
      return ApiErrorCode.Validation;
    default:
      return ApiErrorCode.Internal;
  }
}

@Catch(HttpException)
export class ResponseFilter implements ExceptionFilter {
  private readonly logger = new Logger(ResponseFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const payload = exception.getResponse();

    this.logger.debug(
      `Handling exception with status ${status} for payload: ${JSON.stringify(payload)}`,
    );

    // Always start empty – never default to framework text
    const issue: IUnsuccessResponse = { issue: {} };

    /**
     * 1) Payload already follows our API contract → trust it
     */
    if (isRecord(payload) && isRecord(payload['issue'])) {
      issue.issue = payload['issue'] as UnsuccessResponseDto['issue'];
    } else if (isRecord(payload)) {
      /**
       * 2) Normalize default Nest / ValidationPipe errors
       */
      const msg = payload['message'];
      const err = payload['error'];
      const errors = payload['errors'];

      /**
       * message normalization
       * - ValidationError[]
       * - string[]
       * - string
       */
      if (Array.isArray(msg) && msg.length && isRecord(msg[0])) {
        const flattened = flattenValidationMessages(msg);
        if (flattened.length) {
          issue.issue.message = flattened;
        }
        const details = collectValidationDetails(msg);
        if (details.length) {
          issue.issue.errors = details;
          issue.issue.code = ApiErrorCode.Validation;
        }
      } else if (isStringArray(msg)) {
        issue.issue.message = msg;
      } else if (typeof msg === 'string') {
        issue.issue.message = msg;
      }

      /**
       * error label
       */
      if (typeof err === 'string') {
        issue.issue.error = err;
      }

      /**
       * Field inference from ValidationPipe errors
       */
      if (Array.isArray(errors)) {
        const props = errors
          .filter(
            e =>
              isRecord(e) &&
              typeof e['property'] === 'string' &&
              e['property'].length > 0,
          )
          .map(e => String(e['property']));

        if (props.length === 1) {
          issue.issue.field = props[0];
        } else if (props.length > 1) {
          issue.issue.field = Array.from(new Set(props));
        }
      } else if (isStringArray(issue.issue.message)) {
        /**
         * Fallback field inference from message array
         */
        const inferred = issue.issue.message
          .map(s => s.split(' ')[0])
          .filter(t => /^[a-zA-Z0-9_.-]+$/.test(t));

        if (inferred.length === 1) {
          issue.issue.field = inferred[0];
        } else if (inferred.length > 1) {
          issue.issue.field = Array.from(new Set(inferred));
        }
      }
    }

    /**
     * Guarantee a stable `code` on every error envelope: trust an explicit
     * code from the thrown payload, otherwise fall back to the status map.
     */
    issue.issue.code = issue.issue.code ?? codeForStatus(status);

    /**
     * 3) Final response envelope
     */
    const metadata: MetadataDto = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message: 'Request processed unsuccessfully.',
      apiVersion: extractApiVersion(req),
    };

    const body: UnsuccessResponseDto = {
      metadata,
      issue: issue.issue,
    };

    res.status(status).json(body);
  }
}
