import { Module } from '@nestjs/common';
import { FhirValidationPipe } from '../fhir/fhir-validation.pipe';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { PatientTranslator } from './patient.translator';

/**
 * Patient feature module (SP7). Repositories are globally available via
 * `@hsm/database` (DatabaseModule registers `forFeature` for every entity), so no
 * local `TypeOrmModule.forFeature` is needed. The service is exported so
 * downstream resources (Encounter, ServiceRequest) can reuse the Patient
 * existence check for reference resolution.
 */
@Module({
  controllers: [PatientController],
  providers: [PatientService, PatientTranslator, FhirValidationPipe],
  exports: [PatientService],
})
export class PatientModule {}
