import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabasesEnum } from '../sources/database-source.enum';
import { ALL_SEEDS } from './seeder.seeds';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectDataSource(DatabasesEnum.HsmDbPostgres)
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const seed of ALL_SEEDS) {
      if (seed.rows.length === 0) continue;
      const repo = this.dataSource.getRepository(seed.entity);
      const tableName = repo.metadata.tableName;
      const count = await repo.count();
      if (count > 0) {
        this.logger.debug(
          `Skip "${tableName}" — ${count} row(s) already present`,
        );
        continue;
      }
      const result = await repo
        .createQueryBuilder()
        .insert()
        // biome-ignore lint/suspicious/noExplicitAny: heterogeneous seed rows
        .values(seed.rows as any)
        .orIgnore()
        .execute();
      this.logger.log(
        `Seeded "${tableName}" with ${result.identifiers.length}/${seed.rows.length} row(s)`,
      );
    }
  }
}
