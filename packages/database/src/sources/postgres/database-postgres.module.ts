import { envs } from '@hsm/config';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabasesEnum } from '../database-source.enum';
import { DatabaseSourceOptions } from '../database-source-options';
import { databasePostgresEntities } from './database-postgres.entities';
import { DatabasePostgresSchemasEnum } from './database-postgres.schemas';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...DatabaseSourceOptions,
      type: 'postgres',
      name: DatabasesEnum.HsmDbPostgres,
      host: envs.DB_POSTGRES_HOST,
      port: envs.DB_POSTGRES_PORT,
      username: envs.DB_POSTGRES_USER,
      password: envs.DB_POSTGRES_PASSWORD,
      database: envs.DB_POSTGRES_DB,
      synchronize: false,
      entities: databasePostgresEntities,
      migrations: [`${__dirname}/../../migrations/*.{ts,js}`],
      migrationsTableName: '_clinical_migrations',
      // Never auto-run on connection — onModuleInit owns the gated decision below.
      migrationsRun: false,
    }),
    TypeOrmModule.forFeature(
      databasePostgresEntities,
      DatabasesEnum.HsmDbPostgres,
    ),
  ],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class DatabasePostgresModule implements OnModuleInit {
  private readonly logger = new Logger(DatabasePostgresModule.name);
  constructor(
    @InjectDataSource(DatabasesEnum.HsmDbPostgres)
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.logger.debug('Ensuring schemas exist...');
    const schemas = Object.values(DatabasePostgresSchemasEnum);
    for (const schema of schemas) {
      await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      this.logger.debug(`Schema "${schema}" ensured`);
    }

    if (envs.ENVIRONMENT === 'dev') {
      // Dev path (unchanged): schema is delivered via synchronize.
      this.logger.debug('Synchronizing database schema...');
      if (databasePostgresEntities.length !== 0) {
        await this.dataSource.synchronize();
        this.logger.debug('Database schema synchronized');
      } else {
        this.logger.debug('No entities to synchronize');
      }
      return;
    }

    // Non-dev migration runner (KTD9): exists but stays INERT unless explicitly
    // activated by config. The spine ships dev-only; the first prod-bound module
    // flips DB_POSTGRES_RUN_MIGRATIONS to enable schema delivery via migrations.
    if (envs.DB_POSTGRES_RUN_MIGRATIONS) {
      this.logger.debug('Running pending migrations...');
      const applied = await this.dataSource.runMigrations();
      this.logger.debug(
        `Migrations applied: ${applied.map(m => m.name).join(', ') || 'none'}`,
      );
    } else {
      this.logger.debug(
        'Migration runner inert (DB_POSTGRES_RUN_MIGRATIONS not set)',
      );
    }
  }
}
