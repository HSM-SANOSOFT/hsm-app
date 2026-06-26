// FHIR R4 routing-critical code sets for the clinical data spine, shared FE/BE.
//
// These are the *enum-enforced* coded fields (KTD6): `status`, `intent`, and
// `category` drive ServiceRequest routing and Encounter/Patient state, so they
// are validated against these sets at the pipe/service boundary. `@medplum/core`
// `validateResource` does NOT check terminology bindings standalone (confirmed by
// the U3 validation spike — bad enum codes pass structural validation), so an
// unvalidated `category` would silently route an order nowhere. Free-text curated
// `CodeableConcept` codes (LOINC/SNOMED/ICD) stay advisory in v1 and are not
// enumerated here.

/** FHIR R4 `Patient.gender` (AdministrativeGender value set). */
export enum FhirAdministrativeGenderEnum {
  Male = 'male',
  Female = 'female',
  Other = 'other',
  Unknown = 'unknown',
}

/** FHIR R4 `Encounter.status` (EncounterStatus value set). */
export enum FhirEncounterStatusEnum {
  Planned = 'planned',
  Arrived = 'arrived',
  Triaged = 'triaged',
  InProgress = 'in-progress',
  OnLeave = 'onleave',
  Finished = 'finished',
  Cancelled = 'cancelled',
  EnteredInError = 'entered-in-error',
  Unknown = 'unknown',
}

/** FHIR R4 `ServiceRequest.status` / `MedicationRequest.status` (RequestStatus). */
export enum FhirRequestStatusEnum {
  Draft = 'draft',
  Active = 'active',
  OnHold = 'on-hold',
  Revoked = 'revoked',
  Completed = 'completed',
  EnteredInError = 'entered-in-error',
  Unknown = 'unknown',
}

/** FHIR R4 `ServiceRequest.intent` / `MedicationRequest.intent` (RequestIntent). */
export enum FhirRequestIntentEnum {
  Proposal = 'proposal',
  Plan = 'plan',
  Directive = 'directive',
  Order = 'order',
  OriginalOrder = 'original-order',
  ReflexOrder = 'reflex-order',
  FillerOrder = 'filler-order',
  InstanceOrder = 'instance-order',
  Option = 'option',
}

/**
 * ServiceRequest routing category — the denormalized routing key that fulfilling
 * modules (Lab/Imaging/Pharmacy) poll on. Curated subset aligned with the FHIR R4
 * ServiceRequest category examples; this is the spine's routing contract.
 */
export enum FhirServiceRequestCategoryEnum {
  Laboratory = 'laboratory',
  Imaging = 'imaging',
  Procedure = 'procedure',
  Counselling = 'counselling',
  Education = 'education',
}
