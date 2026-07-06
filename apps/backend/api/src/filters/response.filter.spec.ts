import { UnsuccessResponseDto } from '@hsm/common/dtos';
import { ApiErrorCode } from '@hsm/common/enums';
import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ResponseFilter } from './response.filter';

/**
 * Invoke the filter with a real HttpException and capture the JSON body it
 * writes to the response, so assertions run against the actual envelope.
 */
function runFilter(exception: HttpException): UnsuccessResponseDto {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status };
  const req = { url: '/v1/test' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => req,
    }),
  } as unknown as ArgumentsHost;

  new ResponseFilter().catch(exception, host);

  return json.mock.calls[0][0] as UnsuccessResponseDto;
}

describe('ResponseFilter — issue.code', () => {
  it('maps a bare 401 to COMMON.UNAUTHORIZED', () => {
    const payload = runFilter(new UnauthorizedException());
    expect(payload.issue.code).toBe(ApiErrorCode.Unauthorized);
  });

  it('maps a bare 403 to COMMON.FORBIDDEN', () => {
    const payload = runFilter(new ForbiddenException());
    expect(payload.issue.code).toBe(ApiErrorCode.Forbidden);
  });

  it('maps a bare 500 to COMMON.INTERNAL', () => {
    const payload = runFilter(new InternalServerErrorException());
    expect(payload.issue.code).toBe(ApiErrorCode.Internal);
  });

  it('preserves an explicit code from the thrown payload', () => {
    const payload = runFilter(
      new UnauthorizedException({
        issue: { code: ApiErrorCode.InvalidCredentials, message: 'x' },
      }),
    );
    expect(payload.issue.code).toBe(ApiErrorCode.InvalidCredentials);
  });
});

describe('ResponseFilter — structured validation', () => {
  it('carries the ValidationPipe payload code + errors verbatim', () => {
    const payload = runFilter(
      new BadRequestException({
        issue: {
          code: ApiErrorCode.Validation,
          message: ['email must be an email'],
          errors: [{ field: 'email', constraints: ['isEmail'] }],
        },
      }),
    );
    expect(payload.issue.code).toBe(ApiErrorCode.Validation);
    expect(payload.issue.errors).toEqual([
      { field: 'email', constraints: ['isEmail'] },
    ]);
  });

  it('derives structured errors from a raw ValidationError[] payload', () => {
    const payload = runFilter(
      new BadRequestException({
        message: [
          {
            property: 'email',
            constraints: { isEmail: 'email must be an email' },
          },
        ],
      }),
    );
    expect(payload.issue.code).toBe(ApiErrorCode.Validation);
    expect(payload.issue.errors).toEqual([
      { field: 'email', constraints: ['isEmail'] },
    ]);
  });
});
