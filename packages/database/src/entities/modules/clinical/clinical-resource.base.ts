import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Shared base for every clinical FHIR-resource entity (KTD2/KTD4).
 *
 * Conventions, mirroring the existing `DocumentsEntity` shape:
 * - `id` is a server-assigned UUID = the FHIR `Resource.id` = the relative
 *   reference target (`Patient/{uuid}`). Business identifiers (MRN, order/accession
 *   numbers) are NEVER the PK — they live in the normalized identifier child table
 *   with a unique `(system, value)` index (the MPI seam).
 * - Timestamps + soft-delete columns are standard so soft-delete read semantics
 *   (404 vs 410) can be decided uniformly when update/delete interactions land.
 *
 * Datatype persistence (KTD4) is per-entity, not inherited (shapes differ):
 * - Searchable scalars (`birthDate`, `gender`, `status`, `intent`, `category`) are
 *   real, indexable columns.
 * - Complex FHIR datatypes not yet searched on (`HumanName[]`, `Address[]`,
 *   `ContactPoint[]`, `CodeableConcept`) are typed `jsonb` columns.
 * - Cross-resource references are real FK columns (`subject_id`) serialized to
 *   relative references by the translator (KTD3).
 *
 * `@Entity` is intentionally NOT applied here — this is an abstract mapped base, so
 * `isEntity()` correctly excludes it from `databasePostgresEntities`.
 */
export abstract class ClinicalResourceBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
