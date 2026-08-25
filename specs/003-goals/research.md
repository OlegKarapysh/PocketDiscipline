# Phase 0: Research & Decisions

## Decision 1: Dexie Table Integration in Vertical Slice
- **Decision**: Define the Dexie table centrally in `db.service.ts` but keep all data access logic (queries, mutations) encapsulated within `src/app/features/goals/services/goal.service.ts`.
- **Rationale**: Dexie requires all tables to be declared at database initialization via `this.version(1).stores({...})`. It is not feasible to dynamically add schemas from feature modules lazily without risking database version conflicts or missing indices.
- **Alternatives considered**: Attempting to subclass Dexie per feature (rejected: poor performance, multiple connections to IndexedDB). Storing goals inside the existing `tasks` table with a new `type = 'GOAL'` (rejected: violates vertical slice and data isolation, mixes recurring habits with one-off goals).

## Decision 2: Title Uniqueness Constraint
- **Decision**: Enforce title uniqueness at the application layer (`GoalService`) rather than the IndexedDB schema layer.
- **Rationale**: IndexedDB does not natively support complex constraints like "unique where status is active". Doing it at the application layer provides better error messages and fits smoothly into Angular's reactive form validators (async validators).
- **Alternatives considered**: Creating a unique index on `title` in Dexie. This was rejected because the uniqueness only applies to *active* goals (e.g. if I complete "Run 5k", I might want to create a new active goal "Run 5k" next month).

## Decision 3: "Month Completed" Grouping Strategy
- **Decision**: Store the exact `completedAt` timestamp in the database and derive the month grouping dynamically in the view layer (using a grouped RxJS stream or an Angular Pipe).
- **Rationale**: Follows the principle of storing raw data and deriving views. It prevents data duplication and handles timezones correctly based on the user's local browser context.
- **Alternatives considered**: Storing a string like "August 2026" on the database entity (rejected: timezone issues, harder to sort/filter).
