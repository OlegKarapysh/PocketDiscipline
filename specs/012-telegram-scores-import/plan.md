# Implementation Plan: Import Historical Daily Scores from Telegram Chat Export

**Branch**: `[012-telegram-scores-import]` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-telegram-scores-import/spec.md`

## Summary

Add a Telegram daily scores import page at `/settings/telegram-import` (within the `features/daily-scores/` vertical slice and linked from `/settings`) that parses a Telegram Desktop JSON chat export (`result.json`) on the device, previews the scores to import (new vs. replaced, resulting high-score streak, average score, date range, same-day duplicates, and skipped non-matching text messages), and on confirmation writes all new and affected `dailyScores` rows in a single atomic Dexie transaction. Overlapping dates are replaced, `streakAtThisDay` and `rewardEarned` (for imported dates) are recalculated chronologically across all dates, `users.balance` is left untouched, a summary snackbar is displayed, and the router navigates to `/daily-scores`.

## Technical Context

**Language/Version**: TypeScript 6, Angular 22.2

**Primary Dependencies**: Dexie 4 (IndexedDB), Angular Material 22, RxJS 7.8. No new packages.

**Storage**: Dexie (`pocket-discipline-db`, schema version 11 unchanged). Writes exclusively to `dailyScores`; `users` is not modified.

**Testing**: Vitest via `npm test -- --watch=false` for unit tests; Playwright via `npm run e2e` for E2E flow (`e2e/src/telegram-import.spec.ts`) and responsive layout audit (`e2e/src/layout-audit.spec.ts`).

**Target Platform**: Offline-first PWA across mobile (`360px`+) and desktop (`1920px`) browsers.

**Project Type**: Single-page web application (Angular v22 zoneless, OnPush default).

**Performance Goals**: Parse and preview a 400+ message `result.json` export on the device in under 1 second (SC-001).

**Constraints**: File processing is strictly local on the device; all database writes occur in a single atomic `dailyScores` transaction; money values (`rewardEarned`) are rounded to whole hryvnias; `users.balance` is never modified.

**Scale/Scope**: 400+ Telegram export messages, 1 route page (`TelegramImportPage`), 2 services (`TelegramScoresParserService`, `TelegramScoresImportService`), 4 model interfaces.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Does the implementation use a Vertical Slice Architecture? — Yes: all models, parser/import services, and the page component live under `src/app/features/daily-scores/`, sharing `daily-score-reward.const.ts` and writing through `DbService`.
- [x] Have we minimized external dependencies (i.e., are all new packages strictly necessary)? — Yes: zero new packages are introduced; JSON parsing uses built-in `JSON.parse`.
- [x] Will the new code follow `docs/code_style.md` and pass ESLint, EditorConfig, and Prettier? — Yes: uses Angular v22 `@Service()`, signals, `computed()`, standalone component defaults, one model per file, and strict lint/format compliance.
- [x] Does the design adhere to SOLID principles and established developer best practices? — Yes: `TelegramScoresParserService` is a pure, dependency-free parser (`text -> TelegramExportParseResult`); `TelegramScoresImportService` encapsulates preview calculation and atomic Dexie persistence; `TelegramImportPage` handles presentation and user interaction.
- [x] Does any UI follow `docs/design_system.md` (shared components first, theme and token layer only), with `scripts/check-ui.mjs` passing and its baseline not grown? — Yes: reuses `PageHeader`, `SectionCard`, and `StatCard`, styles strictly with design tokens (`--pd-*`, `--mat-sys-*`), passes `scripts/check-ui.mjs`, and registers all page states in `e2e/src/layout-audit.spec.ts`.

Post-design re-check: all gates pass with zero violations.

## Project Structure

### Documentation (this feature)

```text
specs/012-telegram-scores-import/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── checklists/
│   └── requirements.md  # Specification quality checklist (/speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

No `contracts/` directory is needed because this offline-first PWA feature exposes no external API or CLI contract beyond its in-app route `/settings/telegram-import`.

### Source Code (repository root)

```text
src/app/
├── app.routes.ts                                                           # Child route 'telegram-import' under 'settings'
└── features/
    ├── settings/
    │   ├── settings.html                                                   # "Import Telegram scores" navigation link
    │   └── settings.spec.ts                                                # Settings page unit tests
    └── daily-scores/
        ├── constants/
        │   └── daily-score-reward.const.ts                                 # Shared score/reward/streak constants
        ├── models/
        │   ├── telegram-score-row.model.ts                                 # TelegramScoreRow interface
        │   ├── telegram-export-parse-result.model.ts                       # TelegramExportParseResult interface
        │   ├── telegram-import-preview.model.ts                            # TelegramImportPreview interface
        │   └── telegram-import-result.model.ts                             # TelegramImportResult interface
        ├── services/
        │   ├── telegram-scores-parser.service.ts                           # Pure JSON export parser & validator
        │   ├── telegram-scores-parser.service.spec.ts                      # Parser unit tests
        │   ├── telegram-scores-import.service.ts                           # Preview & atomic dailyScores import service
        │   └── telegram-scores-import.service.spec.ts                      # Import service unit tests
        └── pages/
            └── telegram-import-page/
                ├── telegram-import-page.ts                                 # Route page component (/settings/telegram-import)
                ├── telegram-import-page.html                               # Page template using shared components
                ├── telegram-import-page.scss                               # Token-compliant responsive styles
                └── telegram-import-page.spec.ts                            # Page component unit tests

e2e/src/
├── telegram-import.spec.ts                                                 # End-to-end import & rejection tests
└── layout-audit.spec.ts                                                    # Responsive layout audit entries for telegram import
```

**Structure Decision**: Single-project Angular vertical slice structure. Because Telegram score importing writes exclusively to `dailyScores` and uses the daily score reward constants (`daily-score-reward.const.ts`), all models, services, and the page component live in `src/app/features/daily-scores/`, while `/settings/telegram-import` is mounted under the `settings` route group in `src/app/app.routes.ts` and linked from `src/app/features/settings/settings.html`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
