import {
  OracleConstrains,
  OracleConstrainsQuery,
} from '@hsm/database/generator/definitions';
import { normalize } from '@hsm/database/generator/utils';
import oracledb from 'oracledb';

export function oracleConstrainsMapping(
  constrainsResult: oracledb.Result<OracleConstrainsQuery>,
): OracleConstrains[] {
  const constrainsRows = constrainsResult.rows ?? [];

  return constrainsRows.map(constrain => ({
    OWNER: normalize(constrain.OWNER),
    TABLE_NAME: normalize(constrain.TABLE_NAME),
    COLUMN_NAME: normalize(constrain.COLUMN_NAME),
    CONSTRAINT_NAME: normalize(constrain.CONSTRAINT_NAME),
    CONSTRAINT_TYPE: normalize(constrain.CONSTRAINT_TYPE),
    R_OWNER: normalize(constrain.R_OWNER),
    R_CONSTRAINT_NAME: normalize(constrain.R_CONSTRAINT_NAME),
    POSITION: normalize(constrain.POSITION),
    TABLE_NAME_2: normalize(constrain.TABLE_NAME_2),
    STATUS: normalize(constrain.STATUS),
    SEARCH_CONDITION: normalize(constrain.SEARCH_CONDITION),
    COLUMN_NAME_1: normalize(constrain.COLUMN_NAME_1),
  }));
}
