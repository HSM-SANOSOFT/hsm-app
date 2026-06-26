import { UnprocessableEntityException } from '@nestjs/common';
import { FhirValidationPipe } from './fhir-validation.pipe';

/**
 * U4 — inbound FHIR validation (SP5). Mirrors the U3 spike: structurally valid
 * resources pass; structurally invalid ones 422. Extra (un-DTO'd) FHIR fields are
 * NOT stripped — the raw resource flows through (the global ValidationPipe's
 * forbidNonWhitelisted never fires because the body is not a class-validated DTO).
 */
describe('FhirValidationPipe', () => {
  const pipe = new FhirValidationPipe();

  it('passes a structurally valid Patient and returns it unchanged', () => {
    const resource = {
      resourceType: 'Patient',
      name: [{ family: 'Doe', given: ['Jane'] }],
      gender: 'female',
    };
    expect(pipe.transform(resource)).toBe(resource);
  });

  it('rejects a non-object body with 422', () => {
    expect(() => pipe.transform('not-json')).toThrow(
      UnprocessableEntityException,
    );
  });

  it('rejects a missing required element with 422', () => {
    expect(() => pipe.transform({ resourceType: 'Encounter' })).toThrow(
      UnprocessableEntityException,
    );
  });

  it('rejects an unknown resourceType with 422', () => {
    expect(() => pipe.transform({ resourceType: 'Nonsense' })).toThrow(
      UnprocessableEntityException,
    );
  });

  it('does NOT strip extra FHIR fields (no DTO whitelisting)', () => {
    // `text` is a real FHIR element; the pipe must keep the whole resource intact.
    const resource = {
      resourceType: 'Patient',
      gender: 'male',
      text: { status: 'generated', div: '<div>x</div>' },
    };
    const out = pipe.transform(resource) as Record<string, unknown>;
    expect(out.text).toEqual(resource.text);
  });
});
