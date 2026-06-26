import {
  FhirRequestStatusEnum,
  FhirServiceRequestCategoryEnum,
} from '@hsm/common/enums';
import { UnprocessableEntityException } from '@nestjs/common';
import { FhirSearchPipe } from './fhir-search.pipe';

describe('FhirSearchPipe', () => {
  const pipe = new FhirSearchPipe({
    enums: {
      status: Object.values(FhirRequestStatusEnum),
      category: Object.values(FhirServiceRequestCategoryEnum),
    },
    identifierParams: ['identifier'],
    referenceParams: { subject: 'Patient' },
  });

  it('accepts an allowlisted enum value', () => {
    const out = pipe.transform({ category: 'laboratory', status: 'active' });
    expect(out.raw.category).toBe('laboratory');
  });

  it('rejects an out-of-allowlist enum value (routing codes cannot break)', () => {
    expect(() => pipe.transform({ category: 'not-a-category' })).toThrow(
      UnprocessableEntityException,
    );
  });

  it('parses an identifier token system|value', () => {
    const out = pipe.transform({ identifier: 'urn:mrn|123' });
    expect(out.identifiers.identifier).toEqual({
      system: 'urn:mrn',
      value: '123',
    });
  });

  it('parses a bare identifier value', () => {
    const out = pipe.transform({ identifier: '123' });
    expect(out.identifiers.identifier).toEqual({
      system: undefined,
      value: '123',
    });
  });

  it('parses a subject reference to its id', () => {
    const out = pipe.transform({ subject: 'Patient/abc' });
    expect(out.references.subject).toBe('abc');
  });

  it('rejects a wrong-type reference', () => {
    expect(() => pipe.transform({ subject: 'Encounter/abc' })).toThrow(
      UnprocessableEntityException,
    );
  });

  it('rejects an array (multi-valued) param', () => {
    expect(() => pipe.transform({ status: ['active', 'draft'] })).toThrow(
      UnprocessableEntityException,
    );
  });
});
