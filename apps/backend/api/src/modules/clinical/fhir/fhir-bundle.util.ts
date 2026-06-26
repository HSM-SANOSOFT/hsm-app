import type { Bundle, Resource } from '@medplum/fhirtypes';

/**
 * Build a FHIR R4 searchset `Bundle` from a list of resources (SP4). Used by the
 * resource controllers' search endpoints so search responses are spec-shaped.
 */
export function toSearchsetBundle<T extends Resource>(
  resources: T[],
): Bundle<T> {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: resources.length,
    entry: resources.map(resource => ({ resource })),
  };
}
