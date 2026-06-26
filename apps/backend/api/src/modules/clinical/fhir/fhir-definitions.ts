import { indexStructureDefinitionBundle } from '@medplum/core';
import { readJson } from '@medplum/definitions';
import type { Bundle } from '@medplum/fhirtypes';

/**
 * Base-R4 StructureDefinition loading (U3 validation spike outcome).
 *
 * `@medplum/core` `validateResource` is a NO-OP-equivalent without indexed
 * StructureDefinitions: it rejects EVERY resource with "Invalid resource type"
 * (it cannot even recognize `Patient`). Once `profiles-types` + `profiles-
 * resources` are indexed it enforces structure, cardinality (required elements),
 * primitive types, and unknown-property rejection — but NOT terminology/code
 * bindings (bad enum codes pass; hence KTD6's separate enum validation).
 *
 * Indexing is process-global and idempotent (guarded so repeated imports / a
 * re-instantiated pipe don't re-index). Call `loadFhirDefinitions()` before the
 * first `validateResource`.
 */
let loaded = false;

export function loadFhirDefinitions(): void {
  if (loaded) return;
  indexStructureDefinitionBundle(
    readJson('fhir/r4/profiles-types.json') as Bundle,
  );
  indexStructureDefinitionBundle(
    readJson('fhir/r4/profiles-resources.json') as Bundle,
  );
  loaded = true;
}

/** Test-only reset so suites can assert the load guard. */
export function resetFhirDefinitionsForTest(): void {
  loaded = false;
}
