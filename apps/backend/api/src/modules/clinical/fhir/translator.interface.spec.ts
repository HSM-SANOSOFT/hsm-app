import {
  FhirRequestIntentEnum,
  FhirRequestStatusEnum,
  FhirServiceRequestCategoryEnum,
} from '@hsm/common/enums';
import {
  fromRelativeReference,
  toRelativeReference,
} from './translator.interface';

describe('U3 reference (de)serialization (KTD3)', () => {
  it('round-trips a FK uuid through a relative reference', () => {
    const id = '11111111-2222-3333-4444-555555555555';
    const ref = toRelativeReference('Patient', id);
    expect(ref).toEqual({ reference: `Patient/${id}` });
    expect(fromRelativeReference('Patient', ref)).toBe(id);
  });

  it('serializes an absent FK to undefined (optional reference omitted)', () => {
    expect(toRelativeReference('Encounter', null)).toBeUndefined();
    expect(toRelativeReference('Encounter', undefined)).toBeUndefined();
  });

  it('accepts a raw relative-reference string', () => {
    expect(fromRelativeReference('Patient', 'Patient/abc')).toBe('abc');
  });

  it('rejects a wrong-type reference', () => {
    expect(
      fromRelativeReference('Patient', { reference: 'Encounter/abc' }),
    ).toBeUndefined();
  });

  it('rejects absolute URLs and contained references', () => {
    expect(
      fromRelativeReference('Patient', {
        reference: 'http://example.com/fhir/Patient/abc',
      }),
    ).toBeUndefined();
    expect(fromRelativeReference('Patient', '#contained')).toBeUndefined();
  });
});

describe('U3 clinical enums expose the R4 routing code sets', () => {
  it('exposes RequestStatus, RequestIntent, and ServiceRequest category', () => {
    expect(FhirRequestStatusEnum.Active).toBe('active');
    expect(FhirRequestIntentEnum.Order).toBe('order');
    expect(FhirServiceRequestCategoryEnum.Laboratory).toBe('laboratory');
  });
});
