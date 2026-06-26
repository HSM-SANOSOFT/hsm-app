import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import type { Address, ContactPoint, HumanName } from '@medplum/fhirtypes';
import { Column, Entity, OneToMany } from 'typeorm';
import { ClinicalResourceBaseEntity } from './clinical-resource.base';
import { PatientIdentifierEntity } from './patient-identifier.entity';

/**
 * FHIR `Patient` system-of-record entity (KTD1/KTD4, SP7).
 *
 * - uuid PK (inherited) = FHIR Resource.id = relative reference target.
 * - Searchable scalars (`active`, `gender`, `birthDate`) are real columns.
 * - Complex datatypes not yet searched on (`name[]`, `telecom[]`, `address[]`)
 *   are typed `jsonb` columns (KTD4). When name/address search lands these become
 *   a GIN index or a promoted column — a known future migration (KTD4 caveat).
 * - Business identifiers are the normalized child table (KTD2), not JSONB, so they
 *   get cross-row uniqueness/lookup.
 */
@Entity({ name: 'patient', schema: DatabasePostgresSchemasEnum.CLINICAL })
export class PatientEntity extends ClinicalResourceBaseEntity {
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'varchar', nullable: true })
  gender?: string;

  /** FHIR date (YYYY, YYYY-MM, or YYYY-MM-DD) — stored as text to preserve partials. */
  @Column({ name: 'birth_date', type: 'varchar', nullable: true })
  birthDate?: string;

  @Column({ type: 'jsonb', nullable: true })
  name?: HumanName[];

  @Column({ type: 'jsonb', nullable: true })
  telecom?: ContactPoint[];

  @Column({ type: 'jsonb', nullable: true })
  address?: Address[];

  @OneToMany(
    () => PatientIdentifierEntity,
    identifier => identifier.patient,
    { cascade: true, eager: true },
  )
  identifiers: PatientIdentifierEntity[];
}
