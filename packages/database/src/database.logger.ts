import { Logger as NestLogger } from '@nestjs/common';
import { QueryRunner, Logger as TypeOrmLogger } from 'typeorm';

export class DatabaseLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger(DatabaseLogger.name);
  private readonly needTrimming = true;
  private readonly lengthLimit = 500;
  private readonly logParameters = true;

  stringParce(query: string): string {
    if (this.needTrimming && query.length > this.lengthLimit) {
      return `${query.slice(0, this.lengthLimit)}...`;
    }
    return query;
  }

  paramParce(parameters: unknown[] | undefined): string {
    if (!this.logParameters) return '';
    if (!parameters) return '';
    const paramsString = this.stringParce(JSON.stringify(parameters));
    return paramsString;
  }

  queryRunnerParce(queryRunner?: QueryRunner): string {
    return queryRunner?.connection.name || 'UnknownSource';
  }

  logQuery(query: string, parameters?: unknown[], queryRunner?: QueryRunner) {
    const sourcePart = this.queryRunnerParce(queryRunner);
    const queryPart = this.stringParce(query);
    const paramsPart = this.paramParce(parameters);
    this.logger.debug(
      `DatabaseSource: ${sourcePart} -> Query: ${queryPart} -- Parameters: ${paramsPart}`,
    );
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: unknown[],
    queryRunner?: QueryRunner,
  ) {
    const sourcePart = this.queryRunnerParce(queryRunner);
    const queryPart = this.stringParce(query);
    const paramsPart = this.paramParce(parameters);
    this.logger.error(
      `DatabaseSource: ${sourcePart} -> Query Failed: ${queryPart} -- Parameters: ${paramsPart} -- Error: ${error}`,
    );
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: unknown[],
    queryRunner?: QueryRunner,
  ) {
    const sourcePart = this.queryRunnerParce(queryRunner);
    const queryPart = this.stringParce(query);
    const paramsPart = this.paramParce(parameters);
    this.logger.warn(
      `DatabaseSource: ${sourcePart} -> Slow Query (${time}ms): ${queryPart} -- Parameters: ${paramsPart}`,
    );
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    const sourcePart = this.queryRunnerParce(queryRunner);
    const messagePart = this.stringParce(message);
    this.logger.debug(
      `DatabaseSource: ${sourcePart} -> Schema: ${messagePart}`,
    );
  }

  logMigration(message: string, queryRunner?: QueryRunner) {
    const sourcePart = this.queryRunnerParce(queryRunner);
    const messagePart = this.stringParce(message);
    this.logger.debug(
      `DatabaseSource: ${sourcePart} -> Migration: ${messagePart}`,
    );
  }

  log(
    level: 'log' | 'info' | 'warn',
    message: unknown,
    queryRunner?: QueryRunner,
  ) {
    const sourcePart = this.queryRunnerParce(queryRunner);
    switch (level) {
      case 'log':
      case 'info':
        this.logger.log(
          `DatabaseSource: ${sourcePart} -> message:  ${message}`,
        );
        break;
      case 'warn':
        this.logger.warn(
          `DatabaseSource: ${sourcePart} -> message: ${message}`,
        );
        break;
    }
  }
}
