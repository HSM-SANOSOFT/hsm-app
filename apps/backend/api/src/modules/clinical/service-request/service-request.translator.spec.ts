import type { ServiceRequestEntity } from '@hsm/database/entities';
import type { ServiceRequest } from '@medplum/fhirtypes';
import { ServiceRequestTranslator } from './service-request.translator';

describe('ServiceRequestTranslator (SP9, KTD8)', () => {
  const translator = new ServiceRequestTranslator();

  const labOrder: ServiceRequest = {
    resourceType: 'ServiceRequest',
    status: 'active',
    intent: 'order',
    category: [{ coding: [{ code: 'laboratory' }] }],
    code: { coding: [{ code: '58410-2' }] },
    subject: { reference: 'Patient/patient-uuid' },
  };

  it('extracts the denormalized routing code from category', () => {
    expect(translator.routingCode(labOrder)).toBe('laboratory');
  });

  it('fromFhir denormalizes categoryCode for routing', () => {
    expect(translator.fromFhir(labOrder).categoryCode).toBe('laboratory');
  });

  it('toFhir serializes subject + basedOn self-reference', () => {
    const entity = {
      id: 'sr-1',
      status: 'active',
      intent: 'order',
      category: [{ coding: [{ code: 'laboratory' }] }],
      subjectId: 'patient-uuid',
      basedOnId: 'sr-parent',
    } as ServiceRequestEntity;

    const fhir = translator.toFhir(entity);
    expect(fhir).toMatchObject({
      resourceType: 'ServiceRequest',
      subject: { reference: 'Patient/patient-uuid' },
      basedOn: [{ reference: 'ServiceRequest/sr-parent' }],
    });
  });

  it('round-trips subject/encounter/basedOn references ⇄ FKs', () => {
    const resource: ServiceRequest = {
      ...labOrder,
      encounter: { reference: 'Encounter/enc-1' },
      basedOn: [{ reference: 'ServiceRequest/sr-parent' }],
    };
    expect(translator.subjectIdFrom(resource)).toBe('patient-uuid');
    expect(translator.encounterIdFrom(resource)).toBe('enc-1');
    expect(translator.basedOnIdFrom(resource)).toBe('sr-parent');
  });
});
