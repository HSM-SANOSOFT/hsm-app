import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FhirOperationOutcomeFilter } from './fhir-operation-outcome.filter';

/**
 * U4 — OperationOutcome error rendering (KTD7, SP4). Out-ranks the global
 * ResponseFilter because it is bound at controller scope (asserted at runtime by
 * U5's 422/404 specs); here we assert the rendered body + status mapping.
 */
function makeHost() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    contentType: '',
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    type(t: string) {
      this.contentType = t;
      return this;
    },
    json(b: unknown) {
      this.body = b;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => res }),
  } as never;
  return { host, res };
}

describe('FhirOperationOutcomeFilter', () => {
  const filter = new FhirOperationOutcomeFilter();

  const run = (exception: HttpException) => {
    const { host, res } = makeHost();
    filter.catch(exception, host);
    return res;
  };

  it('renders a FHIR OperationOutcome with application/fhir+json', () => {
    const res = run(new NotFoundException("Patient '1' not found"));
    expect(res.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(res.contentType).toBe('application/fhir+json');
    expect(res.body).toMatchObject({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'not-found' }],
    });
  });

  it('maps 422 -> invalid', () => {
    const res = run(new UnprocessableEntityException('bad resource'));
    expect((res.body as { issue: { code: string }[] }).issue[0].code).toBe(
      'invalid',
    );
  });

  it('maps 409 -> duplicate', () => {
    const res = run(new ConflictException('dup identifier'));
    expect((res.body as { issue: { code: string }[] }).issue[0].code).toBe(
      'duplicate',
    );
  });

  it('maps 403 -> forbidden', () => {
    const res = run(new ForbiddenException());
    expect((res.body as { issue: { code: string }[] }).issue[0].code).toBe(
      'forbidden',
    );
  });

  it('marks 5xx as fatal', () => {
    const res = run(
      new HttpException('boom', HttpStatus.INTERNAL_SERVER_ERROR),
    );
    expect(
      (res.body as { issue: { severity: string }[] }).issue[0].severity,
    ).toBe('fatal');
  });
});
