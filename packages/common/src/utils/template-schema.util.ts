import type { TemplateSchemaIssue } from '../errors/templates.error';

const PRIMITIVE_TYPES = ['string', 'number', 'boolean', 'date', 'any'] as const;
type PrimitiveTag = (typeof PRIMITIVE_TYPES)[number];

export type TemplateSchemaNode =
  | string
  | TemplateSchemaNode[]
  | { [key: string]: TemplateSchemaNode };

export type TemplateSchemaValidationResult =
  | { valid: true }
  | { valid: false; issues: TemplateSchemaIssue[] };

export function validateAgainstTemplateSchema(
  schema: unknown,
  data: unknown,
): TemplateSchemaValidationResult {
  const issues: TemplateSchemaIssue[] = [];
  walk(schema, data, '', issues);
  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}

export function isWellFormedTemplateSchema(schema: unknown): boolean {
  return checkWellFormed(schema);
}

function checkWellFormed(node: unknown): boolean {
  if (typeof node === 'string') {
    return isPrimitiveTag(stripOptional(node));
  }
  if (Array.isArray(node)) {
    return node.length === 1 && checkWellFormed(node[0]);
  }
  if (isPlainObject(node)) {
    return Object.values(node).every(checkWellFormed);
  }
  return false;
}

function walk(
  schema: unknown,
  data: unknown,
  path: string,
  issues: TemplateSchemaIssue[],
): void {
  if (typeof schema === 'string') {
    const { tag, optional } = parseTypeTag(schema);
    if (data === undefined || data === null) {
      if (!optional) {
        issues.push({
          path: path || '<root>',
          expected: tag,
          received: data === undefined ? 'undefined' : 'null',
        });
      }
      return;
    }
    if (!matchesPrimitive(tag, data)) {
      issues.push({
        path: path || '<root>',
        expected: tag,
        received: describe(data),
      });
    }
    return;
  }

  if (Array.isArray(schema)) {
    if (schema.length !== 1) {
      issues.push({
        path: path || '<root>',
        expected: 'malformed schema (array must have a single element)',
        received: 'malformed',
      });
      return;
    }
    if (!Array.isArray(data)) {
      issues.push({
        path: path || '<root>',
        expected: 'array',
        received: describe(data),
      });
      return;
    }
    const itemSchema = schema[0];
    data.forEach((item, idx) =>
      walk(itemSchema, item, joinPath(path, `[${idx}]`), issues),
    );
    return;
  }

  if (isPlainObject(schema)) {
    if (!isPlainObject(data)) {
      issues.push({
        path: path || '<root>',
        expected: 'object',
        received: describe(data),
      });
      return;
    }
    for (const [key, childSchema] of Object.entries(schema)) {
      walk(childSchema, data[key], joinPath(path, key), issues);
    }
    return;
  }

  issues.push({
    path: path || '<root>',
    expected: 'malformed schema',
    received: 'malformed',
  });
}

function parseTypeTag(tag: string): { tag: PrimitiveTag; optional: boolean } {
  const optional = tag.endsWith('?');
  const base = stripOptional(tag);
  if (!isPrimitiveTag(base)) {
    return { tag: 'any', optional };
  }
  return { tag: base, optional };
}

function stripOptional(tag: string): string {
  return tag.endsWith('?') ? tag.slice(0, -1) : tag;
}

function isPrimitiveTag(tag: string): tag is PrimitiveTag {
  return (PRIMITIVE_TYPES as readonly string[]).includes(tag);
}

function matchesPrimitive(tag: PrimitiveTag, value: unknown): boolean {
  switch (tag) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      if (value instanceof Date) return !Number.isNaN(value.getTime());
      if (typeof value === 'string' || typeof value === 'number') {
        return !Number.isNaN(new Date(value).getTime());
      }
      return false;
    case 'any':
      return true;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function describe(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function joinPath(parent: string, child: string): string {
  if (!parent) return child;
  if (child.startsWith('[')) return `${parent}${child}`;
  return `${parent}.${child}`;
}
