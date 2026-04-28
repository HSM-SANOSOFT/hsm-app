import { OracleColumns } from '@hsm/database/generator/definitions';
import { oracleDataTypeSchemaMapping } from '@hsm/database/generator/utils';
import Handlebars from 'handlebars';

let oracleTemplatesHelpersRegistered = false;

export function oracleTemplatesHelpers(isSchema: boolean = false) {
  if (oracleTemplatesHelpersRegistered) return;
  oracleTemplatesHelpersRegistered = true;

  if (isSchema) {
    Handlebars.registerHelper('oracleDataType', (column: OracleColumns) =>
      oracleDataTypeSchemaMapping(column),
    );
  }
  Handlebars.registerHelper('escapeComment', (column: OracleColumns) => {
    if (!column.COMMENTS) return null;
    return column.COMMENTS.replace(/'/g, "''");
  });
}
