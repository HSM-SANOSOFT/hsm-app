import type { EncounterEntity } from '@hsm/database/entities';
import type { Encounter } from '@medplum/fhirtypes';
import { EncounterTranslator } from './encounter.translator';

describe('EncounterTranslator (KTD3 references)', () => {
  const translator = new EncounterTranslator();

  it('serializes subject FK to a relative Patient reference', () => {
    const entity = {
      id: 'enc-1',
      status: 'in-progress',
      class: { code: 'IMP' },
      subjectId: 'patient-uuid',
      periodStart: '2026-06-26T08:00:00Z',
    } as EncounterEntity;

    const fhir = translator.toFhir(entity);
    expect(fhir).toMatchObject({
      resourceType: 'Encounter',
      id: 'enc-1',
      status: 'in-progress',
      subject: { reference: 'Patient/patient-uuid' },
      period: { start: '2026-06-26T08:00:00Z' },
    });
  });

  it('round-trips subject reference ⇄ FK', () => {
    const resource: Encounter = {
      resourceType: 'Encounter',
      status: 'planned',
      class: { code: 'AMB' },
      subject: { reference: 'Patient/abc-123' },
    };
    expect(translator.subjectIdFrom(resource)).toBe('abc-123');
  });

  it('returns undefined subject id for a missing/invalid reference', () => {
    expect(
      translator.subjectIdFrom({
        resourceType: 'Encounter',
        status: 'planned',
        class: { code: 'AMB' },
      }),
    ).toBeUndefined();
    expect(
      translator.subjectIdFrom({
        resourceType: 'Encounter',
        status: 'planned',
        class: { code: 'AMB' },
        subject: { reference: 'Group/abc' },
      }),
    ).toBeUndefined();
  });
});
