import { Module } from '@nestjs/common';

/**
 * Clinical domain module — the FHIR R4 clinical data spine.
 *
 * Empty skeleton in U1. The shared FHIR seam (U4) is composed of providers/pipes
 * consumed by the feature modules, and the Patient (U5), Encounter (U6), and
 * ServiceRequest (U7) feature modules are imported here in U8.
 */
@Module({
  imports: [],
})
export class ClinicalModule {}
