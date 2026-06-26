import type { Reference, Resource } from '@medplum/fhirtypes';

/**
 * The domain ⇄ FHIR contract (KTD1/KTD3/KTD5).
 *
 * Every resource implements a `Translator<TEntity, TResource>`: the relational
 * entity is the system of record, and the translator projects it to/from the FHIR
 * resource at the API edge. Internal callers use the typed service directly and
 * never pay the translation cost (KTD10).
 *
 * - `toFhir(entity)` produces a strict R4 resource for the FHIR facade.
 * - `fromFhir(resource)` produces a partial entity from an inbound resource. It
 *   returns `Partial<TEntity>` because reference FKs (e.g. `subject_id`) are
 *   resolved by the *service* (existence-checked → clean 422 OperationOutcome),
 *   not blindly by the translator.
 */
export interface Translator<TEntity, TResource extends Resource> {
  toFhir(entity: TEntity): TResource;
  fromFhir(resource: TResource): Partial<TEntity>;
}

/**
 * Serialize a stored FK uuid to a FHIR relative reference (`Patient/{uuid}`),
 * KTD3. Returns `undefined` for a null/absent FK so optional references omit
 * cleanly.
 */
export function toRelativeReference(
  resourceType: string,
  id: string | null | undefined,
): Reference | undefined {
  if (!id) return undefined;
  return { reference: `${resourceType}/${id}` };
}

/**
 * Parse a FHIR relative reference (`Patient/{uuid}`) back to its `{ type, id }`
 * parts for FK resolution (KTD3). Accepts only relative references of the
 * expected resource type; absolute URLs and contained (`#id`) references are
 * rejected (out of scope for the spine) by returning `undefined`.
 */
export function fromRelativeReference(
  expectedType: string,
  reference: Reference | string | null | undefined,
): string | undefined {
  const ref = typeof reference === 'string' ? reference : reference?.reference;
  if (!ref) return undefined;
  const [type, id, ...rest] = ref.split('/');
  if (rest.length > 0 || type !== expectedType || !id) return undefined;
  return id;
}
