import type {
  PatientEntity,
  PatientIdentifierEntity,
} from '@hsm/database/entities';
import type { Patient } from '@medplum/fhirtypes';
import { PatientTranslator } from './patient.translator';

describe('PatientTranslator', () => {
  const translator = new PatientTranslator();

  const entity = {
    id: 'patient-uuid',
    active: true,
    gender: 'female',
    birthDate: '1990-01-01',
    name: [{ family: 'Doe', given: ['Jane'] }],
    telecom: [{ system: 'phone', value: '555' }],
    address: [{ city: 'Quito' }],
    identifiers: [
      { system: 'urn:mrn', value: '123', use: 'official' },
    ] as PatientIdentifierEntity[],
  } as PatientEntity;

  it('toFhir builds a valid FHIR Patient with relative id + identifiers', () => {
    const fhir = translator.toFhir(entity);
    expect(fhir).toMatchObject({
      resourceType: 'Patient',
      id: 'patient-uuid',
      gender: 'female',
      birthDate: '1990-01-01',
      identifier: [{ system: 'urn:mrn', value: '123', use: 'official' }],
    });
    expect(fhir.name?.[0]).toEqual({ family: 'Doe', given: ['Jane'] });
  });

  it('round-trips name/identifier/birthDate entity → FHIR → entity', () => {
    const fhir = translator.toFhir(entity);
    const back = translator.fromFhir(fhir);
    expect(back.gender).toBe('female');
    expect(back.birthDate).toBe('1990-01-01');
    expect(back.name?.[0]).toEqual({ family: 'Doe', given: ['Jane'] });

    const idRows = translator.toIdentifierEntities(fhir);
    expect(idRows).toEqual([
      { system: 'urn:mrn', value: '123', use: 'official' },
    ]);
  });

  it('drops identifiers missing system or value', () => {
    const resource: Patient = {
      resourceType: 'Patient',
      identifier: [{ value: 'no-system' }, { system: 'urn:x', value: 'ok' }],
    };
    expect(translator.toIdentifierEntities(resource)).toEqual([
      { system: 'urn:x', value: 'ok', use: undefined },
    ]);
  });
});
