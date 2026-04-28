import { getOracleConnection } from '@hsm/database/generator/datasources';
import { OracleTablesToGenerate } from '@hsm/database/generator/tables';
import { oracleSchemaTemplate } from '@hsm/database/generator/templates';
import { oracleTemplatesHelpers } from '@hsm/database/generator/templates/oracle/oracle.templates.helpers';
import {
  oracleColumnsMapping,
  oracleColumnsQuery,
  oracleConstrainsMapping,
  oracleConstrainsQuery,
} from '@hsm/database/generator/utils';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export async function oracleSchemaGenerator(args: {
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
  const logger = new Logger('OracleSchemaGenerator');
  oracleTemplatesHelpers(true);
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

    for (const tableName of tablesToGenerate) {
      logger.log(`Fetching DDL for ${schema}.${tableName}...`);

      const columnsResult = await oracleColumnsQuery(
        connection,
        schema,
        tableName,
      );
      // logger.debug(columnsResult);

      const columnsMapping = oracleColumnsMapping(columnsResult);

      const constrainsResult = await oracleConstrainsQuery(
        connection,
        schema,
        tableName,
      );
      // logger.debug(constrainsResult);

      const [pkConstraints, fkConstraints, ukConstraints] =
        oracleConstrainsMapping(constrainsResult);
      // logger.debug(constrainsMapping);

      const data = {
        tableName,
      };

      const ddl = oracleSchemaTemplate(data);

      if (args.log) {
        logger.log(`\n${ddl}`);
      }

      if (args.save) {
        const outputDir = path.join(__dirname, '../../schemas/oracle');

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const filePath = path.join(outputDir, `${tableName.toLowerCase()}.sql`);
        fs.writeFileSync(filePath, ddl, 'utf8');

        logger.log(`Saved → ${filePath}`);
      }
    }
  } catch (error) {
    logger.error('DDL extraction failed');
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
