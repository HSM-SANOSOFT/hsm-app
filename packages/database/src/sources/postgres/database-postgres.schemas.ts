import { DatabaseAllSchemasEnum } from '../all/database-all.schemas';

enum SchemasEnum {
  USERS = 'users',
  AUTH = 'auth',
  DOCS = 'docs',
  TEMPLATES = 'templates',
}

export const DatabasePostgresSchemasEnum = {
  ...DatabaseAllSchemasEnum,
  ...SchemasEnum,
} as const;

export type DatabasePostgresSchemasEnum =
  (typeof DatabasePostgresSchemasEnum)[keyof typeof DatabasePostgresSchemasEnum];
