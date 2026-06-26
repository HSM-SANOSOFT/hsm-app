import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { HttpLoggingInterceptor } from './request.interceptor';

/**
 * U4 — PHI log suppression (KTD11/SP11). FHIR routes must never emit request or
 * response BODIES into logs; the access line is body-free and marked.
 */
function makeCtx() {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'POST',
        url: '/fhir/R4/Patient',
        body: { resourceType: 'Patient', name: [{ family: 'Secret' }] },
      }),
    }),
  } as never;
}

describe('HttpLoggingInterceptor PHI suppression', () => {
  it('logs no body for a FHIR route and never leaks PHI', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const interceptor = new HttpLoggingInterceptor(reflector);

    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    await lastValueFrom(
      interceptor.intercept(makeCtx(), { handle: () => of('ok') }),
    );

    const logged = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(logged).toContain('/fhir/R4/Patient');
    expect(logged).toContain('body suppressed');
    expect(logged).not.toContain('Secret');
    logSpy.mockRestore();
  });

  it('logs a plain access line for non-FHIR routes', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const interceptor = new HttpLoggingInterceptor(reflector);
    const logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    await lastValueFrom(
      interceptor.intercept(makeCtx(), { handle: () => of('ok') }),
    );

    const logged = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(logged).not.toContain('body suppressed');
    logSpy.mockRestore();
  });
});
