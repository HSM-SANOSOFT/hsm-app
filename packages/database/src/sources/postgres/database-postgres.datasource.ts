import { envs } from '@hsm/config';
import { DataSource } from 'typeorm';
import { databasePostgresEntities } from './database-postgres.entities';

/**
 * Standalone TypeORM DataSource for the migration CLI (KTD9).
 *
 * This is NOT used by the running app — the app wires Postgres through
 * `DatabasePostgresModule` (Nest DI). This data source exists only so the TypeORM
 * CLI can `migration:generate` / `migration:run` / `migration:revert` against the
 * Postgres source.
 *
 * Drift guard (KTD9): `synchronize` is hard-OFF here so migrations are generated
 * against a *clean* (non-synchronized) DB. The CI drift check (see
 * `.github/workflows/migration-drift.yml`) asserts a fresh `migration:run` yields a
 * schema equal to `synchronize`'s output — i.e. no pending diff after entities
 * change. Generating against a synchronized DB would produce empty/wrong diffs,
 * the classic TypeORM trap.
 */
export const PostgresMigrationDataSource = new DataSource({
  type: 'postgres',
  host: envs.DB_POSTGRES_HOST,
  port: envs.DB_POSTGRES_PORT,
  username: envs.DB_POSTGRES_USER,
  password: envs.DB_POSTGRES_PASSWORD,
  database: envs.DB_POSTGRES_DB,
  synchronize: false,
  entities: databasePostgresEntities,
  migrations: [`${__dirname}/../../migrations/*.{ts,js}`],
  migrationsTableName: '_clinical_migrations',
});

// The TypeORM CLI imports the default export of the data-source file.
export default PostgresMigrationDataSource;
