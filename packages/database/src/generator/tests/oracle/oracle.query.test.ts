import { Logger } from '@nestjs/common';
import { getOracleConnection } from '../../datasources';
import { oracleColumnsQuery, oracleConstrainsQuery } from '../../utils';
import { oracleIndexQuery } from '../../utils/oracle/oracle.query.indexes.util';

const logger = new Logger('OracleQueryTest');

export async function oracleQueryTest(args: {
  user: string;
  pass: string;
  host: string;
  port: string;
  db: string;
  table: string;
  schema: string;
  type: string;
}) {
  const connection = await getOracleConnection(
    args.user,
    args.pass,
    args.host,
    args.port,
    args.db,
  );

  const schema = args.schema.toUpperCase();
  const tableName = args.table.toUpperCase();

  try {
    switch (args.type) {
      case 'columns': {
        const columnsResult = await oracleColumnsQuery(
          connection,
          schema,
          tableName,
        );
        logger.debug(columnsResult);
        break;
      }
      case 'constrains': {
        const constrainsResult = await oracleConstrainsQuery(
          connection,
          schema,
          tableName,
        );
        logger.debug(constrainsResult);
        break;
      }
      case 'indexes': {
        const indexesResult = await oracleIndexQuery(
          connection,
          schema,
          tableName,
        );
        logger.debug(indexesResult);
        break;
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
