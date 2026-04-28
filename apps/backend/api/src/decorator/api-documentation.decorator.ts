import { SuccessResponseDto, UnsuccessResponseDto } from '@hsm/common/dtos';
import { applyDecorators, HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiHeader,
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
import { AuthJwtRtGuard } from '../modules/security/auth/guard/auth.jwt.rt.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

type ClassType = new (...args: unknown[]) => unknown;
export const ApiDocumentation = (
  models?: ClassType | ClassType[],
  hasPagination: boolean = false,
  hasFilter: boolean = false,
  hasSort: boolean = false,
) => {
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

    const modelArray: ClassType[] = models
      ? Array.isArray(models)
        ? models
        : [models]
      : [];

    const metadataSchema: (
      success?: boolean,
      code?: number,
      message?: string,
    ) => SchemaObject | ReferenceObject = (
      success?: boolean,
      code?: number,
      message?: string,
    ): SchemaObject | ReferenceObject => {
      return {
        properties: {
          success: {
            type: 'boolean',
            example: success ? success : true,
          },
          statusCode: {
            type: 'number',
            example: code ? code : HttpStatus.OK,
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
                metadata: metadataSchema(),
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
      return {
        allOf: [
          { $ref: getSchemaPath(UnsuccessResponseDto) },
          {
            properties: {
              metadata: metadataSchema(false, code, message),
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
      ApiNotFoundResponse({
        description: 'Not Found',
        schema: unsuccessSchema(HttpStatus.NOT_FOUND, 'not found'),
      }),
      ApiInternalServerErrorResponse({
        description: 'Internal Server Error',
        schema: unsuccessSchema(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'internal server error',
        ),
      }),
      ApiBadGatewayResponse({
        description: 'Bad Gateway',
        schema: unsuccessSchema(HttpStatus.BAD_GATEWAY, 'bad gateway'),
      }),
    ];
    if (!isPublic) {
      if (usesRefreshGuard) {
        decorators.unshift(ApiBearerAuth('refresh_token'));
        decorators.unshift(
          ApiHeader({
            name: 'Authorization',
            description: 'Bearer <refresh_token>',
            required: true,
          }),
        );
      } else {
        decorators.unshift(ApiBearerAuth('access_token'));
        decorators.unshift(
          ApiHeader({
            name: 'Authorization',
            description: 'Bearer <access_token>',
            required: true,
          }),
        );
      }
    }

    applyDecorators(...decorators)(target, propertyKey, descriptor);
  };
};
