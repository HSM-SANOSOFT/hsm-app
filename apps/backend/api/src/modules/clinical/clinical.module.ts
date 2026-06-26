import { Module } from '@nestjs/common';
import { EncounterModule } from './encounter/encounter.module';
import { PatientModule } from './patient/patient.module';

/**
 * Clinical domain module — the FHIR R4 clinical data spine.
 *
 * The shared FHIR seam (U4) is composed of providers/pipes consumed by each
 * feature module. Patient (U5) and Encounter (U6) are wired here; ServiceRequest
 * (U7) is added in U8.
 */
@Module({
  imports: [PatientModule, EncounterModule],
})
export class ClinicalModule {}
