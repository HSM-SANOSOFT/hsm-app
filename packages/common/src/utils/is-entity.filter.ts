import { getMetadataArgsStorage } from 'typeorm';

// Type guard so `databasePostgresEntities` stays typed as a constructor array
// even when a domain barrel is still empty (its `Object.values` widens to
// `unknown[]`). Filtering with a guard narrows back to the TypeORM-registrable
// shape (a decorated entity constructor) expected by `forFeature`/`forRoot`.
// (`Function` matches TypeORM's `EntityClassOrSchema` constructor target.)
export const isEntity = (v: unknown): v is Function =>
  typeof v === 'function' &&
  getMetadataArgsStorage().tables.some(t => t.target === v);
