import { DatabasePostgresSchemasEnum } from '@hsm/database/sources';

/**
 * U1 — clinical schema registration guards.
 *
 * The CLINICAL schema must be a real member of the Postgres schema enum (it is
 * auto-created in `onModuleInit`). The entity-barrel non-empty guard against the
 * silent-drop circular-dep bug lives in `clinical-entities.spec.ts` (asserted
 * once U5 lands entities); keeping it separate keeps this file pure-enum.
 */
describe('U1 clinical schema', () => {
  it('exposes CLINICAL === "clinical"', () => {
    expect(DatabasePostgresSchemasEnum.CLINICAL).toBe('clinical');
  });

  it('CLINICAL is included in the schema enum values', () => {
    expect(Object.values(DatabasePostgresSchemasEnum)).toContain('clinical');
  });
});
