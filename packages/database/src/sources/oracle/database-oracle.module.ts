import { envs } from '@hsm/config';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import {
  InjectDataSource,
  TypeOrmModule,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm';
import oracledb from 'oracledb';
import { DataSource, DataSourceOptions } from 'typeorm';
import { DatabasesEnum } from '../database-source.enum';
import { DatabaseSourceOptions } from '../database-source-options';
import {
  databaseOracleEntities,
  databaseOracleOwnEntities,
} from './database-oracle.entities';
import { DatabaseOracleSchemasEnum } from './database-oracle.schemas';

try {
  oracledb.initOracleClient({
    libDir: '/usr/lib/oracle/12.1/client64/lib',
  });
  oracledb.fetchAsString = [oracledb.CLOB];
  oracledb.fetchAsBuffer = [oracledb.BLOB];
} catch (err) {
  Logger.error('Error initializing Oracle client', err);
}

const dataSourceOptions: TypeOrmModuleOptions = {
  ...DatabaseSourceOptions,
  type: 'oracle',
  name: DatabasesEnum.HsmDbOracle,
  host: envs.DB_ORACLE_HOST,
  port: envs.DB_ORACLE_PORT,
  username: envs.DB_ORACLE_USER,
  password: envs.DB_ORACLE_PASSWORD,
  connectString: `${envs.DB_ORACLE_HOST}:${envs.DB_ORACLE_PORT}/${envs.DB_ORACLE_DB}`,
  synchronize: false,
};

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      entities: databaseOracleEntities,
    }),
    TypeOrmModule.forFeature(databaseOracleEntities, DatabasesEnum.HsmDbOracle),
  ],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class DatabaseOracleModule implements OnModuleInit {
  private readonly logger = new Logger(DatabaseOracleModule.name);
  constructor(
    @InjectDataSource(DatabasesEnum.HsmDbOracle)
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.logger.debug('Ensuring schemas exist...');
    const schemas = Object.values(DatabaseOracleSchemasEnum);
    for (const schema of schemas) {
      // TODO: Implement proper schema/user management for Oracle
      // NOTE: Oracle doesn't have a direct equivalent to PostgreSQL schemas. In Oracle, you typically create separate users for isolation, and each user has its own schema. The above code is a placeholder and should be replaced with proper user/schema management logic as needed.

      this.logger.debug(`Schema "${schema}" ensured`);
    }

    if (envs.ENVIRONMENT === 'dev') {
      this.logger.debug('Synchronizing Oracle own entities...');
      if (databaseOracleOwnEntities.length !== 0) {
        const datasource2 = new DataSource({
          ...dataSourceOptions,
          entities: databaseOracleOwnEntities,
        } as DataSourceOptions);
        await datasource2.initialize();
        await datasource2.synchronize();
        await datasource2.destroy();
        this.logger.debug('Oracle own entities synchronized');
      } else {
        this.logger.debug('No own entities to synchronize');
      }
    }
  }
}
