import { Module } from '@nestjs/common';
import { DatabasePostgresModule } from './postgres/database-postgres.module';

// Oracle unwired from app boot (feat: standalone pg-native foundation, U1).
// DatabaseOracleModule registered an EAGER TypeOrmModule.forRoot that dialed
// Oracle at module init (ORA-12170 boot stall when Oracle is unreachable). No
// app service queries Oracle — the boot dependency was pure wiring. The Oracle
// module + entities + generator remain ON DISK (retained for the future cutoff
// migration, R2); they are simply not imported here anymore.
@Module({
  imports: [DatabasePostgresModule],
  controllers: [],
  providers: [],
  exports: [DatabasePostgresModule],
})
export class DatabaseSourcesModule {}
