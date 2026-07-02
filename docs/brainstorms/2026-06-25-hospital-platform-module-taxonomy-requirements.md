---
date: 2026-06-25
topic: hospital-platform-module-taxonomy
---

# Hospital platform — module & submodule taxonomy

## Summary

Define the committed information architecture for the unified hospital platform: an
ERPNext-style suite of toggleable domain modules with a robust medical core. The
taxonomy is **6 domains / ~30 modules**, organized so each module is a pluggable
"app", roles are a data-driven registry, and a small set of shared services
(Scheduling, Billing, Inventory, Documents, Communications) are plugged into rather
than re-implemented per module. This replaces the placeholder module set currently
flagged in `apps/frontend/web/src/app/layout/nav/nav-node.ts` as "a sensible
placeholder IA, not a committed one."

## Problem Frame

The platform aims to be the complete unified system for the business — ERP + HIS +
LIS + RIS/PACS and adjacent business apps — but its modules and roles were never
committed. The frontend ships placeholder shells (Clinical, Scheduling, Billing,
Pharmacy, Laboratory) backed by a shared placeholder component, and the backend has
real plumbing only for users/auth, templates, documents, email/comms, and settings.
A 12-branch role enum (`packages/common/src/enums/roles.enum.ts`) sketches the
org chart but most branches drive nothing yet.

The current production system is a legacy hospital application reached through a
read-only Oracle bridge (`SELECT`/`UPDATE` only, per `CLAUDE.md`). The new platform
is meant to absorb that system over time, so the taxonomy is the skeleton everything
hangs off: it decides what gets built, who owns it, and how the modern app maps to
the legacy reality it replaces. The team treats everything as greenfield — nothing
is locked, and the design must expand cheaply.

## Key Decisions

- **Organizing axis: ERPNext suite-of-apps.** Top-level modules are functional
  domains you can enable per deployment, not a flat feature list and not a
  patient-journey flow. The medical core is first-class, not a bolt-on healthcare
  add-on.
- **Extensible registry, not a fixed list.** Modules and roles are data-driven and
  expandable — adding a module or role later is configuration, not a rewrite. The
  existing roles enum and placeholder `NAV_TREE` are drafts that this registry
  supersedes.
- **Shared services are cross-cutting, single modules.** Scheduling, Billing,
  Inventory, Documents, and Communications are plugged into by every clinical and
  business module rather than duplicated inside each.
- **Orders/CPOE is the clinical spine.** A single Orders module routes lab, imaging,
  medication, and procedure orders out to Laboratory, Imaging, and Pharmacy.
- **Native DICOM/PACS, not Orthanc.** Imaging owns DICOM as a platform capability
  (DICOM store, modality worklist, query/retrieve, viewer, structured reporting).
  Orthanc is current-state to migrate off, not a target dependency — migrating
  existing studies is a one-time task.
- **Billing is separate from Accounting.** Hospital revenue cycle (claims, pre-auth,
  co-pay) is too large to bury in the ledger; it feeds Accounting (AR).
- **Clinical is one broad domain.** ED, Nursing, and the service lines (Surgery,
  Maternity, Dietary, Physiotherapy) live inside Clinical, sharing the EHR spine.
- **FHIR-first interoperability.** Clinical data is modeled on and exposed through
  HL7 FHIR R4; the platform ships a FHIR REST API as its primary external
  clinical-data contract. This follows the proven OpenMRS model — a modular platform
  whose `fhir2` module serves FHIR R4 — and reinforces the extensible-registry choice
  (R1). OpenMRS and OpenHospital are the open-source reference systems for the modular
  + standards-based approach.

## Module Tree

