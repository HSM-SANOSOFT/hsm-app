import { DatabasePostgresSchemasEnum } from '@hsm/database/sources/postgres';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PatientEntity } from './patient.entity';

/**
 * Normalized FHIR `Identifier[]` child table — the MPI lookup seam (KTD2).
 *
 * Business identifiers (MRN, national id, …) are stored here, NOT as the PK, with
 * a unique `(system, value)` index so the same business id can't be registered
 * twice. Deterministic identifier lookup lives here; probabilistic matching /
 * merge is the Patient Management module's job (deferred).
 */
@Entity({
  name: 'patient_identifier',
  schema: DatabasePostgresSchemasEnum.CLINICAL,
})
@Index('uq_patient_identifier_system_value', ['system', 'value'], {
  unique: true,
})
export class PatientIdentifierEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** FHIR Identifier.system (the namespace URI). */
  @Column({ type: 'varchar' })
  system: string;

  /** FHIR Identifier.value (the business id within the system). */
  @Column({ type: 'varchar' })
  value: string;

  /** FHIR Identifier.use (usual | official | temp | secondary | old). */
  @Column({ type: 'varchar', nullable: true })
  use?: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  patientId: string;

  @ManyToOne(
    () => PatientEntity,
    patient => patient.identifiers,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'patient_id' })
  patient: PatientEntity;
}
