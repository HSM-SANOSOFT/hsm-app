import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import type { CodeableConcept } from '@medplum/fhirtypes';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { ClinicalResourceBaseEntity } from './clinical-resource.base';
import { PatientEntity } from './patient.entity';

/**
 * FHIR `MedicationRequest` — the SECOND order spine (KTD8), reserved for the
 * Pharmacy module. The spine ships a CONTRACT-ONLY stub (entity shell +
 * translator, exercised by a routing/translator spec) to prove the "one routing
 * contract" generalizes across both order resources BEFORE consumers build on the
 * ServiceRequest-shaped seam. The full Pharmacy workflow is its own plan.
 *
 * Same routing/`basedOn` shape as ServiceRequest: enum-enforced status/intent, a
 * subject FK, and a nullable self-FK for result linkage.
 */
@Entity({
  name: 'medication_request',
  schema: DatabasePostgresSchemasEnum.CLINICAL,
})
@Index('idx_medication_request_routing', ['status'])
export class MedicationRequestEntity extends ClinicalResourceBaseEntity {
  @Column({ type: 'varchar' })
  status: string;

  @Column({ type: 'varchar' })
  intent: string;

  @Column({ name: 'medication', type: 'jsonb', nullable: true })
  medicationCodeableConcept?: CodeableConcept;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => PatientEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: PatientEntity;

  @Column({ name: 'based_on_id', type: 'uuid', nullable: true })
  basedOnId?: string;

  @ManyToOne(() => MedicationRequestEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'based_on_id' })
  basedOn?: MedicationRequestEntity;
}
