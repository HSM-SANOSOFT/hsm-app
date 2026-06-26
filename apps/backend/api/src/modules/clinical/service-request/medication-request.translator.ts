import { MedicationRequestEntity } from '@hsm/database/entities';
import type { MedicationRequest } from '@medplum/fhirtypes';
import { Injectable } from '@nestjs/common';
import {
  fromRelativeReference,
  type Translator,
  toRelativeReference,
} from '../fhir/translator.interface';

/**
 * MedicationRequest CONTRACT-ONLY translator (KTD8) — the second order resource.
 *
 * This exists to prove the routing/`basedOn` seam generalizes across both order
 * resources BEFORE consumers build on the ServiceRequest seam. It is exercised by
 * a translator/routing spec only; no controller/endpoint ships in the spine
 * (Pharmacy is its own plan). It deliberately reuses the same reference handling
 * (subject FK + relative ref, self-FK `basedOn`) as ServiceRequest.
 */
@Injectable()
export class MedicationRequestTranslator
  implements Translator<MedicationRequestEntity, MedicationRequest>
{
  toFhir(entity: MedicationRequestEntity): MedicationRequest {
    const resource: MedicationRequest = {
      resourceType: 'MedicationRequest',
      id: entity.id,
      status: entity.status as MedicationRequest['status'],
      intent: entity.intent as MedicationRequest['intent'],
      // medication[x] is required (choice type) — default to a coded placeholder.
      medicationCodeableConcept: entity.medicationCodeableConcept ?? {
        text: 'unspecified',
      },
      subject: toRelativeReference<NonNullable<MedicationRequest['subject']>>(
        'Patient',
        entity.subjectId,
      ) ?? { reference: `Patient/${entity.subjectId}` },
    };

    const basedOn = toRelativeReference<
      NonNullable<MedicationRequest['basedOn']>[number]
    >('ServiceRequest', entity.basedOnId);
    if (basedOn) resource.basedOn = [basedOn];

    return resource;
  }

  fromFhir(resource: MedicationRequest): Partial<MedicationRequestEntity> {
    return {
      status: resource.status,
      intent: resource.intent,
      medicationCodeableConcept: resource.medicationCodeableConcept,
    };
  }

  subjectIdFrom(resource: MedicationRequest): string | undefined {
    return fromRelativeReference('Patient', resource.subject);
  }

  basedOnIdFrom(resource: MedicationRequest): string | undefined {
    return fromRelativeReference('ServiceRequest', resource.basedOn?.[0]);
  }
}
