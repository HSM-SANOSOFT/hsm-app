import {
  MetadataDto,
  MetadataExtraDto,
  SuccessResponseDto,
} from '@hsm/common/dtos';
import { ISuccessResponse } from '@hsm/common/interfaces';
import { extractApiVersion } from '@hsm/common/utils';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { map, Observable } from 'rxjs';
import { FHIR_ENDPOINT_KEY } from '../modules/clinical/fhir/fhir.decorator';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, SuccessResponseDto<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    ctx: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponseDto<T> | T> {
    // KTD7: FHIR routes emit raw FHIR (Resource/Bundle/OperationOutcome) — never
    // the app success envelope. Reflector-gated; default behavior is unchanged.
    const isFhir = this.reflector.getAllAndOverride<boolean>(
      FHIR_ENDPOINT_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (isFhir) {
      return next.handle();
    }

    const http = ctx.switchToHttp();
    const req: Request = http.getRequest();
    const res: Response = http.getResponse();
    const statusCode = res.statusCode;

    return next.handle().pipe(
      map((payload: T | ISuccessResponse<T>): SuccessResponseDto<T> => {
        const baseMeta: MetadataDto = {
          success: statusCode >= 200 && statusCode < 300,
          statusCode,
          timestamp: new Date().toISOString(),
          path: req.url,
          message: 'Request processed successfully.',
          apiVersion: extractApiVersion(req),
        };

        const isSlim =
          typeof payload === 'object' && payload !== null && 'data' in payload;

        const data: T = isSlim
          ? (payload as ISuccessResponse<T>).data
          : (payload as T);

        let extra: MetadataExtraDto | undefined = isSlim
          ? (payload as ISuccessResponse<T>).metadata?.extra
          : undefined;

        if (Array.isArray(data)) {
          const hasPagination = extra?.pagination;

          if (!hasPagination) {
            extra = {
              ...extra,
              pagination: {
                page: 1,
                pageSize: data.length,
                totalItems: data.length,
                totalPages: 1,
              },
            };
          }
        }

        const metadata: MetadataDto = extra ? { ...baseMeta, extra } : baseMeta;

        return { metadata, data };
      }),
    );
  }
}
