import { EncounterEntity } from '@hsm/database/entities';
import type { Encounter } from '@medplum/fhirtypes';
import { Injectable } from '@nestjs/common';
import {
  fromRelativeReference,
  type Translator,
  toRelativeReference,
} from '../fhir/translator.interface';

/**
 * Encounter domain ⇄ FHIR `Encounter` translator (SP8, KTD3).
 *
 * `subject` serializes to a relative `Patient/{uuid}` reference and parses back to
 * the FK uuid. The service resolves/existence-checks the referenced Patient — the
 * translator never persists a raw FK from a dangling reference.
 */
@Injectable()
export class EncounterTranslator
  implements Translator<EncounterEntity, Encounter>
{
  toFhir(entity: EncounterEntity): Encounter {
    const encounter: Encounter = {
      resourceType: 'Encounter',
      id: entity.id,
      status: entity.status as Encounter['status'],
      class: entity.class ?? { code: 'AMB' },
    };

    if (entity.type?.length) encounter.type = entity.type;
    const subject = toRelativeReference<NonNullable<Encounter['subject']>>(
      'Patient',
      entity.subjectId,
    );
    if (subject) encounter.subject = subject;

    if (entity.periodStart || entity.periodEnd) {
      encounter.period = {
        start: entity.periodStart,
        end: entity.periodEnd,
      };
    }

    return encounter;
  }

  fromFhir(resource: Encounter): Partial<EncounterEntity> {
    return {
      status: resource.status,
      class: resource.class,
      type: resource.type,
      periodStart: resource.period?.start,
      periodEnd: resource.period?.end,
    };
  }

  /** Extract the subject Patient FK uuid from an inbound resource (or undefined). */
  subjectIdFrom(resource: Encounter): string | undefined {
    return fromRelativeReference('Patient', resource.subject);
  }
}
