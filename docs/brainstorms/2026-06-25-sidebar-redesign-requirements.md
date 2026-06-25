---
date: 2026-06-25
topic: sidebar-redesign
---

# Sidebar Redesign — Requirements

## Summary

Restructure the web console's left navigation while keeping its current look (navy rail `#11304F`, accent-red active marker). The rail becomes a thin always-collapsed icon strip that expands on hover and **overlays** the content (never resizing it). It carries top-level modules only; sub-modules at every depth open as cascading flyout columns; final-level views render as horizontal tabs in the top bar. The user profile moves to a fixed card at the bottom of the rail — its popover holds Profile, System Admin (admins only), and Sign Out, and a gear on the card opens personal Settings. Administration leaves the rail entirely: it lives in the System Admin console, reached from the profile popover.

## Problem Frame

The current sidebar (`apps/frontend/web/src/app/layout/shell.ts`) is a fixed 244px rail with a flat, two-section list labelled "Workspace" and "Administration". It does not model nested modules — every destination is a single flat `NavItem`, so a console whose modules have sub-modules and views has nowhere to put that hierarchy. Three things compound the problem:

- Profile and Sign Out live in the top-right topbar, detached from where the user expects identity controls.
- Admin destinations are mixed into the nav list and gated per-item, blurring "navigation" with "administration".
- The "Workspace" / "Administration" group labels impose a taxonomy the user doesn't want; modules should stand on their own.

## Key Decisions

- **Overlay, not push.** When the rail expands and flyouts cascade, they float over the module content with a shadow and a faint scrim. The content keeps its full width and does not reflow when the menu opens or closes. This is the defining interaction choice — an earlier "push" variant was rejected.
- **One navigation rule at every depth.** The sidebar and its cascading flyouts are the *primary* way to navigate, for modules and all sub-module levels. The top bar is *only* for the last level — the views inside the sub-module the user landed in. Sub-modules never appear as top tabs.
- **Breadcrumb is secondary and mutually exclusive with the flyout.** The top-bar breadcrumb shows where the user is and lets them switch a sibling or module without opening the rail. It is a convenience, not the main path. The breadcrumb dropdown and the flyout are never open at the same time, which structurally prevents them from overlapping.
- **Administration is a separate console, not part of Settings.** Settings (the gear) is personal-only and identical for every user — an admin is also a user. Admin capabilities live in a distinct System Admin console reached from the profile popover (admins only), which acts as both a dedicated admin area and an elevated admin mode. Existing admin config (email/webhook/storage/users) moves under it.
- **Drop the section taxonomy.** Remove the "Workspace" / "Administration" group headers. Rail entries are the modules themselves.

## Requirements

### Rail and expansion

- R1. The rail defaults to a narrow icon-only strip showing top-level modules only (no sub-modules, no group labels).
- R2. Hovering the rail expands it to show module labels; moving the pointer away collapses it back to icons.
- R3. The expanded rail and its flyouts overlay the content area; the content keeps its width and does not reflow when the menu opens or closes.
- R4. The rail keeps the current visual identity: navy background `#11304F`, accent-red `#ea2128` active marker, existing iconography.

### Navigation model

- R5. Hovering a module opens a flyout column listing its children; hovering a child that has its own children cascades a further column, to whatever depth the module nests.
- R6. Sub-modules at every level are presented in flyout columns — never as top-bar tabs.
- R7. The final level (views) of the landed sub-module renders as horizontal tabs in the top bar.
- R8. A module whose direct children are views (no sub-modules) opens no flyout; selecting it lands the user on its view tabs directly.
- R9. The top bar shows a breadcrumb of the current path; each crumb opens a menu to switch to a sibling at that level without opening the rail.
- R10. The breadcrumb menu and the flyout are mutually exclusive — at most one is open at any time.

### Profile card

- R11. A fixed profile card sits at the bottom of the rail. Collapsed, it shows only the person's avatar/icon; expanded, it shows name and role.
- R12. Clicking the card opens a popover containing Profile, System Admin, and Sign Out. Sign Out moves here from the top bar; System Admin appears only for admins.
- R13. System Admin opens the admin console — a dedicated administration area that also shifts the console into an elevated admin view. It is the only place admin capabilities live.
- R14. When the rail is expanded, a gear (Settings) sits on the right of the profile card.

### Settings

- R15. The gear opens personal Settings, identical for every user including admins (an admin is still a user). Settings contains no admin section.

## Key Flows

- F1. Navigate to a deep destination
  - **Trigger:** User hovers a module icon in the rail.
  - **Steps:** Flyout opens with the module's sub-modules → user hovers a sub-module with children → a second flyout column cascades → user clicks a leaf sub-module → the content loads and its views appear as top tabs; the breadcrumb reflects the full path.
  - **Outcome:** Content swaps without the page reflowing around the (now-closed) menu.
  - **Covers R5, R6, R7, R3.**

