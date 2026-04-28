import { getOracleConnection } from '@hsm/database/generator/datasources';
import { OracleTablesToGenerate } from '@hsm/database/generator/tables';
import {
  indexTemplate,
  oracleEntityTemplate,
} from '@hsm/database/generator/templates';
import { oracleTemplatesHelpers } from '@hsm/database/generator/templates/oracle/oracle.templates.helpers';
import {
  oracleColumnsMapping,
  oracleColumnsQuery,
  oracleConstrainsMapping,
  oracleConstrainsQuery,
  toCamelCase,
} from '@hsm/database/generator/utils';
import { oracleEntityHbsMapping } from '@hsm/database/generator/utils/oracle/oracle.mapping.hbs.entity.util';
import { oracleIndexMapping } from '@hsm/database/generator/utils/oracle/oracle.mapping.indexes.util';
import { oracleIndexQuery } from '@hsm/database/generator/utils/oracle/oracle.query.indexes.util';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

oracleTemplatesHelpers();

export async function oracleEntityGenerator(args: {
  user: string;
  pass: string;
  host: string;
  port: string;
  db: string;
  table: string;
  schema: string;
  log?: boolean;
  save?: boolean;
}) {
  const logger = new Logger('OracleEntityGenerator');
  const connection = await getOracleConnection(
    args.user,
    args.pass,
    args.host,
    args.port,
    args.db,
  );
  try {
    let tablesToGenerate: string[];

    if (args.table === 'all') {
      tablesToGenerate = OracleTablesToGenerate;
    } else {
      tablesToGenerate = [args.table.toUpperCase()];
    }
    const schema = args.schema.toUpperCase();

    const files = tablesToGenerate.map(table => `${toCamelCase(table)}.entity`);

    for (const tableName of tablesToGenerate) {
      logger.log(`Fetching info for ${schema}.${tableName}...`);

      const columnsResult = await oracleColumnsQuery(
        connection,
        schema,
        tableName,
      );
      // logger.debug(columnsResult);

      const columnsMapping = oracleColumnsMapping(columnsResult);
      // logger.debug(columnsMapping);

      const constrainsResult = await oracleConstrainsQuery(
        connection,
        schema,
        tableName,
      );
      //logger.debug(constrainsResult);

      const constrainsMapping = oracleConstrainsMapping(constrainsResult);
      // logger.debug(constrainsMapping);

      const indexesResult = await oracleIndexQuery(
        connection,
        schema,
        tableName,
      );
      // logger.debug(indexesResult);

      const indexesMapping = oracleIndexMapping(indexesResult);
      // logger.debug(indexesMapping);

      const data = oracleEntityHbsMapping(
        columnsMapping,
        constrainsMapping,
        indexesMapping,
      );

      //logger.debug(data);

      const entity = oracleEntityTemplate(data);
      const index = indexTemplate({ files });

      if (args.log) {
        logger.log(`\n${entity}`);
      }

      if (args.save) {
        const outputDir = path.join(__dirname, '../../entities/oracle');

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const filePathEntity = path.join(
          outputDir,
          `${toCamelCase(tableName)}.entity.ts`,
        );
        fs.writeFileSync(filePathEntity, entity, 'utf8');

        const filePathIndex = path.join(outputDir, `index.ts`);
        fs.writeFileSync(filePathIndex, index, 'utf8');

        logger.log(`Saved → ${filePathEntity}`);
      }
    }
  } catch (error) {
    logger.error('Entity Generation failed');
    logger.error(error);
    process.exit(1);
  } finally {
    try {
      await connection.close();
    } catch (error) {
      logger.error('Failed to close connection');
      logger.error(error);
      process.exit(1);
    }
  }
}
