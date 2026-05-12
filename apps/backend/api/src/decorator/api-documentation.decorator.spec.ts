import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { IS_PUBLIC_KEY } from './public.decorator';
import { ApiDocumentation } from './api-documentation.decorator';

jest.mock('../guards', () => ({
  AuthJwtAtGuard: class AuthJwtAtGuard {},
  AuthJwtRtGuard: class AuthJwtRtGuard {},
}));

jest.mock('@nestjs/swagger', () => {
  const actual = jest.requireActual('@nestjs/swagger') as object;
  return {
    ...actual,
    ApiOkResponse: jest.fn().mockReturnValue(jest.fn()),
    ApiBadRequestResponse: jest.fn().mockReturnValue(jest.fn()),
    ApiUnauthorizedResponse: jest.fn().mockReturnValue(jest.fn()),
    ApiForbiddenResponse: jest.fn().mockReturnValue(jest.fn()),
    ApiInternalServerErrorResponse: jest.fn().mockReturnValue(jest.fn()),
    ApiBearerAuth: jest.fn().mockReturnValue(jest.fn()),
    ApiHeader: jest.fn().mockReturnValue(jest.fn()),
    ApiExtraModels: jest.fn().mockReturnValue(jest.fn()),
    ApiNotFoundResponse: jest.fn().mockReturnValue(jest.fn()),
    ApiBadGatewayResponse: jest.fn().mockReturnValue(jest.fn()),
    getSchemaPath: jest
      .fn()
      .mockImplementation(
        (cls: { name?: string }) =>
          `#/components/schemas/${cls?.name ?? 'Unknown'}`,
      ),
  };
});

