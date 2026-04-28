import { Module } from '@nestjs/common';
import { DatabaseOracleModule } from './oracle/database-oracle.module';
import { DatabasePostgresModule } from './postgres/database-postgres.module';

@Module({
  imports: [DatabaseOracleModule, DatabasePostgresModule],
  controllers: [],
  providers: [],
  exports: [DatabaseOracleModule, DatabasePostgresModule],
})
export class DatabaseSourcesModule {}
