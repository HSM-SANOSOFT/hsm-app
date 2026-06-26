import { EncounterEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import type { Encounter } from '@medplum/fhirtypes';
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientService } from '../patient/patient.service';
import { EncounterTranslator } from './encounter.translator';

/**
 * Encounter resource service (SP8, KTD10). Pre-resolves the `subject` Patient
 * reference (existence check) so a dangling reference becomes a clean 422
 * OperationOutcome — NOT a raw DB FK violation surfaced as a generic 500.
 */
@Injectable()
export class EncounterService {
  constructor(
    @InjectRepository(EncounterEntity, DatabasesEnum.HsmDbPostgres)
    private readonly encounters: Repository<EncounterEntity>,
    private readonly translator: EncounterTranslator,
    private readonly patientService: PatientService,
  ) {}

  async create(resource: Encounter): Promise<Encounter> {
    const subjectId = this.translator.subjectIdFrom(resource);
    if (!subjectId) {
      throw new UnprocessableEntityException(
        'Encounter.subject must be a relative Patient reference (Patient/{id})',
      );
    }

    // KTD3 reference integrity: resolve the Patient before persisting.
    const patient = await this.patientService.getEntity(subjectId);
    if (!patient) {
      throw new UnprocessableEntityException(
        `Referenced Patient '${subjectId}' does not exist`,
      );
    }

    const entity = this.encounters.create({
      ...this.translator.fromFhir(resource),
      subjectId,
    });
    const saved = await this.encounters.save(entity);
    return this.translator.toFhir(saved);
  }

  async getByIdAsFhir(id: string): Promise<Encounter> {
    const entity = await this.encounters.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Encounter '${id}' not found`);
    return this.translator.toFhir(entity);
  }

  /** Search by subject (`Patient/{uuid}`) → FHIR resources (params bound). */
  async searchBySubject(subjectId: string): Promise<Encounter[]> {
    const entities = await this.encounters.find({
      where: { subjectId },
      order: { createdAt: 'DESC' },
    });
    return entities.map(e => this.translator.toFhir(e));
  }
}
