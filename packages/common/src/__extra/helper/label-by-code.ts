type CodeLabel = { code: string; label: string } & Record<string, unknown>;
type Source = Record<string, CodeLabel>;

export type CodeOf<T extends Source> = T[keyof T]['code'];

function labelByCode(source: Source) {
  return Object.fromEntries(
    Object.entries(source).map(([, value]) => [value.code, value.label]),
  );
}
export function labelOf<const T extends Source>(source: T) {
  const map = labelByCode(source);
  return (code: CodeOf<T>): string => map[code];
}
