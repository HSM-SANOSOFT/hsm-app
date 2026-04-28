import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmExceptionFilter } from './common/filter/typeorm-exeption.filter';
import { SeederModule } from './seeder/seeder.module';
import { DatabaseSourcesModule } from './sources/database-sources.module';

@Global()
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: TypeOrmExceptionFilter,
    },
  ],
  imports: [DatabaseSourcesModule, SeederModule],
  exports: [DatabaseSourcesModule],
})
export class DatabaseModule {}
