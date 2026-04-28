import { OracleIndexQuery } from '@hsm/database/generator/definitions';
import oracledb from 'oracledb';

export async function oracleIndexQuery(
  connection: oracledb.Connection,
  schema: string,
  tableName: string,
): Promise<oracledb.Result<OracleIndexQuery>> {
  return await connection.execute<OracleIndexQuery>(
    `
        SELECT
            *
        FROM ALL_INDEXES ai
                 JOIN ALL_IND_COLUMNS aic
                      ON ai.OWNER      = aic.INDEX_OWNER
                          AND ai.INDEX_NAME = aic.INDEX_NAME
        WHERE ai.TABLE_OWNER = :owner
          AND ai.TABLE_NAME  = :tableName
        ORDER BY ai.INDEX_NAME, aic.COLUMN_POSITION
    `,
    { owner: schema, tableName },
  );
}
