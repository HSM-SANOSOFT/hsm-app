import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import type { CodeableConcept, Reference } from '@medplum/fhirtypes';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ClinicalResourceBaseEntity } from './clinical-resource.base';
import { EncounterEntity } from './encounter.entity';
import { PatientEntity } from './patient.entity';

/**
 * FHIR `ServiceRequest` system-of-record entity — the orders routing spine (SP9,
 * KTD8).
 *
 * Routing model:
 * - `status` + `intent` are enum-enforced columns (KTD6) — bad routing codes
 *   can't silently break order routing.
 * - `categoryCode` is a DENORMALIZED routing key column (real, indexed) extracted
 *   from `category[0].coding[0].code`; the full `category` CodeableConcept[] stays
 *   in JSONB. Fulfilling modules poll on `categoryCode` + `status=active`.
 * - `code` (the orderable) is a JSONB CodeableConcept (curated, advisory — KTD6).
 * - `performer` (the target service) is JSONB References[].
 * - `subject_id` FK → patient (required), `encounter_id` FK → encounter (optional,
 *   soft-dep on U6), `based_on_id` nullable self-FK for result linkage (KTD8).
 */
@Entity({
  name: 'service_request',
  schema: DatabasePostgresSchemasEnum.CLINICAL,
})
@Index('idx_service_request_routing', ['categoryCode', 'status'])
@Index('idx_service_request_subject', ['subjectId'])
export class ServiceRequestEntity extends ClinicalResourceBaseEntity {
  @Column({ type: 'varchar' })
  status: string;

  @Column({ type: 'varchar' })
  intent: string;

  /** Denormalized routing key (category[0].coding[0].code) — the poll key. */
  @Column({ name: 'category_code', type: 'varchar', nullable: true })
  categoryCode?: string;

  @Column({ type: 'jsonb', nullable: true })
  category?: CodeableConcept[];

  @Column({ type: 'jsonb', nullable: true })
  code?: CodeableConcept;

  @Column({ type: 'jsonb', nullable: true })
  performer?: Reference[];

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: PatientEntity;

  @Column({ name: 'encounter_id', type: 'uuid', nullable: true })
  encounterId?: string;

  @ManyToOne(() => EncounterEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'encounter_id' })
  encounter?: EncounterEntity;

  /** Nullable self-FK for result attribution (`basedOn`, KTD8). */
  @Column({ name: 'based_on_id', type: 'uuid', nullable: true })
  basedOnId?: string;

  @ManyToOne(() => ServiceRequestEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'based_on_id' })
  basedOn?: ServiceRequestEntity;
}
