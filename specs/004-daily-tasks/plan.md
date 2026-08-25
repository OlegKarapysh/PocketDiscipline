# Implementation Plan: Daily Tasks

**Branch**: `[004-daily-tasks]` | **Date**: 2026-08-25 | **Spec**: [specs/004-daily-tasks/spec.md](file:///c:/Projects/MyProjects/PocketDiscipline/specs/004-daily-tasks/spec.md)

**Input**: Feature specification from `/specs/004-daily-tasks/spec.md`

## Summary

Adding Daily Tasks with incrementing streaks and difficulty selection to help users build habits. The reward is scaled by 10% from the base reward each day in a row up to 100%. A missed day resets the streak.

## Technical Context

**Language/Version**: TypeScript 5 / Angular 18

**Primary Dependencies**: Angular Core, Dexie (IndexedDB)

**Storage**: Dexie (IndexedDB) `pocket-discipline-db`

**Testing**: Playwright for E2E, Karma/Jasmine for unit testing

**Target Platform**: Web / PWA

**Project Type**: Web application

**Performance Goals**: UI interactions <100ms

**Constraints**: Offline-capable (PWA)

**Scale/Scope**: Local usage (1 user per device)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Does the implementation use a Vertical Slice Architecture?
- [x] Have we minimized external dependencies (i.e., are all new packages strictly necessary)?
- [x] Will the new code comply with ESLint, EditorConfig, and Prettier configurations?
- [x] Does the design adhere to SOLID principles and established developer best practices?

## Project Structure

### Documentation (this feature)

```text
specs/004-daily-tasks/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/app/
├── core/
│   └── services/
│       └── db.service.ts (update version for new tables)
├── features/
│   └── daily-tasks/
│       ├── models/
│       │   └── daily-task.model.ts
│       ├── services/
│       │   └── daily-tasks.service.ts
│       └── components/
│           ├── daily-task-list/
│           └── daily-task-item/
```

**Structure Decision**: Using Vertical Slice Architecture by isolating daily task logic under `src/app/features/daily-tasks`. We'll update the existing `db.service.ts` in `core` to add the new IndexedDB table version.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| | | |