```
Hospital Platform
│
├── CLINICAL
│   ├── Patient Management
│   ├── Patient Administration (ADT)   [OPD · IPD · ED · Beds/Wards · Transfers · Discharge]
│   ├── Encounters / EHR
│   ├── Orders / CPOE
│   ├── Nursing
│   ├── Surgery / Operating Theatre
│   ├── Maternity / Obstetrics
│   ├── Dietary / Nutrition
│   └── Physiotherapy / Rehab
│
├── DIAGNOSTICS & THERAPEUTICS
│   ├── Laboratory (LIS)
│   ├── Radiology / Imaging (RIS + native DICOM/PACS)
│   └── Pharmacy
│
├── BUSINESS / ERP
│   ├── Accounting / Finance
│   ├── Billing & Revenue Cycle
│   ├── Inventory / Materials
│   ├── Procurement
│   ├── Assets / Biomedical
│   ├── HR & Payroll
│   ├── CRM / Marketing
│   └── Projects
│
├── GOVERNANCE & SUPPORT
│   ├── Quality & Compliance
│   ├── Legal / Medico-legal
│   ├── Research
│   ├── Social Work
│   └── Helpdesk / Support
│
├── PATIENT PORTAL
│   └── Appointments · Results · Documents · Bills · Messaging · Consents
│
└── PLATFORM (shared services + admin)
    ├── Scheduling / Appointments      (shared service)
    ├── Documents                      (shared service · built)
    ├── Templates & Communications     (shared service · built)
    ├── Reporting / Analytics / BI
    └── System Administration          (users · roles registry · module enablement · integrations · audit)
```

The tree is an on-ramp; the authoritative content is the Requirements below.

## Actors

The personas the platform serves, drawn from the role branches in
`packages/common/src/enums/roles.enum.ts`. These are a draft set the roles registry
(R2) can extend.

- A1. **Clinician** (doctor) — encounters, orders, results review, reporting.
- A2. **Nurse** — eMAR, assessments, handover, care tasks.
- A3. **Technician** — lab bench, radiographer/imaging acquisition.
- A4. **Pharmacist** — dispensing, formulary, interaction checks.
- A5. **Administrative staff** — admissions, scheduling, billing desk.
- A6. **Finance staff** — accounting, payroll, insurance/claims.
- A7. **Operational staff** — maintenance/biomedical, housekeeping, security, IT.
- A8. **Governance staff** — quality, legal, research, social work.
- A9. **System administrator** — users, roles, module enablement, integrations.
- A10. **Patient / Family** — the patient portal audience.

## Requirements

Each module is one requirement: a one-line intent plus its submodules. Submodule
lists are the v1 scope per module and expand under R1. Build depth is sequenced in
Scope Boundaries — naming a module here does not commit it to the first build wave.

### Platform architecture (cross-cutting)

- R1. **Extensible module registry.** Modules can be enabled/disabled per
  deployment; adding a new module is configuration, not a rebuild.
- R2. **Data-driven roles & permissions registry.** Roles and their permissions are
  records, not a compile-time enum; new roles and grants are added without code
  changes. Supersedes the current roles enum.
- R3. **Shared services.** Scheduling, Billing, Inventory, Documents, and
  Communications are single cross-cutting modules every domain module plugs into;
  they are never re-implemented inside a domain module.
- R4. **Orders spine.** The clinical Orders/CPOE module routes lab, imaging,
  medication, and procedure orders to Laboratory, Imaging, and Pharmacy
  respectively, and surfaces results back to the chart.
- R5. **Native DICOM/PACS.** Imaging provides its own DICOM store, modality
  worklist, query/retrieve, and viewer; there is no ongoing dependency on Orthanc.

### Clinical

- R6. **Patient Management** — registration & demographics, master patient index
  (dedup/merge), insurance & payer details, next-of-kin/contacts, patient summary
  timeline, linked documents.
- R7. **Patient Administration (ADT)** — outpatient (OPD) visits & queue, inpatient
  (IPD) admissions, emergency (ED) triage & visits, bed/ward/room management,
  transfers, discharge (summary & instructions).
- R8. **Encounters / EHR** — encounter notes (SOAP), vital signs, problems &
  diagnoses (ICD), allergies & alerts, care plans, procedures, immunizations.
- R9. **Orders / CPOE** — lab/imaging/medication/procedure orders, nursing orders,
  order sets, results review & acknowledgement.
- R10. **Nursing** — eMAR (medication administration), assessments, shift handover,
  care tasks.
- R11. **Surgery / Operating Theatre** — theatre scheduling, peri-operative
  workflow, operative notes.
