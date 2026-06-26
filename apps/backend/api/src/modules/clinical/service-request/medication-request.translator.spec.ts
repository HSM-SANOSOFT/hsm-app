import type { MedicationRequestEntity } from '@hsm/database/entities';
import type { MedicationRequest } from '@medplum/fhirtypes';
import { MedicationRequestTranslator } from './medication-request.translator';

/**
 * U7 contract generalization (KTD8): the routing/`basedOn` seam must generalize to
 * a SECOND order resource before consumers build on the ServiceRequest-shaped
 * seam. This proves MedicationRequest routes/links through the same translator
 * conventions (enum-enforced status/intent, subject FK + relative ref, self-FK
 * basedOn) — no controller ships; Pharmacy is its own plan.
 */
describe('MedicationRequestTranslator (contract-only, KTD8)', () => {
  const translator = new MedicationRequestTranslator();

  it('serializes subject + basedOn through the same reference seam', () => {
    const entity = {
      id: 'mr-1',
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: { text: 'Amoxicillin 500mg' },
      subjectId: 'patient-uuid',
      basedOnId: 'sr-parent',
    } as MedicationRequestEntity;

    const fhir = translator.toFhir(entity);
    expect(fhir).toMatchObject({
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      subject: { reference: 'Patient/patient-uuid' },
      basedOn: [{ reference: 'ServiceRequest/sr-parent' }],
    });
  });

  it('round-trips references back to FKs (same contract as ServiceRequest)', () => {
    const resource: MedicationRequest = {
      resourceType: 'MedicationRequest',
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: { text: 'x' },
      subject: { reference: 'Patient/p1' },
      basedOn: [{ reference: 'ServiceRequest/sr-1' }],
    };
    expect(translator.subjectIdFrom(resource)).toBe('p1');
    expect(translator.basedOnIdFrom(resource)).toBe('sr-1');
  });
});
