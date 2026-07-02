# Hospital Platform — Build Tracker

Living progress tracker for the module taxonomy defined in
`docs/brainstorms/2026-06-25-hospital-platform-module-taxonomy-requirements.md`
(the source of truth; this file tracks *status*, not scope).

Two dimensions are tracked per module, matching the two project goals:

- **UI Frame** — the module exists in the nav/shell with a routed (placeholder)
  screen, so the app *frames* the functionality even before it's built.
- **Build** — the actual functionality is implemented and wired to the backend.

**Legend:** ☐ not started · 🟡 in progress / partial · ✅ done

**Snapshot (update as modules ship):** 31 modules + 6 cross-cutting requirements.
**UI Frame is now ✅ across the board** — the committed taxonomy is wired into
`NAV_TREE` at full submodule depth (~150 placeholder leaves), so every module has
a navigable home (see `docs/plans/2026-06-26-001-feat-nav-taxonomy-scaffold-plan.md`).
**Build:** Documents + Templates & Communications shipped; the **FHIR R4 clinical
data spine** (the shared Patient/Encounter/Orders foundation) is partially landed
(see `docs/plans/2026-06-26-002-feat-fhir-clinical-data-spine-plan.md`). System
Administration remains partial; every other module's Build is greenfield.

---

## Domain 1 — Clinical

| ID | Module | Scope (submodules) | UI Frame | Build |
|----|--------|--------------------|:--------:|:-----:|
| R6 | Patient Management | registration, MPI/merge, insurance, contacts, summary timeline, linked docs | ✅ | ☐ |
| R7 | Patient Administration (ADT) | OPD, IPD, ED triage, beds/wards, transfers, discharge | ✅ | ☐ |
| R8 | Encounters / EHR | SOAP notes, vitals, diagnoses (ICD), allergies, care plans, procedures, immunizations | ✅ | ☐ |
| R9 | Orders / CPOE | lab/imaging/med/procedure orders, order sets, results review | ✅ | ☐ |
| R10 | Nursing | eMAR, assessments, handover, care tasks | ✅ | ☐ |
| R11 | Surgery / Operating Theatre | theatre scheduling, peri-op, op notes | ✅ | ☐ |
| R12 | Maternity / Obstetrics | antenatal, labor & delivery, postnatal, newborn | ✅ | ☐ |
| R13 | Dietary / Nutrition | diet orders, meal planning, nutrition assessments | ✅ | ☐ |
| R14 | Physiotherapy / Rehab | referrals, therapy plans, session tracking | ✅ | ☐ |

## Domain 2 — Diagnostics & Therapeutics

| ID | Module | Scope (submodules) | UI Frame | Build |
|----|--------|--------------------|:--------:|:-----:|
| R15 | Laboratory (LIS) | test catalog, order intake, specimen tracking, worklists, results + analyzer interfacing, QC | ✅ | ☐ |
| R16 | Radiology / Imaging (RIS + native PACS) | order intake, imaging scheduling, DICOM worklist, acquisition, DICOM store + Q/R, viewer, reporting | ✅ | ☐ |
| R17 | Pharmacy | formulary, e-prescribing, dispensing, inpatient supply → eMAR, interaction checks, stock | ✅ | ☐ |

## Domain 3 — Business / ERP

| ID | Module | Scope (submodules) | UI Frame | Build |
|----|--------|--------------------|:--------:|:-----:|
| R18 | Accounting / Finance | GL, AR, AP, banking, cost centers/budgets, reports, taxes | ✅ | ☐ |
| R19 | Billing & Revenue Cycle | charge capture, invoicing/co-pay, claims & pre-auth, payments, tariffs | ✅ | ☐ |
| R20 | Inventory / Materials | item master, multi-store stock, batch/expiry, requisitions, par levels, counts | ✅ | ☐ |
| R21 | Procurement | suppliers, requisitions, POs, goods receipt → AP | ✅ | ☐ |
| R22 | Assets / Biomedical | asset register, preventive maintenance, warranties, work orders, calibration | ✅ | ☐ |
| R23 | HR & Payroll | employee records, recruitment, attendance/leave, rostering, payroll, appraisals, credentialing | ✅ | ☐ |
| R24 | CRM / Marketing | engagement, campaigns, referral management, feedback/surveys, leads | ✅ | ☐ |
| R25 | Projects | projects/tasks, milestones, timesheets, costing/budgets, project billing | ✅ | ☐ |