- R12. **Maternity / Obstetrics** — antenatal, labor & delivery, postnatal,
  newborn linkage.
- R13. **Dietary / Nutrition** — diet orders, meal planning, nutrition assessments.
- R14. **Physiotherapy / Rehab** — referrals, therapy plans, session tracking.

### Diagnostics & therapeutics

- R15. **Laboratory (LIS)** — test & panel catalog (reference ranges, specimen
  types), order intake, specimen collection & tracking (accession/barcode),
  bench/department worklists, results entry + validation with analyzer interfacing,
  sign-off to chart & portal, quality control. Plugs into Billing and Inventory.
- R16. **Radiology / Imaging (RIS + native PACS)** — imaging order intake, imaging
  scheduling (modality/room slots), DICOM modality worklist, technologist
  acquisition worklist, DICOM store with query/retrieve, web image viewer,
  radiologist structured reporting & sign-off, report distribution to chart & portal.
  Plugs into Billing.
- R17. **Pharmacy** — formulary/drug master, prescription intake (e-prescribing from
  CPOE), outpatient dispensing, inpatient supply linked to eMAR, drug
  interaction/allergy checks, stock with batch & expiry. Plugs into Inventory,
  Procurement, and Billing.

### Business / ERP

- R18. **Accounting / Finance** — chart of accounts/general ledger, accounts
  receivable, accounts payable, banking & reconciliation, cost centers/budgets,
  financial reports (P&L, balance sheet), taxes.
- R19. **Billing & Revenue Cycle** — charge capture from clinical orders & services,
  patient invoicing/co-pay/deposits, insurance claims & pre-authorization,
  payments/receipts/refunds, tariffs/price lists/packages. Feeds Accounting (AR).
- R20. **Inventory / Materials** — item master (drugs, consumables, supplies),
  multi-store stock (central, ward, pharmacy, lab), batch & expiry, requisitions &
  transfers, reorder/par levels, stock counts.
- R21. **Procurement / Purchasing** — suppliers, purchase requisitions, purchase
  orders, goods receipt; supplier invoices feed Accounts Payable.
- R22. **Assets / Biomedical Equipment** — asset register, preventive maintenance
  schedules, warranties/service contracts, work orders & logs, calibration tracking.
- R23. **HR & Payroll** — employee records, recruitment/onboarding, attendance &
  leave, staff rostering/shift scheduling, payroll, appraisals, credentialing &
  license tracking.
- R24. **CRM / Marketing** — patient engagement, campaigns (via Communications),
  referral management (referring doctors/clinics), feedback/surveys,
  corporate/insurance leads.
- R25. **Projects** — projects & tasks (kanban/Gantt), milestones & timelines,
  timesheets, project costing & budgets, project billing to Accounting (for capital
  projects, IT rollouts, research ops, quality initiatives).

### Governance & support

- R26. **Quality & Compliance** — incidents/adverse events, audits, accreditation
  (e.g. JCI/NABH), CAPA, SOP/document control, risk register.
- R27. **Legal / Medico-legal** — consents, medico-legal cases, contracts,
  regulatory.
- R28. **Research** — studies/trials, cohorts, ethics/IRB, data capture.
- R29. **Social Work** — case management, patient advocacy, financial assistance,
  discharge support.
- R30. **Helpdesk / Support** — patient query submission, internal staff tickets,
  issue tracking & resolution.

### Patient-facing

- R31. **Patient Portal** — appointment booking/reschedule/cancel, lab & imaging
  results, documents (e.g. discharge summaries), bills & payments, messaging/queries
  (to Helpdesk), profile & consents.

### Platform services & administration

- R32. **Scheduling / Appointments** — shared booking engine across resources
  (doctors, rooms, modalities, beds), reminders, calendar.
- R33. **Documents** — file store & generation. *Built today; absorbed as a shared
  service.*
- R34. **Templates & Communications** — email/SMS/print templates and notifications.
  *Built today; absorbed as a shared service.*
