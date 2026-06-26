import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

/**
 * U4 — envelope bypass regression (KTD7). FHIR routes return the raw body; every
 * other route still gets the `{ metadata, data }` success envelope.
 */
function makeCtx(isFhir: boolean) {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ url: isFhir ? '/fhir/R4/Patient/1' : '/v1/docs' }),
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as never;
}

describe('ResponseInterceptor FHIR bypass', () => {
  const makeInterceptor = (isFhir: boolean) => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(isFhir ? true : undefined);
    return new ResponseInterceptor(reflector);
  };

  it('returns the RAW body for a @FhirEndpoint() route (no envelope)', async () => {
    const interceptor = makeInterceptor(true);
    const raw = { resourceType: 'Patient', id: '1' };
    const out = await lastValueFrom(
      interceptor.intercept(makeCtx(true), { handle: () => of(raw) }),
    );
    expect(out).toBe(raw);
    expect(out).not.toHaveProperty('metadata');
  });

  it('wraps a non-FHIR route in the success envelope (no regression)', async () => {
    const interceptor = makeInterceptor(false);
    const out = (await lastValueFrom(
      interceptor.intercept(makeCtx(false), {
        handle: () => of({ hello: 'world' }),
      }),
    )) as { metadata: unknown; data: unknown };
    expect(out).toHaveProperty('metadata');
    expect(out).toHaveProperty('data', { hello: 'world' });
  });
});
