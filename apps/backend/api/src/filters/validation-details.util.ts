/**
 * Shared extraction of class-validator `ValidationError[]` into the two shapes
 * the error envelope needs. Both the global `ValidationPipe` `exceptionFactory`
 * (main.ts) and the `ResponseFilter` fallback path use these, so nested-object
 * failures (`@ValidateNested()`) are handled identically — the real constraints
 * live in `children`, not on the parent, so BOTH helpers recurse.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Collect structured, per-field failures — `{ field, constraints: [<keys>] }`.
 * The constraint keys (e.g. `isEmail`, `isNotEmpty`) are stable and locale-free;
 * the frontend maps them to localized messages.
 */
export function collectValidationDetails(
  errors: readonly unknown[],
): { field: string; constraints: string[] }[] {
  const details: { field: string; constraints: string[] }[] = [];

  for (const err of errors) {
    if (
      isRecord(err) &&
      typeof err['property'] === 'string' &&
      isRecord(err['constraints'])
    ) {
      details.push({
        field: err['property'],
        constraints: Object.keys(err['constraints']),
      });
    }

    if (isRecord(err) && Array.isArray(err['children'])) {
      details.push(...collectValidationDetails(err['children']));
    }
  }

  return details;
}

/** Flatten every human-readable constraint message across the error tree. */
export function flattenValidationMessages(
  errors: readonly unknown[],
): string[] {
  const messages: string[] = [];

  for (const err of errors) {
    if (isRecord(err) && isRecord(err['constraints'])) {
      messages.push(
        ...Object.values(err['constraints']).filter(v => typeof v === 'string'),
      );
    }

    if (isRecord(err) && Array.isArray(err['children'])) {
      messages.push(...flattenValidationMessages(err['children']));
    }
  }

  return messages;
}
