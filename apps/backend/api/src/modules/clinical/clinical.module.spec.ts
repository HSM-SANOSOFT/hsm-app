import {
  EncounterEntity,
  MedicationRequestEntity,
  PatientEntity,
  PatientIdentifierEntity,
  ServiceRequestEntity,
} from '@hsm/database/entities';
import { DatabasesEnum } from '@hsm/database/sources';
import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClinicalModule } from './clinical.module';
import { EncounterController } from './encounter/encounter.controller';
import { PatientController } from './patient/patient.controller';
import { ServiceRequestController } from './service-request/service-request.controller';

/**
 * U8 — DI boot check. Compiles ClinicalModule with all three feature modules and
 * stubbed repositories, proving the providers wire with no DI errors (the closest
 * we can get to the `start:dev` boot check without a live DB). Repository tokens —
 * normally supplied by the global DatabaseModule — are provided here by a small
 * @Global() stub module so the feature modules resolve them.
 */
const REPO_TOKENS = [
  getRepositoryToken(PatientEntity, DatabasesEnum.HsmDbPostgres),
  getRepositoryToken(PatientIdentifierEntity, DatabasesEnum.HsmDbPostgres),
  getRepositoryToken(EncounterEntity, DatabasesEnum.HsmDbPostgres),
  getRepositoryToken(ServiceRequestEntity, DatabasesEnum.HsmDbPostgres),
  getRepositoryToken(MedicationRequestEntity, DatabasesEnum.HsmDbPostgres),
];

@Global()
@Module({
  providers: REPO_TOKENS.map(token => ({ provide: token, useValue: {} })),
  exports: REPO_TOKENS,
})
class StubDbModule {}

describe('ClinicalModule boot', () => {
  it('compiles with Patient, Encounter, and ServiceRequest controllers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [StubDbModule, ClinicalModule],
    }).compile();

    expect(moduleRef.get(PatientController)).toBeDefined();
    expect(moduleRef.get(EncounterController)).toBeDefined();
    expect(moduleRef.get(ServiceRequestController)).toBeDefined();
  });
});
