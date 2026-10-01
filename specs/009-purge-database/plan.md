# Implementation Plan: Purge Database

**Branch**: `[009-purge-database]` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-purge-database/spec.md`

## Summary

Add a "Purge Database" button within the Settings tab that securely deletes all local user data from the Dexie database after a confirmation prompt, and then programmatically clears the active application state and navigates to the home screen.

## Technical Context

**Language/Version**: TypeScript, Angular 22
**Primary Dependencies**: Dexie.js (for local database), Angular Material (for dialogs)
**Storage**: Dexie (IndexedDB)
**Testing**: Vitest (for unit testing components and services)
**Target Platform**: Web (Angular application)
**Project Type**: web-app
**Performance Goals**: N/A (local execution, fast by default)
**Constraints**: Must programmatically clear state and navigate, not hard refresh.
**Scale/Scope**: Local device state clearing.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Does the implementation use a Vertical Slice Architecture?
- [x] Have we minimized external dependencies (i.e., are all new packages strictly necessary)?
- [x] Will the new code follow `docs/code_style.md` and pass ESLint, EditorConfig, and Prettier?
- [x] Does the design adhere to SOLID principles and established developer best practices?
- [x] Does any UI follow `docs/design_system.md` (shared components first, theme and token layer only), with `scripts/check-ui.mjs` passing and its baseline not grown?

## Project Structure

### Documentation (this feature)

```text
specs/009-purge-database/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── quickstart.md        # Phase 1 output
```

### Source Code (repository root)

```text
src/
└── app/
    ├── core/
    │   └── database/
    │       └── app-database.service.ts # Core DB access/reset logic
    └── features/
        └── settings/
            ├── components/
            │   └── settings-page/
            │       └── settings-page.component.ts # Add Purge Button here
            └── dialogs/
                └── confirm-purge-dialog/ # Confirmation dialog component
```

**Structure Decision**: The UI components will be added directly into the existing `settings` feature slice (`src/app/features/settings`). The actual database purging logic will be implemented as a method on the core database service (likely `AppDatabaseService` or similar under `src/app/core/database/` or similar) to ensure all stores are cleared properly.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
