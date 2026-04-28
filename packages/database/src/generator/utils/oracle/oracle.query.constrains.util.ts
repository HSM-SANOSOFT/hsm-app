import { OracleConstrainsQuery } from '@hsm/database/generator/definitions';
import oracledb from 'oracledb';

export async function oracleConstrainsQuery(
  connection: oracledb.Connection,
  schema: string,
  tableName: string,
): Promise<oracledb.Result<OracleConstrainsQuery>> {
  return await connection.execute<OracleConstrainsQuery>(
    `
    SELECT
      *
    FROM ALL_CONSTRAINTS ac
    JOIN ALL_CONS_COLUMNS acc
      ON ac.OWNER = acc.OWNER
     AND ac.CONSTRAINT_NAME = acc.CONSTRAINT_NAME
    LEFT JOIN ALL_CONSTRAINTS rcons
      ON ac.R_OWNER = rcons.OWNER
     AND ac.R_CONSTRAINT_NAME = rcons.CONSTRAINT_NAME
    LEFT JOIN ALL_CONS_COLUMNS rcols
      ON rcols.OWNER = rcons.OWNER
     AND rcols.CONSTRAINT_NAME = rcons.CONSTRAINT_NAME
     AND rcols.POSITION = acc.POSITION  -- line up FK col with PK/UK col
    WHERE ac.OWNER = :owner
      AND ac.TABLE_NAME = :tableName
    ORDER BY acc.POSITION
    `,
    { owner: schema, tableName },
  );
}
