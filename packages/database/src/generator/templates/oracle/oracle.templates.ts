import {
  OracleEntityHbsData,
  OracleSchemaHbsData,
} from '@hsm/database/generator/definitions';
import { loadTemplate } from '@hsm/database/generator/utils';

export const oracleSchemaTemplate = loadTemplate<OracleSchemaHbsData>(
  'oracle/oracle.template.schema.hbs',
);

export const oracleEntityTemplate = loadTemplate<OracleEntityHbsData>(
  'oracle/oracle.template.entity.hbs',
);
