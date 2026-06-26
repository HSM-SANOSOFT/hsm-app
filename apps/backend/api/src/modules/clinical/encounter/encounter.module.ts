import { Module } from '@nestjs/common';
import { FhirValidationPipe } from '../fhir/fhir-validation.pipe';
import { PatientModule } from '../patient/patient.module';
import { EncounterController } from './encounter.controller';
import { EncounterService } from './encounter.service';
import { EncounterTranslator } from './encounter.translator';

/**
 * Encounter feature module (SP8). Imports PatientModule to reuse PatientService
 * for reference pre-resolution (KTD3).
 */
@Module({
  imports: [PatientModule],
  controllers: [EncounterController],
  providers: [EncounterService, EncounterTranslator, FhirValidationPipe],
  exports: [EncounterService],
})
export class EncounterModule {}
