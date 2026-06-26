// Clinical domain entity barrel.
//
// CIRCULAR-DEP HAZARD (see packages/database/CLAUDE.md): every entity here imports
// `DatabasePostgresSchemasEnum` from `@hsm/database/sources/postgres`, and this
// barrel is consumed by `database-postgres.entities.ts` via `import * as`. The
// four-link chain (entity file -> this barrel -> modules/index -> entities
// registration) must stay intact, and `sources/postgres/index.ts` must NEVER
// re-export `database-postgres.entities`, or these entities are silently dropped
// from `forFeature` at runtime.
//
// Entities are added by U5 (Patient + identifier), U6 (Encounter), U7
// (ServiceRequest + MedicationRequest stub).
//
// NOTE: `clinical-resource.base` is an abstract mapped base (no `@Entity`) — it is
// intentionally NOT re-exported here so it never reaches `Object.values()` for
// `forFeature` registration (and `isEntity()` would filter it regardless).
export * from './patient.entity';
export * from './patient-identifier.entity';
