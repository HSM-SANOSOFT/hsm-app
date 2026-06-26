import {
  EncounterEntity,
  MedicationRequestEntity,
  PatientEntity,
  PatientIdentifierEntity,
  ServiceRequestEntity,
} from '@hsm/database/entities';
import { databasePostgresEntities } from '@hsm/database/sources/postgres/database-postgres.entities';

/**
 * Guards against the silent-drop circular-dep bug (packages/database/CLAUDE.md):
 * if any of the four barrel links break, the clinical entities vanish from
 * `databasePostgresEntities` at runtime (empty `Object.values`) and DI fails with
 * UnknownDependenciesException — which a successful build does NOT catch. Asserting
 * the registration array contains the clinical entities is the cheap build-time
 * proxy for the runtime `start:dev` check the plan requires.
 */
describe('clinical entity registration (anti silent-drop)', () => {
  it('registers every clinical entity in databasePostgresEntities', () => {
    for (const entity of [
      PatientEntity,
      PatientIdentifierEntity,
      EncounterEntity,
      ServiceRequestEntity,
      MedicationRequestEntity,
    ]) {
      expect(databasePostgresEntities).toContain(entity);
    }
  });

  it('does NOT register the abstract mapped base', () => {
    const names = databasePostgresEntities.map(e =>
      typeof e === 'function' ? e.name : '',
    );
    expect(names).not.toContain('ClinicalResourceBaseEntity');
  });
});
