import {
  FhirRequestIntentEnum,
  FhirRequestStatusEnum,
  FhirServiceRequestCategoryEnum,
} from '@hsm/common/enums';
import { ServiceRequestEntity } from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import type { ServiceRequest } from '@medplum/fhirtypes';
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientService } from '../patient/patient.service';
import { ServiceRequestTranslator } from './service-request.translator';

const STATUS_VALUES = new Set<string>(Object.values(FhirRequestStatusEnum));
const INTENT_VALUES = new Set<string>(Object.values(FhirRequestIntentEnum));
const CATEGORY_VALUES = new Set<string>(
  Object.values(FhirServiceRequestCategoryEnum),
);

/**
 * ServiceRequest resource service — the orders routing spine (SP9, KTD8, KTD10).
 *
 * Enforces routing-critical codes against the shared enums (KTD6) since
 * `validateResource` does NOT check terminology bindings — an unvalidated
 * `category` would silently route an order nowhere. Pre-resolves subject /
 * encounter / basedOn references (existence check → 422), mirroring U6.
 */
@Injectable()
export class ServiceRequestService {
  constructor(
    @InjectRepository(ServiceRequestEntity, DatabasesEnum.HsmDbPostgres)
    private readonly serviceRequests: Repository<ServiceRequestEntity>,
    private readonly translator: ServiceRequestTranslator,
    private readonly patientService: PatientService,
  ) {}

  async create(resource: ServiceRequest): Promise<ServiceRequest> {
    this.assertRoutingCodes(resource);

    const subjectId = this.translator.subjectIdFrom(resource);
    if (!subjectId) {
      throw new UnprocessableEntityException(
        'ServiceRequest.subject must be a relative Patient reference (Patient/{id})',
      );
    }
    const patient = await this.patientService.getEntity(subjectId);
    if (!patient) {
      throw new UnprocessableEntityException(
        `Referenced Patient '${subjectId}' does not exist`,
      );
    }

    // basedOn self-reference pre-resolution (result attribution, KTD8).
    const basedOnId = this.translator.basedOnIdFrom(resource);
    if (basedOnId) {
      const parent = await this.serviceRequests.findOne({
        where: { id: basedOnId },
      });
      if (!parent) {
        throw new UnprocessableEntityException(
          `Referenced ServiceRequest '${basedOnId}' (basedOn) does not exist`,
        );
      }
    }

    const entity = this.serviceRequests.create({
      ...this.translator.fromFhir(resource),
      subjectId,
      encounterId: this.translator.encounterIdFrom(resource),
      basedOnId,
    });
    const saved = await this.serviceRequests.save(entity);
    return this.translator.toFhir(saved);
  }

  async getByIdAsFhir(id: string): Promise<ServiceRequest> {
    const entity = await this.serviceRequests.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`ServiceRequest '${id}' not found`);
    }
    return this.translator.toFhir(entity);
  }

  /**
   * Routing/poll query (the fulfilling-module contract): filter by category,
   * status, and/or subject. All params bind as TypeORM parameters.
   */
  async search(params: {
    categoryCode?: string;
    status?: string;
    subjectId?: string;
  }): Promise<ServiceRequest[]> {
    const qb = this.serviceRequests.createQueryBuilder('sr');
    if (params.categoryCode) {
      qb.andWhere('sr.categoryCode = :categoryCode', {
        categoryCode: params.categoryCode,
      });
    }
    if (params.status) {
      qb.andWhere('sr.status = :status', { status: params.status });
    }
    if (params.subjectId) {
      qb.andWhere('sr.subjectId = :subjectId', {
        subjectId: params.subjectId,
      });
    }
    qb.orderBy('sr.createdAt', 'DESC');
    const entities = await qb.getMany();
    return entities.map(e => this.translator.toFhir(e));
  }

  /** KTD6: routing-critical codes must be in the shared enum sets. */
  private assertRoutingCodes(resource: ServiceRequest): void {
    if (!STATUS_VALUES.has(resource.status)) {
      throw new UnprocessableEntityException(
        `Invalid ServiceRequest.status '${resource.status}'`,
      );
    }
    if (!INTENT_VALUES.has(resource.intent)) {
      throw new UnprocessableEntityException(
        `Invalid ServiceRequest.intent '${resource.intent}'`,
      );
    }
    const categoryCode = this.translator.routingCode(resource);
    if (categoryCode !== undefined && !CATEGORY_VALUES.has(categoryCode)) {
      throw new UnprocessableEntityException(
        `Invalid ServiceRequest.category '${categoryCode}'`,
      );
    }
  }
}
