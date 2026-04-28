import { OracleColumns } from '@hsm/database/generator/definitions';

export function oracleDataTypeSchemaMapping(column: OracleColumns): string {
  const type = column.DATA_TYPE;
  if (!type) return 'UNKNOWN';
  switch (type) {
    case 'NUMBER': {
      const precision = column.DATA_PRECISION;
      const scale = column.DATA_SCALE;
      if (precision != null && scale != null) {
        return `NUMBER(${precision},${scale})`;
      }
      if (precision != null) {
        return `NUMBER(${precision})`;
      }
      return 'NUMBER';
    }
    case 'VARCHAR2':
    case 'VARCHAR': {
      return `${type}(${column.DATA_LENGTH})`;
    }
    default: {
      return type;
    }
  }
}
