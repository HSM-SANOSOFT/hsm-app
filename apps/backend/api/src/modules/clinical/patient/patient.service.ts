import { PatientEntity, PatientIdentifierEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import type { Patient } from '@medplum/fhirtypes';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { PatientTranslator } from './patient.translator';

/**
 * Patient resource service — the internal typed API (KTD10). The FHIR controller
 * is a thin facade over this; platform modules call it directly with FHIR/domain
 * shapes and never pay the facade's per-request overhead.
 */
@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(PatientEntity, DatabasesEnum.HsmDbPostgres)
    private readonly patients: Repository<PatientEntity>,
    @InjectRepository(PatientIdentifierEntity, DatabasesEnum.HsmDbPostgres)
    private readonly identifiers: Repository<PatientIdentifierEntity>,
    private readonly translator: PatientTranslator,
  ) {}

  /** Create a Patient from a validated FHIR resource; returns the stored resource. */
  async create(resource: Patient): Promise<Patient> {
    const entity = this.patients.create(this.translator.fromFhir(resource));
    entity.identifiers = this.translator
      .toIdentifierEntities(resource)
      .map(row => this.identifiers.create(row));

    try {
      const saved = await this.patients.save(entity);
      return this.translator.toFhir(saved);
    } catch (err) {
      // Unique (system,value) violation → 409 / OperationOutcome (KTD2).
      if (
        err instanceof QueryFailedError &&
        /uq_patient_identifier_system_value|unique/i.test(err.message)
      ) {
        throw new ConflictException(
          'A patient with one of these identifiers already exists',
        );
      }
      throw err;
    }
  }

  /** Read a Patient by logical id → FHIR resource (404 if absent). */
  async getByIdAsFhir(id: string): Promise<Patient> {
    const entity = await this.patients.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Patient '${id}' not found`);
    return this.translator.toFhir(entity);
  }

  /** Internal: read the entity (existence check used by Encounter/ServiceRequest). */
  async getEntity(id: string): Promise<PatientEntity | null> {
    return await this.patients.findOne({ where: { id } });
  }

  /**
   * Search by business identifier (`system|value` or bare `value`) → FHIR Bundle
   * (SP7 MPI seam). All params bind as TypeORM parameters (never interpolated).
   */
  async searchByIdentifier(token: {
    system?: string;
    value: string;
  }): Promise<Patient[]> {
    const qb = this.patients
      .createQueryBuilder('patient')
      .innerJoin('patient.identifiers', 'identifier')
      .where('identifier.value = :value', { value: token.value });
    if (token.system) {
      qb.andWhere('identifier.system = :system', { system: token.system });
    }
    const entities = await qb.getMany();
    // Re-hydrate identifiers (eager on the entity, but the QB join is partial).
    const ids = entities.map(e => e.id);
    if (!ids.length) return [];
    const full = await this.patients.find({ where: ids.map(id => ({ id })) });
    return full.map(e => this.translator.toFhir(e));
  }
}