describe('ApiDocumentation', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let target: { constructor: new (...args: any[]) => any };
  let descriptor: PropertyDescriptor;

  beforeEach(() => {
    jest.clearAllMocks();
    target = { constructor: class StubController {} };
    descriptor = { value: function stubMethod() {} } as PropertyDescriptor;
    // Default route metadata: controller='test', method='endpoint'
    Reflect.defineMetadata('path', 'test', target.constructor);
    Reflect.defineMetadata('path', 'endpoint', descriptor.value);
  });

  const applyDecorator = () =>
    ApiDocumentation()(target as unknown as object, 'stubMethod', descriptor);

  // ── U1: success truthiness fix ────────────────────────────────────────────

  describe('success response examples', () => {
    it('200 shows success: true', () => {
      applyDecorator();
      const { schema } = (ApiOkResponse as jest.Mock).mock.calls[0][0];
      expect(
        schema.allOf[1].properties.metadata.properties.success.example,
      ).toBe(true);
    });

    it('400 shows success: false — regression guard for truthiness bug', () => {
      applyDecorator();
      const { schema } = (ApiBadRequestResponse as jest.Mock).mock.calls[0][0];
      expect(
        schema.allOf[1].properties.metadata.properties.success.example,
      ).toBe(false);
    });

    it('401 shows success: false', () => {
      applyDecorator();
      const { schema } = (ApiUnauthorizedResponse as jest.Mock).mock
        .calls[0][0];
      expect(
        schema.allOf[1].properties.metadata.properties.success.example,
      ).toBe(false);
    });
  });

  // ── U1: status-code-specific issue examples ───────────────────────────────

  describe('error response issue examples', () => {
    it('400 issue code is VALIDATION_ERROR', () => {
      applyDecorator();
      const { schema } = (ApiBadRequestResponse as jest.Mock).mock.calls[0][0];
      expect(
        schema.allOf[1].properties.issue.properties.code.example,
      ).toBe('VALIDATION_ERROR');
    });

    it('401 issue code is UNAUTHORIZED', () => {
      applyDecorator();
      const { schema } = (ApiUnauthorizedResponse as jest.Mock).mock
        .calls[0][0];
      expect(
        schema.allOf[1].properties.issue.properties.code.example,
      ).toBe('UNAUTHORIZED');
    });

    it('403 issue code is FORBIDDEN', () => {
      applyDecorator();
      const { schema } = (ApiForbiddenResponse as jest.Mock).mock.calls[0][0];
      expect(
        schema.allOf[1].properties.issue.properties.code.example,
      ).toBe('FORBIDDEN');
    });

    it('500 issue code is INTERNAL_SERVER_ERROR', () => {
      applyDecorator();
      const { schema } = (ApiInternalServerErrorResponse as jest.Mock).mock
        .calls[0][0];
      expect(
        schema.allOf[1].properties.issue.properties.code.example,
      ).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  // ── U2: Authorization header removal ─────────────────────────────────────

  describe('Authorization header (U2)', () => {
    it('authenticated endpoint does not include ApiHeader for Authorization', () => {
      applyDecorator();
      const authHeaderCall = (ApiHeader as jest.Mock).mock.calls.find(
        (args) => (args[0] as { name?: string })?.name === 'Authorization',
      );
      expect(authHeaderCall).toBeUndefined();
    });

    it('authenticated endpoint includes ApiBearerAuth with access_token', () => {
      applyDecorator();
      expect(ApiBearerAuth as jest.Mock).toHaveBeenCalledWith('access_token');
    });

    it('public endpoint includes neither ApiBearerAuth nor ApiHeader Authorization', () => {
      Reflect.defineMetadata(IS_PUBLIC_KEY, true, descriptor.value);
      applyDecorator();
      expect(ApiBearerAuth as jest.Mock).not.toHaveBeenCalled();
      const authHeaderCall = (ApiHeader as jest.Mock).mock.calls.find(
        (args) => (args[0] as { name?: string })?.name === 'Authorization',
      );
      expect(authHeaderCall).toBeUndefined();
    });

    it('refresh token endpoint uses ApiBearerAuth with refresh_token', () => {
      const { AuthJwtRtGuard } = jest.requireMock('../guards') as {
        AuthJwtRtGuard: unknown;
      };
      Reflect.defineMetadata(GUARDS_METADATA, [AuthJwtRtGuard], descriptor.value);
      applyDecorator();
      expect(ApiBearerAuth as jest.Mock).toHaveBeenCalledWith('refresh_token');
      const authHeaderCall = (ApiHeader as jest.Mock).mock.calls.find(
        (args) => (args[0] as { name?: string })?.name === 'Authorization',
      );
      expect(authHeaderCall).toBeUndefined();
    });
  });

  // ── U3: path derivation ───────────────────────────────────────────────────

  describe('path derivation (U3)', () => {
    it('derives path from controller and method route metadata', () => {
      Reflect.defineMetadata('path', 'auth', target.constructor);
      Reflect.defineMetadata('path', 'login', descriptor.value);
      applyDecorator();
      const { schema } = (ApiOkResponse as jest.Mock).mock.calls[0][0];
      expect(
        schema.allOf[1].properties.metadata.properties.path.example,
      ).toBe('/v1/auth/login');
    });

    it('handles parameterised segments without double slashes', () => {
      Reflect.defineMetadata('path', 'docs', target.constructor);
      Reflect.defineMetadata('path', ':id', descriptor.value);
      applyDecorator();
      const { schema } = (ApiOkResponse as jest.Mock).mock.calls[0][0];
      expect(
        schema.allOf[1].properties.metadata.properties.path.example,
      ).toBe('/v1/docs/:id');
    });

    it('falls back to /v1 when both paths are empty strings', () => {
      Reflect.defineMetadata('path', '', target.constructor);
      Reflect.defineMetadata('path', '', descriptor.value);
      applyDecorator();
      const { schema } = (ApiOkResponse as jest.Mock).mock.calls[0][0];
      expect(
        schema.allOf[1].properties.metadata.properties.path.example,
      ).toBe('/v1');
    });

    it('does not throw when PATH_METADATA is not set on targets', () => {
      const noMetaTarget = { constructor: class NoMetaController {} };
      const noMetaDescriptor = {
        value: function noMetaMethod() {},
      } as PropertyDescriptor;
      expect(() =>
        ApiDocumentation()(
          noMetaTarget as unknown as object,
          'noMetaMethod',
          noMetaDescriptor,
        ),
      ).not.toThrow();
    });

    it('error responses also carry the derived path', () => {
      Reflect.defineMetadata('path', 'auth', target.constructor);
      Reflect.defineMetadata('path', 'login', descriptor.value);
      applyDecorator();
      const { schema } = (ApiBadRequestResponse as jest.Mock).mock.calls[0][0];
      expect(
        schema.allOf[1].properties.metadata.properties.path.example,
      ).toBe('/v1/auth/login');
    });
  });
});