- R35. **Reporting / Analytics / BI** — operational and clinical dashboards and KPIs.
- R36. **System Administration** — user management, the roles & permissions registry
  (R2), module enablement (R1), settings, integrations (DICOM, lab analyzers, Oracle
  bridge, payment/communication gateways), audit logs.

### Interoperability & standards

- R37. **FHIR R4 compliance.** Clinical resources — at minimum Patient, Encounter,
  Observation, Condition, AllergyIntolerance, ServiceRequest, MedicationRequest,
  DiagnosticReport, and ImagingStudy — are modeled on and exposed through an HL7 FHIR
  R4 REST API, the platform's primary external clinical-data contract. DICOM (R5,
  R16) carries imaging pixel data and ImagingStudy links to it; HL7/ASTM carries lab
  analyzers (R15); FHIR is the unifying clinical API above both.

## Scope Boundaries

### First build wave (depth/build first)

- Clinical core spine — Patient Management, ADT, Encounters/EHR, Orders/CPOE — since
  every other clinical and diagnostic module depends on it.
- Imaging is the next concrete deep-dive given the native DICOM/PACS direction.

### Deferred for later

- Telemedicine — out now, but the registry (R1) must accommodate it as a future
  module.
- All modules outside the first wave stay named-but-shallow until they are built;
  this doc commits the skeleton, not the build order beyond the first wave.
- Oracle legacy data migration is a one-time project, not an ongoing integration.

### Outside this document

- Per-module submodule specifications — each module earns its own
  brainstorm/plan when it enters a build wave.
- Implementation and architecture (DICOM server technology, how shared services
  expose plug points, schema) — that is planning's job.

## Dependencies / Assumptions

- The already-built backend/frontend modules — Documents, Templates &
  Communications, Users/Admin, Settings — are absorbed as Platform shared services
  (R33, R34, R36), not rebuilt.
- The Oracle legacy system stays read-only (`SELECT`/`UPDATE` only, per `CLAUDE.md`)
  and serves as the migration source while modules come online.
- Native DICOM/PACS (R5, R16) replaces Orthanc; existing studies are migrated once.
- External integration surfaces the taxonomy implies: lab analyzers (HL7/ASTM),
  payment gateways, SMS/email providers, and the Oracle bridge — all owned by R36.
- FHIR R4 compliance (R37) shapes the clinical data models from the start —
  retrofitting FHIR onto non-FHIR models later is expensive, so EHR, Orders, Lab,
  Imaging, and Pharmacy resources are designed against FHIR resources up front.
- The roles enum and placeholder `NAV_TREE` are drafts superseded by R1/R2.

## Outstanding Questions

### Resolve before planning

- Confirm the first-wave order beyond the clinical core — which domain follows
  (Imaging vs. Billing/Revenue Cycle vs. Pharmacy)?
- Native DICOM/PACS is a heavy build: build a DICOM server in-platform vs. adopt and
  wrap an open engine. Flagged here; the technical choice is planning's, but it
  affects sequencing.

### Deferred to planning

- The mechanism for per-deployment module enablement (R1).
- How shared services (R3) expose plug points to domain modules.
- Coding/standards targets (ICD revision, accreditation body) that shape EHR and
  Quality data models.

## Sources / Research

- `packages/common/src/enums/roles.enum.ts` — the 12-branch role taxonomy used as
  the draft persona/actor map.
- `apps/frontend/web/src/app/layout/nav/nav-node.ts` — the current placeholder
  `NAV_TREE` this taxonomy is meant to replace ("not a committed one").
- ERPNext for Healthcare (`https://frappe.io/erpnext/for-healthcare`) — the
  suite-of-apps module model and healthcare feature set used as a reference.
- OpenMRS (`https://github.com/openmrs`) — modular/pluggable medical-record platform
  with FHIR R4 via the `fhir2` module; reference for the extensible-registry and
  FHIR-first decisions.
- Open Hospital (`https://github.com/informatici/openhospital`) — open-source HIS
  (Core / REST API / React UI); reference for the module set and layering.
- `docs/brainstorms/2026-06-23-web-frontend-internal-console-requirements.md` — the
  prior internal-console framing and the built modules absorbed here.
- `CLAUDE.md` — the Oracle legacy read-only constraint.
