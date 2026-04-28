import { OracleColumnsQuery } from '@hsm/database/generator/definitions';
import oracledb from 'oracledb';

export async function oracleColumnsQuery(
  connection: oracledb.Connection,
  schema: string,
  tableName: string,
): Promise<oracledb.Result<OracleColumnsQuery>> {
  return await connection.execute<OracleColumnsQuery>(
    `
            SELECT
                *
            FROM ALL_TAB_COLUMNS c
                     LEFT JOIN ALL_COL_COMMENTS cc
                               ON cc.OWNER = c.OWNER
                                   AND cc.TABLE_NAME = c.TABLE_NAME
                                   AND cc.COLUMN_NAME = c.COLUMN_NAME
            WHERE c.OWNER = :owner
              AND c.TABLE_NAME = :tableName
            ORDER BY c.COLUMN_ID
        `,
    { owner: schema, tableName },
  );
}
