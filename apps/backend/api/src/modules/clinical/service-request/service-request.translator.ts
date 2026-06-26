import { ServiceRequestEntity } from '@hsm/database/entities';
import type { ServiceRequest } from '@medplum/fhirtypes';
import { Injectable } from '@nestjs/common';
import {
  fromRelativeReference,
  type Translator,
  toRelativeReference,
} from '../fhir/translator.interface';

/**
 * ServiceRequest domain ⇄ FHIR `ServiceRequest` translator (SP9, KTD8).
 *
 * Denormalizes `category[0].coding[0].code` into the routing key column, and
 * serializes subject/encounter/basedOn FKs to relative references.
 */
@Injectable()
export class ServiceRequestTranslator
  implements Translator<ServiceRequestEntity, ServiceRequest>
{
  toFhir(entity: ServiceRequestEntity): ServiceRequest {
    const resource: ServiceRequest = {
      resourceType: 'ServiceRequest',
      id: entity.id,
      status: entity.status as ServiceRequest['status'],
      intent: entity.intent as ServiceRequest['intent'],
      subject: toRelativeReference<NonNullable<ServiceRequest['subject']>>(
        'Patient',
        entity.subjectId,
      ) ?? { reference: `Patient/${entity.subjectId}` },
    };

    if (entity.category?.length) resource.category = entity.category;
    if (entity.code) resource.code = entity.code;
    if (entity.performer?.length) {
      resource.performer = entity.performer as ServiceRequest['performer'];
    }

    const encounter = toRelativeReference<
      NonNullable<ServiceRequest['encounter']>
    >('Encounter', entity.encounterId);
    if (encounter) resource.encounter = encounter;

    const basedOn = toRelativeReference<
      NonNullable<ServiceRequest['basedOn']>[number]
    >('ServiceRequest', entity.basedOnId);
    if (basedOn) resource.basedOn = [basedOn];

    return resource;
  }

  fromFhir(resource: ServiceRequest): Partial<ServiceRequestEntity> {
    return {
      status: resource.status,
      intent: resource.intent,
      category: resource.category,
      categoryCode: this.routingCode(resource),
      code: resource.code,
      performer: resource.performer,
    };
  }

  /** Extract the denormalized routing key from category[0].coding[0].code. */
  routingCode(resource: ServiceRequest): string | undefined {
    return resource.category?.[0]?.coding?.[0]?.code;
  }

  subjectIdFrom(resource: ServiceRequest): string | undefined {
    return fromRelativeReference('Patient', resource.subject);
  }

  encounterIdFrom(resource: ServiceRequest): string | undefined {
    return fromRelativeReference('Encounter', resource.encounter);
  }

  basedOnIdFrom(resource: ServiceRequest): string | undefined {
    return fromRelativeReference('ServiceRequest', resource.basedOn?.[0]);
  }
}
