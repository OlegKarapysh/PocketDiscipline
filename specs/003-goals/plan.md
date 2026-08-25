# Implementation Plan: Goals

**Branch**: `[003-goals]` | **Date**: 2026-08-25 | **Spec**: [specs/003-goals/spec.md](file:///c:/Projects/MyProjects/PocketDiscipline/specs/003-goals/spec.md)

**Input**: Feature specification from `specs/003-goals/spec.md`

## Summary

Implement a new "Goals" feature that allows users to create, view, edit, delete, and complete non-recurring difficult tasks for fixed rewards. Completed goals will be visually grouped by month. The feature uses Vertical Slice Architecture and integrates with the existing IndexedDB storage.

## Technical Context

**Language/Version**: TypeScript 5.5, Angular 22.1.0

**Primary Dependencies**: Angular Material, RxJS, Dexie

**Storage**: Dexie (IndexedDB)

**Testing**: Vitest (Unit), Playwright (E2E)

**Target Platform**: Web Browser

**Project Type**: Web Application (Client-side)

**Performance Goals**: Instant UI updates leveraging local IndexedDB storage.

**Constraints**: Local storage constraints (must function entirely client-side).

**Scale/Scope**: Single user app.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Does the implementation use a Vertical Slice Architecture?
- [x] Have we minimized external dependencies (i.e., are all new packages strictly necessary)?
- [x] Will the new code comply with ESLint, EditorConfig, and Prettier configurations?
- [x] Does the design adhere to SOLID principles and established developer best practices?

## Project Structure

### Documentation (this feature)

```text
specs/003-goals/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (to be created later)
```

### Source Code (repository root)

```text
src/app/features/goals/
├── components/
│   ├── goal-list/
│   ├── goal-form-dialog/
│   └── goal-item/
├── models/
│   └── goal.model.ts
├── pages/
│   └── goals-page/
└── services/
    └── goal.service.ts
```

**Structure Decision**: The feature is strictly isolated inside `src/app/features/goals`. A new page `GoalsPageComponent` acts as the smart component container, delegating data fetching and mutations to a feature-scoped `GoalService`. We will update the global `DbService` minimally to declare the new `goals` table.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Centralized DB Table | Need to define the Dexie table schema centrally in `db.service.ts` | Dexie requires tables to be declared at database instantiation |
