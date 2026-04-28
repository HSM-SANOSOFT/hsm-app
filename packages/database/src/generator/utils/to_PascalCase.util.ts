import { normalize } from '@hsm/database/generator/utils/normalize.util';

export function toPascalCase(v: string | null | undefined): string;
export function toPascalCase(v: string | null | undefined): string | undefined {
  const value = normalize(v);

  if (value === undefined) return undefined;

  return value
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
