import { Module } from '@nestjs/common';
import { PatientModule } from './patient/patient.module';

/**
 * Clinical domain module — the FHIR R4 clinical data spine.
 *
 * The shared FHIR seam (U4) is composed of providers/pipes consumed by each
 * feature module. Patient (U5) is wired here; Encounter (U6) and ServiceRequest
 * (U7) are added in U8.
 */
@Module({
  imports: [PatientModule],
})
export class ClinicalModule {}
