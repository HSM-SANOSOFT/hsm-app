import { PatientEntity, PatientIdentifierEntity } from '@hsm/database/entities';
import type { Identifier, Patient } from '@medplum/fhirtypes';
import { Injectable } from '@nestjs/common';
import type { Translator } from '../fhir/translator.interface';

/**
 * Patient domain ⇄ FHIR `Patient` translator (SP7, KTD1).
 *
 * Rebuilds `identifier[]` from the normalized child table (KTD2). The reverse
 * (`fromFhir`) returns a partial entity WITHOUT resolved `identifiers` relations —
 * the service maps `identifier[]` into child rows so it can enforce the unique
 * `(system,value)` constraint and surface a clean 409.
 */
@Injectable()
export class PatientTranslator implements Translator<PatientEntity, Patient> {
  toFhir(entity: PatientEntity): Patient {
    const patient: Patient = {
      resourceType: 'Patient',
      id: entity.id,
      active: entity.active,
    };

    if (entity.gender) patient.gender = entity.gender as Patient['gender'];
    if (entity.birthDate) patient.birthDate = entity.birthDate;
    if (entity.name?.length) patient.name = entity.name;
    if (entity.telecom?.length) patient.telecom = entity.telecom;
    if (entity.address?.length) patient.address = entity.address;

    const identifiers = entity.identifiers
      ?.map(this.identifierToFhir)
      .filter((i): i is Identifier => i !== undefined);
    if (identifiers?.length) patient.identifier = identifiers;

    return patient;
  }

  fromFhir(resource: Patient): Partial<PatientEntity> {
    return {
      active: resource.active ?? true,
      gender: resource.gender,
      birthDate: resource.birthDate,
      name: resource.name,
      telecom: resource.telecom,
      address: resource.address,
    };
  }

  /** Map an inbound FHIR Identifier to a child-row shape (service persists it). */
  toIdentifierEntities(
    resource: Patient,
  ): Array<Pick<PatientIdentifierEntity, 'system' | 'value' | 'use'>> {
    return (resource.identifier ?? [])
      .filter(i => i.system && i.value)
      .map(i => ({
        system: i.system as string,
        value: i.value as string,
        use: i.use,
      }));
  }

  private identifierToFhir(
    row: PatientIdentifierEntity,
  ): Identifier | undefined {
    if (!row.system || !row.value) return undefined;
    const identifier: Identifier = { system: row.system, value: row.value };
    if (row.use) identifier.use = row.use as Identifier['use'];
    return identifier;
  }
}
