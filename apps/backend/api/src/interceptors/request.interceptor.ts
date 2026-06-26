import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { finalize, Observable } from 'rxjs';
import { FHIR_ENDPOINT_KEY } from '../modules/clinical/fhir/fhir.decorator';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  // Bound manually in main.ts (no DI). A Reflector is constructed there and
  // passed in so `@FhirEndpoint()` metadata can be read for PHI suppression.
  constructor(private readonly reflector: Reflector = new Reflector()) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = req.method;
    const url = req.url;
    const start = Date.now();

    // KTD11/SP11: never log request/response BODIES for FHIR routes — Patient
    // names, MRNs, and birthDates must not hit plaintext logs. We log the access
    // line (method/url/duration) only; bodies are suppressed for FHIR routes.
    const isFhir = this.reflector.getAllAndOverride<boolean>(
      FHIR_ENDPOINT_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      finalize(() => {
        const duration = Date.now() - start;
        const phiNote = isFhir ? ' [fhir: body suppressed]' : '';
        this.logger.log(`${method} ${url} (${duration}ms)${phiNote}`);
      }),
    );
  }
}
