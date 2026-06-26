import {
  FhirRequestStatusEnum,
  FhirServiceRequestCategoryEnum,
} from '@hsm/common/enums';
import type { Bundle, ServiceRequest } from '@medplum/fhirtypes';
import {
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { toSearchsetBundle } from '../fhir/fhir-bundle.util';
import { FhirController } from '../fhir/fhir-controller.base';
import { FhirSearchPipe } from '../fhir/fhir-search.pipe';
import { FhirValidationPipe } from '../fhir/fhir-validation.pipe';
import { ServiceRequestService } from './service-request.service';

const serviceRequestSearchPipe = new FhirSearchPipe({
  enums: {
    status: Object.values(FhirRequestStatusEnum),
    category: Object.values(FhirServiceRequestCategoryEnum),
  },
  referenceParams: { subject: 'Patient' },
});

/**
 * FHIR `ServiceRequest` facade at `/fhir/R4/ServiceRequest` (SP9). Search
 * implements the fulfilling-module routing/poll contract
 * (`?category=&status=&subject=`).
 */
@FhirController('ServiceRequest')
export class ServiceRequestController {
  constructor(private readonly serviceRequestService: ServiceRequestService) {}

  @Get()
  async search(@Query() query: unknown): Promise<Bundle<ServiceRequest>> {
    const { raw, references } = serviceRequestSearchPipe.transform(query);
    const results = await this.serviceRequestService.search({
      categoryCode: raw.category,
      status: raw.status,
      subjectId: references.subject,
    });
    return toSearchsetBundle(results);
  }

  @Get(':id')
  async read(@Param('id') id: string): Promise<ServiceRequest> {
    return await this.serviceRequestService.getByIdAsFhir(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(FhirValidationPipe) resource: ServiceRequest,
  ): Promise<ServiceRequest> {
    return await this.serviceRequestService.create(resource);
  }
}
