import { SuccessResponseDto, UnsuccessResponseDto } from '@hsm/common/dtos';
import { ApiErrorCode } from '@hsm/common/enums';
import { applyDecorators, HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ReferenceObject,
  SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { AuthJwtRtGuard } from '../guards';
import { IS_PUBLIC_KEY } from './public.decorator';

type ClassType = new (...args: unknown[]) => unknown;

export interface ApiDocumentationOptions {
  additionalErrors?: HttpStatus[];
  hasPagination?: boolean;
  hasFilter?: boolean;
  hasSort?: boolean;
}

const getIssueExample = (
  httpCode: number,
): { code: string; message: string; error: string } => {
  switch (httpCode) {
    case HttpStatus.BAD_REQUEST:
      return {
        code: ApiErrorCode.Validation,
        message: 'Validation failed.',
        error: 'Bad Request',
      };
    case HttpStatus.UNAUTHORIZED:
      return {
        code: ApiErrorCode.Unauthorized,
        message: 'Authentication required.',
        error: 'Unauthorized',
      };
    case HttpStatus.FORBIDDEN:
      return {
        code: ApiErrorCode.Forbidden,
        message: 'Insufficient permissions.',
        error: 'Forbidden',
      };
    case HttpStatus.NOT_FOUND:
      return {
        code: ApiErrorCode.NotFound,
        message: 'Resource not found.',
        error: 'Not Found',
      };
    case HttpStatus.CONFLICT:
      return {
        code: ApiErrorCode.Conflict,
        message: 'The record already exists or is in conflict.',
        error: 'Conflict',
      };
    case HttpStatus.TOO_MANY_REQUESTS:
      return {
        code: ApiErrorCode.TooManyRequests,
        message: 'Too many requests. Try again shortly.',
        error: 'Too Many Requests',
      };
    case HttpStatus.BAD_GATEWAY:
      return {
        code: ApiErrorCode.Internal,
        message: 'Upstream service unavailable.',
        error: 'Bad Gateway',
      };
    default:
      return {
        code: ApiErrorCode.Internal,
        message: 'An unexpected error occurred.',
        error: 'Internal Server Error',
      };
  }
};

export const ApiDocumentation = (
  models?: ClassType | ClassType[],
  options: ApiDocumentationOptions = {},
) => {
  const {
    additionalErrors = [],
    hasPagination = false,
    hasFilter = false,
    hasSort = false,
  } = options;

  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const reflector = new Reflector();
    const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      descriptor.value,
      target.constructor,
    ]);
    const guards =
      reflector.getAllAndOverride<unknown[]>(GUARDS_METADATA, [
        descriptor.value,
        target.constructor,
      ]) ?? [];

    const usesRefreshGuard = !!guards.find(g => g === AuthJwtRtGuard);

    // Derive the actual endpoint path from NestJS route metadata at decoration time.
    // Direct Reflect.getMetadata is used (not reflector.getAllAndOverride) because
    // PATH_METADATA is a scalar string — getAllAndOverride is designed for merged
    // arrays across multiple targets, which is not what we need here.
    // target.constructor is the controller class; descriptor.value is the method function.
    const controllerPath =
      (Reflect.getMetadata(PATH_METADATA, target.constructor) as string) ?? '';
    const methodPath =
      (Reflect.getMetadata(PATH_METADATA, descriptor.value) as string) ?? '';
    const derivedPath =
      '/' +
      ['v1', controllerPath, methodPath]
        .filter(Boolean)
        .join('/')
        .replace(/\/+/g, '/');

    const modelArray: ClassType[] = models
      ? Array.isArray(models)
        ? models
        : [models]
      : [];

    const metadataSchema = (
      path: string,
      success?: boolean,
      code?: number,
      message?: string,
    ): SchemaObject | ReferenceObject => {
      return {
        properties: {
          success: {
            type: 'boolean',
            example: success ?? true,
          },
          statusCode: {
            type: 'number',
            example: code ? code : HttpStatus.OK,
          },
          path: {
            type: 'string',
            example: path,
          },
          message: {
            type: 'string',
            example: message ? message : 'Success',
          },
          extra:
            hasPagination || hasFilter || hasSort
              ? {
                  properties: {
                    filter: hasFilter
                      ? {}
                      : { type: 'array', example: undefined },
                    pagination: hasPagination
                      ? {}
                      : { type: 'array', example: undefined },
                    sort: hasSort ? {} : { type: 'array', example: undefined },
                  },
                }
              : { type: 'array', example: undefined },
        },
      };
    };

    const successResponse: () => SchemaObject & Partial<ReferenceObject> =
      (): SchemaObject & Partial<ReferenceObject> => {
        let dataSchema: SchemaObject | ReferenceObject;

        if (modelArray.length === 0) {
          dataSchema = {
            type: 'array',
            example: undefined,
          };
        } else if (modelArray.length === 1) {
          dataSchema = { $ref: getSchemaPath(modelArray[0]) };
        } else {
          dataSchema = {
            oneOf: modelArray.map(model => ({
              $ref: getSchemaPath(model),
            })),
          };
        }

        return {
          allOf: [
            { $ref: getSchemaPath(SuccessResponseDto) },
            {
              properties: {
                metadata: metadataSchema(derivedPath),
                data: dataSchema,
              },
            },
          ],
        };
      };

    const unsuccessSchema: (
      code: number,
      message: string,
    ) => SchemaObject & Partial<ReferenceObject> = (
      code: number,
      message: string,
    ): SchemaObject & Partial<ReferenceObject> => {
      const issueExample = getIssueExample(code);
      return {
        allOf: [
          { $ref: getSchemaPath(UnsuccessResponseDto) },
          {
            properties: {
              metadata: metadataSchema(derivedPath, false, code, message),
              issue: {
                properties: {
                  code: { type: 'string', example: issueExample.code },
                  message: { type: 'string', example: issueExample.message },
                  error: { type: 'string', example: issueExample.error },
                },
              },
            },
          },
        ],
      };
    };

    const decorators: Array<
      ClassDecorator | MethodDecorator | PropertyDecorator
    > = [
      ApiExtraModels(SuccessResponseDto, UnsuccessResponseDto, ...modelArray),
      ApiOkResponse({
        description: 'Successful response',
        schema: successResponse(),
      }),
      ApiBadRequestResponse({
        description: 'Bad Request',
        schema: unsuccessSchema(HttpStatus.BAD_REQUEST, 'bad request'),
      }),
      ApiUnauthorizedResponse({
        description: 'Unauthorized',
        schema: unsuccessSchema(HttpStatus.UNAUTHORIZED, 'unauthorized'),
      }),
      ApiForbiddenResponse({
        description: 'Forbidden',
        schema: unsuccessSchema(HttpStatus.FORBIDDEN, 'forbidden'),
      }),
      ApiInternalServerErrorResponse({
        description: 'Internal Server Error',
        schema: unsuccessSchema(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'internal server error',
        ),
      }),
    ];

    if (additionalErrors.includes(HttpStatus.NOT_FOUND)) {
      decorators.push(
        ApiNotFoundResponse({
          description: 'Not Found',
          schema: unsuccessSchema(HttpStatus.NOT_FOUND, 'not found'),
        }),
      );
    }

    if (additionalErrors.includes(HttpStatus.BAD_GATEWAY)) {
      decorators.push(
        ApiBadGatewayResponse({
          description: 'Bad Gateway',
          schema: unsuccessSchema(HttpStatus.BAD_GATEWAY, 'bad gateway'),
        }),
      );
    }

    // ApiBearerAuth links this endpoint to the global Swagger security scheme
    // registered via addBearerAuth() in main.ts. No ApiHeader is needed —
    // adding it separately creates a duplicate, unlinked Authorization field
    // in the Swagger UI that the global "Authorize" button does not populate.
    if (!isPublic) {
      if (usesRefreshGuard) {
        decorators.unshift(ApiBearerAuth('refresh_token'));
      } else {
        decorators.unshift(ApiBearerAuth('access_token'));
      }
    }

    applyDecorators(...decorators)(target, propertyKey, descriptor);
  };
};
