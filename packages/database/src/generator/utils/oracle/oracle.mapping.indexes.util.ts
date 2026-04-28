import {
  OracleIndex,
  OracleIndexQuery,
} from '@hsm/database/generator/definitions';
import { normalize } from '@hsm/database/generator/utils';
import oracledb from 'oracledb';

export function oracleIndexMapping(
  indexResult: oracledb.Result<OracleIndexQuery>,
): OracleIndex[] {
  const rows: OracleIndexQuery[] = indexResult.rows ?? [];

  return rows.map(row => ({
    OWNER: normalize(row.OWNER),
    TABLE_NAME: normalize(row.TABLE_NAME),
    INDEX_NAME: normalize(row.INDEX_NAME),
    UNIQUENESS: normalize(row.UNIQUENESS),
    COLUMN_NAME: normalize(row.COLUMN_NAME),
    COLUMN_POSITION: row.COLUMN_POSITION,
  }));
}
