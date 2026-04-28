import { normalize } from '@hsm/database/generator/utils/normalize.util';

export function toCamelCase(v: string | null | undefined): string;
export function toCamelCase(v: string | null | undefined): string | undefined {
  const value = normalize(v);
  if (value === undefined) return undefined;

  return value.toLowerCase().replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}
