import * as fs from 'fs';
import Handlebars from 'handlebars';
import * as path from 'path';

export function loadTemplate<T>(relativePath: string): (data: T) => string {
  const filePath = path.join(__dirname, '..', 'templates', relativePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const template = Handlebars.compile(content);

  Handlebars.registerHelper('join', (items: unknown[], sep: string) =>
    Array.isArray(items) ? items.join(sep) : items,
  );

  Handlebars.registerHelper('equal', (a, b) => a === b);

  Handlebars.registerHelper(
    'hasComment',
    (columns: Array<{ COMMENTS?: string | null }>) =>
      columns.some(c => c.COMMENTS && c.COMMENTS.length > 0),
  );

  Handlebars.registerHelper(
    'isNotNull',
    (column: { NULLABLE?: string | null }) => column.NULLABLE === 'N',
  );

  Handlebars.registerHelper(
    'hasDefault',
    (column: { DATA_DEFAULT?: string | null }) =>
      !!column.DATA_DEFAULT && column.DATA_DEFAULT.length > 0,
  );

  Handlebars.registerHelper(
    'hasConstraints',
    (constrains: unknown[]) =>
      Array.isArray(constrains) && constrains.length > 0,
  );

  return template as unknown as (ctx: T) => string;
}
