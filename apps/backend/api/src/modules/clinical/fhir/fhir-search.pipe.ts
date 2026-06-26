import {
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Parsed `identifier` search token (`system|value` or bare `value`).
 */
export interface IdentifierSearchToken {
  system?: string;
  value: string;
}

/**
 * Validates FHIR search query params for the spine's targeted search set (SP4,
 * KTD7). Comprehensive FHIR Search (chaining, `_include`, modifiers) is out of
 * scope.
 *
 * Guarantees:
 * - Enum params (`status`/`intent`/`category`) are allowlisted against
 *   `clinical.enum.ts` sets — an out-of-set value is rejected with 422 BEFORE it
 *   reaches the service, so a bad `category` can't silently route an order
 *   nowhere (KTD6).
 * - `identifier` is regex-validated as `system|value` (or bare `value`).
 * - `subject` is validated as a `Patient/{id}` relative reference.
 * - The pipe only *validates*; the value is returned untouched. Services pass
 *   these as **bound** TypeORM parameters (never interpolated) — the pipe does not
 *   build SQL.
 *
 * Construct one per resource with the allowed param config.
 */
export interface FhirSearchConfig {
  /** Allowed enum values per query param, e.g. `{ status: [...], category: [...] }`. */
  enums?: Record<string, readonly string[]>;
  /** Param names that must parse as `system|value` identifier tokens. */
  identifierParams?: readonly string[];
  /** Param names that must parse as `Type/{id}` references (value = expected Type). */
  referenceParams?: Record<string, string>;
}

export interface FhirSearchResult {
  raw: Record<string, string>;
  identifiers: Record<string, IdentifierSearchToken>;
  references: Record<string, string>;
}

const IDENTIFIER_TOKEN = /^(?:([^|]+)\|)?([^|]+)$/;

@Injectable()
export class FhirSearchPipe implements PipeTransform {
  constructor(private readonly config: FhirSearchConfig) {}

  transform(query: unknown): FhirSearchResult {
    const raw: Record<string, string> = {};
    const identifiers: Record<string, IdentifierSearchToken> = {};
    const references: Record<string, string> = {};

    const input = (query ?? {}) as Record<string, unknown>;

    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue;
      if (typeof value !== 'string') {
        throw new UnprocessableEntityException(
          `Search param '${key}' must be a single string value`,
        );
      }
      raw[key] = value;
    }

    // Enum allowlist (routing-critical codes).
    for (const [param, allowed] of Object.entries(this.config.enums ?? {})) {
      const v = raw[param];
      if (v !== undefined && !allowed.includes(v)) {
        throw new UnprocessableEntityException(
          `Invalid value '${v}' for search param '${param}'`,
        );
      }
    }

    // Identifier token parsing (`system|value`).
    for (const param of this.config.identifierParams ?? []) {
      const v = raw[param];
      if (v === undefined) continue;
      const m = IDENTIFIER_TOKEN.exec(v);
      if (!m) {
        throw new UnprocessableEntityException(
          `Invalid identifier token for '${param}' (expected 'system|value')`,
        );
      }
      identifiers[param] = { system: m[1], value: m[2] };
    }

    // Reference parsing (`Type/{id}`).
    for (const [param, expectedType] of Object.entries(
      this.config.referenceParams ?? {},
    )) {
      const v = raw[param];
      if (v === undefined) continue;
      const [type, id, ...rest] = v.split('/');
      if (rest.length > 0 || type !== expectedType || !id) {
        throw new UnprocessableEntityException(
          `Invalid reference for '${param}' (expected '${expectedType}/{id}')`,
        );
      }
      references[param] = id;
    }

    return { raw, identifiers, references };
  }
}