## Domain 4 — Governance & Support

| ID | Module | Scope (submodules) | UI Frame | Build |
|----|--------|--------------------|:--------:|:-----:|
| R26 | Quality & Compliance | incidents, audits, accreditation, CAPA, SOP/document control, risk register | ✅ | ☐ |
| R27 | Legal / Medico-legal | consents, medico-legal cases, contracts, regulatory | ✅ | ☐ |
| R28 | Research | studies/trials, cohorts, ethics/IRB, data capture | ✅ | ☐ |
| R29 | Social Work | case management, advocacy, financial assistance, discharge support | ✅ | ☐ |
| R30 | Helpdesk / Support | patient queries, internal tickets, issue tracking | ✅ | ☐ |

## Domain 5 — Patient-facing

| ID | Module | Scope (submodules) | UI Frame | Build |
|----|--------|--------------------|:--------:|:-----:|
| R31 | Patient Portal | appointments, results, documents, bills, messaging, consents | ✅ | ☐ |

*(Patient Portal is now taxonomy-aligned in the nav: a patient-audience domain
whose home resolves to the existing `/patient` stub, with placeholder leaves for
each portal section. Functionality is still to build.)*

## Domain 6 — Platform (shared services + admin)

| ID | Module | Scope (submodules) | UI Frame | Build |
|----|--------|--------------------|:--------:|:-----:|
| R32 | Scheduling / Appointments | shared booking engine (doctors, rooms, modalities, beds), reminders, calendar | ✅ | ☐ |
| R33 | Documents | file store & generation | ✅ | ✅ |
| R34 | Templates & Communications | email/SMS/print templates, notifications | ✅ | ✅ |
| R35 | Reporting / Analytics / BI | operational + clinical dashboards, KPIs | ✅ | ☐ |
| R36 | System Administration | users, roles registry, module enablement, settings, integrations, audit | 🟡 | 🟡 |

*(System Admin: user management + app settings built; roles registry, module
enablement, and integrations pending. It lives in the System Admin console
reached from the profile card — deliberately not on the rail — so the UI-frame
pass left its status unchanged.)*

## Cross-cutting — Architecture & standards

| ID | Requirement | UI Frame | Build |
|----|-------------|:--------:|:-----:|
| R1 | Extensible module registry (enable/disable per deployment) | — | ☐ |
| R2 | Data-driven roles & permissions registry | — | ☐ |
| R3 | Shared services plugged into, not duplicated | — | ☐ |
| R4 | Orders/CPOE spine routes to Lab/Imaging/Pharmacy | — | 🟡 |
| R5 | Native DICOM/PACS (off Orthanc) | — | ☐ |
| R37 | FHIR R4 compliance (clinical resources + REST API) | — | 🟡 |

*(R4 / R37: the FHIR clinical data spine landed the foundation — a relational
core projected to FHIR R4 via a translator + REST facade, with Patient,
Encounter, and ServiceRequest as worked resources and the ServiceRequest
category/performer/`basedOn` routing contract. Full FHIR Search, the fulfilling
Lab/Imaging/Pharmacy modules, and prod migration activation are the remaining
work.)*

---

## How to use this tracker

- Each module gets its own `/ce-brainstorm` → `/ce-plan` → `/ce-work` cycle as it
  enters a build wave; flip **UI Frame** to ✅ when its nav entry + placeholder
  screen land, and **Build** to ✅ when the functionality ships.
- The **UI-frame pass is done**: the full taxonomy is wired into the data-driven
  `NAV_TREE` (`apps/frontend/web/src/app/layout/nav/nav-node.ts`) at full
  submodule depth, with placeholder routes generated from the tree
  (`nav-routes.ts`). Adding/refining a module is now a tree edit.
- **First Build wave** (per the requirements doc): Clinical core spine —
  R6 → R7 → R8 → R9 — then R16 (Imaging). The **FHIR clinical data spine** (R37/R4)
  is the shared backend foundation these consume, and is now partially in place.