- F2. Jump sideways via breadcrumb
  - **Trigger:** User is on a view and clicks a crumb (e.g. `Imaging ▾`) in the breadcrumb.
  - **Steps:** A small menu opens beneath that crumb listing siblings at that level → user picks a sibling → navigation moves there without the rail or any flyout opening.
  - **Outcome:** Lateral move with no rail interaction; flyout stays closed throughout.
  - **Covers R9, R10.**

- F3. Reach personal settings vs the admin console
  - **Trigger:** User hovers the rail; clicks the gear for personal Settings, or opens the profile card popover for System Admin.
  - **Steps:** The gear opens personal Settings (same for everyone) → an admin instead opens the popover and picks System Admin → the admin console opens and the console shifts into admin view.
  - **Outcome:** Administration is reachable only via System Admin (admins only); Settings stays personal; neither is a rail nav entry.
  - **Covers R12, R13, R14, R15.**

## Acceptance Examples

- AE1. **Covers R3.** Given a module page with content, when the user hovers the rail and the flyout cascades two columns, then the top bar, view tabs, and content cards stay at the same width and position as before the hover; closing the menu reveals identical, unshifted content.
- AE2. **Covers R8.** Given a module with no sub-modules (only views), when the user selects it, then no flyout column appears and the user lands directly on the module's view tabs.
- AE3. **Covers R10.** Given a flyout is open, when the user opens the breadcrumb dropdown, then the flyout closes first (or the dropdown does not open while the flyout is open) — the two are never visible simultaneously.
- AE4. **Covers R12, R15.** Given a non-admin staff user, then the profile popover shows no System Admin item and Settings shows only personal settings; given an admin, then the popover shows System Admin (opening the admin console) and Settings still shows only personal settings — no admin section inside Settings for either.
- AE5. **Covers R6, R7.** Given the user is in `Billing › Invoices`, then Invoices/Payments/Claims appear as flyout sub-modules and Invoices' views (Open/Paid/Overdue/Drafts) appear as top tabs — sub-modules never render as tabs.

## Scope Boundaries

- Visual identity is unchanged: the five-color brand palette, navy rail, accent-red marker, PrimeNG Aura + HSM preset, and light-only scheme all stay. This is a structure/behavior redesign, not a restyle.
- Individual module/feature pages are not being redesigned — only the navigation chrome around them.
- The data-driven nav approach stays; the `NavItem` model will need to express hierarchy and a module/sub-module/view distinction, but defining that shape is a planning concern.

## Dependencies / Assumptions

- Role state already exists: `AuthService` exposes `isAdmin()`, `isStaff()`, `isPatient()` signals (`apps/frontend/web/src/core/auth/auth.service.ts`). Admin-gating of the Settings admin section reuses these.
- Existing destinations exist to be re-homed: `/profile` (self-service) becomes personal Settings; `/admin/settings` (Email/Webhook/Storage/App Behavior) and `/admin/users` move under the System Admin console. The redesign relocates how they're reached, not whether they exist.
- The hierarchical module structure (which modules nest, how deep, what the views are) is supplied as data/IA work, not invented here; the wireframes used illustrative examples (Clinical › Imaging › CT, Billing › Invoices) that are not a committed information architecture.

## Outstanding Questions

### Deferred to planning

- The concrete module tree — which modules nest, to what depth, and their views. The navigation model is depth-agnostic, so the redesign mechanism can be planned and built before the final tree is fixed; the tree is supplied as data and wired into routes / the `NavItem` shape during implementation.
- System Admin console scope: which existing admin surfaces (`/admin/settings`, `/admin/users`) move under it, and what "elevated admin view" changes beyond exposing those surfaces.
- Mobile and touch behavior: the current layout already swaps to a fixed overlay drawer below 880px (`shell.ts`). How the hover-expand + flyout model maps to touch (tap-to-open, no hover) and small screens.
- Keyboard navigation and accessibility for a hover-driven cascade (focus order, escape-to-close, ARIA for flyout columns and the breadcrumb menu).
- Whether the breadcrumb and view tabs persist the last-visited view per module across navigations.

## Sources

- `apps/frontend/web/src/app/layout/shell.ts` — current sidebar template, grid layout, mobile drawer, topbar profile/sign-out, `mainNav()`/`adminNav()` computeds.
- `apps/frontend/web/src/app/layout/nav-items.ts` — `NavItem` interface and `NAV_ITEMS` (the flat model to evolve).
- `apps/frontend/web/src/app/app.routes.ts` — Shell parent + lazy child routes, `authGuard`/`adminGuard`, `/profile` and `/admin/*`.
- `apps/frontend/web/src/app/features/admin/settings/settings.ts` — existing admin settings categories.
- `apps/frontend/web/src/styles.css`, `apps/frontend/web/src/theme/hsm-preset.ts`, `apps/frontend/brand-color-style-guide.md` — brand palette, tokens, and PrimeNG preset to preserve.
- `apps/frontend/web/src/core/auth/auth.service.ts` — role signals for admin gating.
