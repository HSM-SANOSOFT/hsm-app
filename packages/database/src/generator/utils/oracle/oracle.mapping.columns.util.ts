import {
  OracleColumns,
  OracleColumnsQuery,
} from '@hsm/database/generator/definitions';
import { normalize } from '@hsm/database/generator/utils';
import oracledb from 'oracledb';

export function oracleColumnsMapping(
  columnsResult: oracledb.Result<OracleColumnsQuery>,
): OracleColumns[] {
  const columnsRows: OracleColumns[] = columnsResult.rows ?? [];
  return columnsRows.map(column => ({
    OWNER: normalize(column.OWNER),
    TABLE_NAME: normalize(column.TABLE_NAME),
    COLUMN_NAME: normalize(column.COLUMN_NAME),
    DATA_TYPE: normalize(column.DATA_TYPE),
    DATA_TYPE_MOD: normalize(column.DATA_TYPE_MOD),
    DATA_TYPE_OWNER: normalize(column.DATA_TYPE_OWNER),
    DATA_LENGTH: column.DATA_LENGTH,
    DATA_PRECISION: column.DATA_PRECISION,
    DATA_SCALE: column.DATA_SCALE,
    DATA_DEFAULT: normalize(column.DATA_DEFAULT),
    COLUMN_ID: column.COLUMN_ID,
    NULLABLE: normalize(column.NULLABLE),
    COMMENTS: normalize(column.COMMENTS),
  }));
}
