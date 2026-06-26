import { Module } from '@nestjs/common';
import { FhirValidationPipe } from '../fhir/fhir-validation.pipe';
import { PatientModule } from '../patient/patient.module';
import { MedicationRequestTranslator } from './medication-request.translator';
import { ServiceRequestController } from './service-request.controller';
import { ServiceRequestService } from './service-request.service';
import { ServiceRequestTranslator } from './service-request.translator';

/**
 * ServiceRequest feature module (SP9). The MedicationRequestTranslator is the
 * contract-only second-order-resource proof (KTD8); it has no controller in the
 * spine but is provided so its routing/basedOn seam is wired and tested.
 */
@Module({
  imports: [PatientModule],
  controllers: [ServiceRequestController],
  providers: [
    ServiceRequestService,
    ServiceRequestTranslator,
    MedicationRequestTranslator,
    FhirValidationPipe,
  ],
  exports: [ServiceRequestService],
})
export class ServiceRequestModule {}
