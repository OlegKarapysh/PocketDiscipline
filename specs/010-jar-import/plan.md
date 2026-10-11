# Implementation Plan: Import Daily-Task History from a monobank Jar Statement

**Branch**: `[feature/010-jar-import]` | **Date**: 2026-10-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-jar-import/spec.md`

## Summary

A new vertical slice, `features/jar-import/`, reads a monobank jar statement on the device, classifies every row with the comment grammar from the brief, suggests one review row per label, and on "Import" writes tasks, completions, daily scores, focus sessions, goals and withdrawals in one Dexie transaction. Every row gets a deterministic id (`jar-<YYYYMMDDHHmm>-<closing balance in kopiykas>`), so a second or overlapping import writes only what is missing. The balance is never touched. Streaks are recomputed from the stored completions after the write.

## Technical Context

**Language/Version**: TypeScript 6, Angular 22.2

**Primary Dependencies**: Dexie 4 (IndexedDB), Angular Material 22, `@angular/forms/signals`. No new packages.

**Storage**: Dexie, `pocket-discipline-db`, version 9 unchanged. Tables written: `dailyTasks`, `dailyTaskCompletions`, `dailyScores`, `pomodoroSessions`, `goals`, `withdrawals`. `users` is not touched.

**Testing**: Vitest through `ng test` (Dexie mocked by hand, as in the other service specs); Playwright for the e2e flow and the layout audit.

**Target Platform**: The installed PWA, phone and desktop browsers.

**Project Type**: web-app (offline-first SPA)

**Performance Goals**: A 1,706-row statement reads, suggests and imports without a visible pause (well under a second on a phone); the review list renders 60+ rows without virtual scrolling.

**Constraints**: The file never leaves the device. All writes in one transaction. Money in whole hryvnias. No new Dexie version. The real statement is personal data and is never copied into the repository: tests use a synthetic fixture.

**Scale/Scope**: One statement of ~1,700 rows, ~50 review rows; one page, two child components, two services.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Does the implementation use a Vertical Slice Architecture? — `features/jar-import/` owns its route component, models, constants and services. It reads the core row types and writes through `DbService`, the persistence composition root, like every other slice.
- [x] Have we minimized external dependencies (i.e., are all new packages strictly necessary)? — None added. The CSV format is simple enough (two quoted fields, no embedded quotes) for a dozen lines of parsing.
- [x] Will the new code follow `docs/code_style.md` and pass ESLint, EditorConfig, and Prettier? — Signals only, signal forms, `@Service()`, one model per file, no method calls in bindings.
- [x] Does the design adhere to SOLID principles and established developer best practices? — The parser is pure and dependency-free; the import service owns suggestions and the write. The page only wires them to the UI.
- [x] Does any UI follow `docs/design_system.md` (shared components first, theme and token layer only), with `scripts/check-ui.mjs` passing and its baseline not grown? — `app-page-header`, `app-section-card`, `app-stat-card`, `app-amount`, `app-badge`, `app-empty-state`-free; Material form fields and selects; token-layer SCSS only. Registered in the layout audit.

Post-design re-check: unchanged, all pass.

## Project Structure

### Documentation (this feature)

```text
specs/010-jar-import/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

No `contracts/`: the feature exposes no interface beyond its own page.

### Source Code (repository root)

```text
src/app/
├── app.routes.ts                                   # 'settings' gains a child: 'jar-import'
├── features/
│   ├── settings/settings.html                      # "Import jar statement" link
│   └── jar-import/
│       ├── constants/
│       │   ├── jar-comment-patterns.const.ts       # ENVELOPE, SCORE, POMODORO, TIMED, COUNTED, TOP_UP, GRADED
│       │   ├── jar-label-aliases.const.ts          # alias reference data and canonical titles
│       │   └── jar-statement-format.const.ts       # header, categories, id prefix
│       ├── models/                                 # one model per file, see data-model.md
│       ├── services/
│       │   ├── jar-statement-parser.service.ts     # text → JarStatement. No dependencies.
│       │   └── jar-import.service.ts               # suggestions + the one transaction
│       ├── components/
│       │   ├── jar-statement-summary/              # counts, date range, kinds
│       │   └── jar-review-list/                    # the editable grouping (signal form)
│       └── pages/
│           └── jar-import-page/                    # pick file → summary → review → import
├── features/jar-import/testing/
│   └── jar-statement.fixture.ts                    # synthetic statement: every variant, no real data
docs/schema.md                                      # imported ids are not UUIDs
e2e/src/
├── jar-import.spec.ts                              # import the fixture; tasks, streaks, dashboard
└── layout-audit.spec.ts                            # SCREENS entries + worst-case statement
```

**Structure Decision**: A new slice, as the brief asks. The page is routed as `/settings/jar-import`, a child of `settings` in `app.routes.ts`, so Settings stays the active section in the navigation; the link sits next to "Manage reward categories" and is styled the same way. The fixture is a TypeScript module exporting the CSV text, so both the Vitest specs and Playwright (which already imports from `src/`) use the same file.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
