# Research & Technical Decisions: Daily Tasks

## Decision 1: Storage Mechanism
- **Decision**: Use the existing IndexedDB via Dexie (`db.service.ts`).
- **Rationale**: The project already uses Dexie for storing `users`, `tasks`, and `goals`. Extending it with a new schema version for `dailyTasks` ensures consistency, avoids new dependencies, and seamlessly supports offline usage.
- **Alternatives considered**: `localStorage` (rejected because it's synchronous, has size limits, and splits data storage across multiple technologies, which complicates backups and migrations).

## Decision 2: Architectural Placement
- **Decision**: Create a dedicated `daily-tasks` vertical slice in `src/app/features/daily-tasks`.
- **Rationale**: The Daily Tasks feature introduces unique concepts (streaks, difficulty modifiers, daily resets) that do not apply to regular tasks or long-term goals. Segregating it follows the project's Vertical Slice architecture and SOLID principles.
- **Alternatives considered**: Merging into the existing `tasks` feature. Rejected because it would overload the `DisciplineItem` model and `task.service.ts` with logic unrelated to standard tasks, violating the Single Responsibility Principle.

## Decision 3: Managing the Daily Reset & Timezones
- **Decision**: Daily reset will be handled lazily based on the client's local time.
- **Rationale**: Since this is an offline-capable PWA, there is no centralized server. When a daily task is loaded or attempted to be completed, the system will check the `lastCompletedAt` timestamp against the current local date. If the day has changed, it computes whether a day was skipped (which resets the streak) or if it's the next consecutive day.
- **Alternatives considered**: A background sync or worker script. Rejected as unnecessary complexity; lazy evaluation upon app load/interaction is perfectly reliable for this use case.
