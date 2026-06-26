import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import type { CodeableConcept, Coding } from '@medplum/fhirtypes';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ClinicalResourceBaseEntity } from './clinical-resource.base';
import { PatientEntity } from './patient.entity';

/**
 * FHIR `Encounter` system-of-record entity (SP8, KTD3/KTD4).
 *
 * - `status` is a real, indexable column (EncounterStatus — enum-enforced KTD6).
 * - `class` (a Coding) and `type[]` (CodeableConcept[]) are JSONB datatype columns.
 * - `period` start/end are real text columns (FHIR dateTime).
 * - `subject_id` is a real FK → patient.id (KTD3), serialized as `Patient/{uuid}`
 *   by the translator. Reference integrity is enforced by the service
 *   (existence-check → 422), not by relying on the raw DB FK violation.
 */
@Entity({ name: 'encounter', schema: DatabasePostgresSchemasEnum.CLINICAL })
@Index('idx_encounter_subject', ['subjectId'])
export class EncounterEntity extends ClinicalResourceBaseEntity {
  @Column({ type: 'varchar' })
  status: string;

  @Column({ type: 'jsonb', nullable: true })
  class?: Coding;

  @Column({ type: 'jsonb', nullable: true })
  type?: CodeableConcept[];

  @Column({ name: 'period_start', type: 'varchar', nullable: true })
  periodStart?: string;

  @Column({ name: 'period_end', type: 'varchar', nullable: true })
  periodEnd?: string;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: PatientEntity;
}
