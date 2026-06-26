import { validateResource } from '@medplum/core';
import type { Patient } from '@medplum/fhirtypes';
import {
  loadFhirDefinitions,
  resetFhirDefinitionsForTest,
} from './fhir-definitions';

/**
 * U3 validation-contract spike, pinned as a regression test so downstream
 * 422-on-invalid expectations (U4/U5/U7) match reality.
 *
 * Findings (R4 base StructureDefinitions indexed):
 * - WITHOUT definitions, validateResource rejects everything ("Invalid resource
 *   type") — so loading is mandatory; SP5 is otherwise hollow.
 * - WITH definitions it enforces: valid resourceType, required (min=1) elements,
 *   primitive types (boolean/date), and unknown-property rejection.
 * - It does NOT enforce terminology/code bindings — bad enum codes PASS. Hence
 *   routing-critical codes are enum-checked separately (KTD6).
 */
describe('U3 FHIR validation contract', () => {
  beforeAll(() => {
    resetFhirDefinitionsForTest();
    loadFhirDefinitions();
  });

  const expectInvalid = (resource: unknown) =>
    expect(() => validateResource(resource as Patient)).toThrow();
  const expectValid = (resource: unknown) =>
    expect(() => validateResource(resource as Patient)).not.toThrow();

  it('loadFhirDefinitions is idempotent (safe to call repeatedly)', () => {
    expect(() => {
      loadFhirDefinitions();
      loadFhirDefinitions();
    }).not.toThrow();
  });

  it('accepts a structurally valid Patient', () => {
    expectValid({
      resourceType: 'Patient',
      name: [{ family: 'Doe', given: ['Jane'] }],
      gender: 'female',
      birthDate: '1990-01-01',
    });
  });

  it('rejects a missing/unknown resourceType', () => {
    expectInvalid({ gender: 'male' });
    expectInvalid({ resourceType: 'Nonsense' });
  });

  it('rejects a wrong primitive type', () => {
    expectInvalid({ resourceType: 'Patient', active: 'yes-not-a-boolean' });
  });

  it('rejects a malformed date', () => {
    expectInvalid({ resourceType: 'Patient', birthDate: 'not-a-date' });
  });

  it('rejects unknown/additional properties', () => {
    expectInvalid({ resourceType: 'Patient', notARealFhirField: 'x' });
  });

  it('rejects a resource missing required (min=1) elements', () => {
    // Encounter.status and Encounter.class are both required.
    expectInvalid({ resourceType: 'Encounter' });
  });

  it('does NOT enforce code/enum bindings (so KTD6 enum checks are required)', () => {
    // A bogus gender code is structurally valid — terminology is not checked.
    expectValid({ resourceType: 'Patient', gender: 'not-a-real-gender' });
  });
});
