# Implementation Plan: Dashboard Earnings Chart and Statistics

**Branch**: `007-dashboard-earnings-stats` | **Date**: 2026-09-02 | **Spec**: [specs/007-dashboard-earnings-stats/spec.md](file:///c:/Projects/MyProjects/PocketDiscipline/specs/007-dashboard-earnings-stats/spec.md)

**Input**: Feature specification from `specs/007-dashboard-earnings-stats/spec.md`

## Summary

Implement a daily earnings stacked bar chart and monthly average statistics on the Dashboard tab. Features 7-day default display, period presets (Last 7 Days, Last 14 Days, Last 30 Days) and custom date range picker, activity source breakdown (Goals, Tasks, Pomodoro, Scores), and dynamic monthly daily averages (elapsed days for the current in-progress month, full calendar days for completed past months). Built using a native, responsive SVG stacked bar chart without external charting libraries, strictly adhering to Vertical Slice Architecture and project code style rules.

## Technical Context

**Language/Version**: TypeScript ~6.0, Angular v22 (standalone components, signals/RxJS)

**Primary Dependencies**: Angular Material (`@angular/material`), Angular CDK (`@angular/cdk`), Dexie.js (`dexie`)

**Storage**: Dexie.js (IndexedDB) - `pocket-discipline-db` (`version(6)` adding `dailyTaskCompletions` table)

**Testing**: Vitest (`npm test`), Playwright (`npm run e2e`)

**Target Platform**: Modern Web Browsers / PWA

**Project Type**: Web Application (Angular Vertical Slice Architecture)

**Performance Goals**: Dashboard loads and displays chart under 1 second; filtering and month navigation update under 200ms

**Constraints**: Offline-first, no backend, zero additional npm charting libraries, full accessibility

**Scale/Scope**: Single local user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Does the implementation use a Vertical Slice Architecture?
- [x] Have we minimized external dependencies (i.e., are all new packages strictly necessary)?
- [x] Will the new code comply with ESLint, EditorConfig, and Prettier configurations?
- [x] Does the design adhere to SOLID principles and established developer best practices?

## Project Structure

### Documentation (this feature)

```text
specs/007-dashboard-earnings-stats/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── ui-and-service-contracts.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
└── app/
    ├── core/
    │   └── services/
    │       └── db.service.ts                          # Bump to version(6) with dailyTaskCompletions
    └── features/
        ├── daily-tasks/
        │   ├── models/
        │   │   └── daily-task-completion.model.ts     # Interface for task completion records
        │   └── services/
        │       └── daily-tasks.service.ts             # Record completion entry on task completion
        └── dashboard/
            ├── models/
            │   ├── daily-earnings-record.model.ts     # Model for single day earnings aggregation
            │   ├── monthly-earnings-summary.model.ts  # Model for monthly average summary
            │   ├── earnings-period-filter.model.ts    # Model for period filter presets/range
            │   └── earnings-source.enum.ts            # Enum for discipline earning categories
            ├── services/
            │   ├── dashboard-earnings.service.ts      # Aggregation logic and queries across Dexie
            │   └── dashboard-earnings.service.spec.ts # Unit tests for calculations and bounds
            ├── components/
            │   ├── balance-widget/                    # Existing balance card
            │   ├── earnings-chart/                    # Native SVG stacked bar chart
            │   │   ├── earnings-chart.component.ts
            │   │   ├── earnings-chart.component.html
            │   │   ├── earnings-chart.component.scss
            │   │   └── earnings-chart.component.spec.ts
            │   ├── earnings-stats/                    # Monthly average statistics card
            │   │   ├── earnings-stats.component.ts
            │   │   ├── earnings-stats.component.html
            │   │   ├── earnings-stats.component.scss
            │   │   └── earnings-stats.component.spec.ts
            │   └── earnings-filter/                   # Presets and custom date range picker
            │       ├── earnings-filter.component.ts
            │       ├── earnings-filter.component.html
            │       ├── earnings-filter.component.scss
            │       └── earnings-filter.component.spec.ts
            ├── dashboard.ts                           # Dashboard container composing widgets
            ├── dashboard.html
            ├── dashboard.scss
            └── dashboard.spec.ts
```

**Structure Decision**: Angular feature module using Vertical Slice Architecture under `src/app/features/dashboard/`. Domain entities and calculation services are encapsulated within this slice. Storage persistence changes are cleanly scoped to Dexie database versioning in `DbService`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*(No constitution violations. Zero external packages added.)*
