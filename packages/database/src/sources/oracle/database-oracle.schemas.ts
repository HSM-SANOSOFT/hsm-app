import { DatabaseAllSchemasEnum } from '../all/database-all.schemas';

enum SchemasEnum {
  SIS = 'SIS',
}

export const DatabaseOracleSchemasEnum = {
  ...DatabaseAllSchemasEnum,
  ...SchemasEnum,
} as const;

export type DatabaseOracleSchemasEnum =
  (typeof DatabaseOracleSchemasEnum)[keyof typeof DatabaseOracleSchemasEnum];
