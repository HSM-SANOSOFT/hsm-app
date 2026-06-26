import { Module } from '@nestjs/common';
import { EncounterModule } from './encounter/encounter.module';
import { PatientModule } from './patient/patient.module';
import { ServiceRequestModule } from './service-request/service-request.module';

/**
 * Clinical domain module — the FHIR R4 clinical data spine.
 *
 * The shared FHIR seam (U4) is composed of providers/pipes consumed by each
 * feature module. Patient (U5), Encounter (U6), and ServiceRequest (U7) are all
 * wired here; U8 assembles + documents the extension recipe.
 */
@Module({
  imports: [PatientModule, EncounterModule, ServiceRequestModule],
})
export class ClinicalModule {}
