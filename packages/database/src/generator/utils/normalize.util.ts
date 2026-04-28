type Normalizable = string | number | boolean | Buffer | Date;
export function normalize<T extends Normalizable>(v: T | null | undefined): T;
export function normalize<T extends Normalizable>(
  v: T | null | undefined,
): T | undefined {
  if (v === null || v === undefined) return undefined;

  if (typeof v === 'string') {
    return v.trim() as T;
  }

  return v;
}
