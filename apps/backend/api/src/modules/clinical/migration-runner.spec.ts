/**
 * U2 — migration runner gating (KTD9).
 *
 * Verifies the `DatabasePostgresModule.onModuleInit` branch logic without a DB by
 * mocking `@hsm/config` envs and the injected DataSource:
 * - dev  → synchronize() runs, migrations do NOT run.
 * - non-dev + DB_POSTGRES_RUN_MIGRATIONS=false → runner stays inert.
 * - non-dev + DB_POSTGRES_RUN_MIGRATIONS=true  → runMigrations() runs.
 *
 * The module is re-imported with `jest.isolateModules` per case so the mocked
 * frozen `envs` value is picked up at import time.
 */
type EnvOverride = {
  ENVIRONMENT: string;
  DB_POSTGRES_RUN_MIGRATIONS: boolean;
};

function makeDataSource() {
  return {
    query: jest.fn().mockResolvedValue(undefined),
    synchronize: jest.fn().mockResolvedValue(undefined),
    runMigrations: jest.fn().mockResolvedValue([]),
  };
}

async function runInit(
  env: EnvOverride,
  ds: ReturnType<typeof makeDataSource>,
) {
  let DatabasePostgresModule!: new (
    ...args: unknown[]
  ) => { onModuleInit: () => Promise<void> };

  jest.isolateModules(() => {
    jest.doMock('@hsm/config', () => ({
      envs: {
        ENVIRONMENT: env.ENVIRONMENT,
        DB_POSTGRES_RUN_MIGRATIONS: env.DB_POSTGRES_RUN_MIGRATIONS,
        DB_POSTGRES_HOST: 'localhost',
        DB_POSTGRES_PORT: 5432,
        DB_POSTGRES_USER: 'test',
        DB_POSTGRES_PASSWORD: 'test',
        DB_POSTGRES_DB: 'test',
      },
    }));
    // jest.isolateModules + doMock only take effect on a require() inside the
    // isolation callback, so ESM import cannot be used here.
    // biome-ignore-start lint/style/noCommonJs: jest module isolation needs require().
    const mod = require('@hsm/database/sources/postgres/database-postgres.module');
    // biome-ignore-end lint/style/noCommonJs: jest module isolation needs require().
    DatabasePostgresModule = mod.DatabasePostgresModule;
  });

  const instance = new DatabasePostgresModule(ds);
  await instance.onModuleInit();
}

describe('U2 migration runner gating', () => {
  afterEach(() => jest.resetModules());

  it('dev: synchronizes, never runs migrations', async () => {
    const ds = makeDataSource();
    await runInit(
      { ENVIRONMENT: 'dev', DB_POSTGRES_RUN_MIGRATIONS: false },
      ds,
    );
    expect(ds.synchronize).toHaveBeenCalledTimes(1);
    expect(ds.runMigrations).not.toHaveBeenCalled();
  });

  it('non-dev + flag off: runner stays inert (no synchronize, no migrations)', async () => {
    const ds = makeDataSource();
    await runInit(
      { ENVIRONMENT: 'prod', DB_POSTGRES_RUN_MIGRATIONS: false },
      ds,
    );
    expect(ds.synchronize).not.toHaveBeenCalled();
    expect(ds.runMigrations).not.toHaveBeenCalled();
  });

  it('non-dev + flag on: runs migrations, never synchronizes', async () => {
    const ds = makeDataSource();
    await runInit(
      { ENVIRONMENT: 'prod', DB_POSTGRES_RUN_MIGRATIONS: true },
      ds,
    );
    expect(ds.synchronize).not.toHaveBeenCalled();
    expect(ds.runMigrations).toHaveBeenCalledTimes(1);
  });
});
