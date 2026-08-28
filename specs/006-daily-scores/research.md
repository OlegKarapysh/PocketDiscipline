# Research: daily-scores

## Technology Stack Confirmation

- **Decision**: Use Angular v22, Angular Material, and Dexie.js.
- **Rationale**: These are the project's established technologies. The feature requires local storage which is already handled by Dexie.js in `src/app/core/services/db.service.ts`.
- **Alternatives considered**: N/A, adhering to existing stack constraints.

## Data Storage Strategy for Streak

- **Decision**: Store `DailyScore` as a separate table `dailyScores` in the main Dexie database, with `date` (YYYY-MM-DD) as the primary key. Calculate the streak upon submission and store it in the daily score entry itself: `streakAtThisDay`.
- **Rationale**: Because missing a day resets the streak, the easiest way to preserve historical streaks and compute the current streak without modifying the central `User` model is to simply calculate it at the moment of score submission and save it with the daily score. The "current" streak is then easily retrievable by checking if yesterday's or today's record has a streak.
- **Alternatives considered**: Adding a global `dailyScoreStreak` property to the `User` table. This would require database schema version bumping and migrations for the `users` table, which is acceptable but slightly more complex than just putting it in the new table.

## Notification Mechanism

- **Decision**: Use the browser's standard `Notification` API combined with a local scheduling check (e.g., inside an Angular service or Service Worker) that evaluates if it's 21:30 and the score is unset.
- **Rationale**: The specification explicitly forbids a backend push server (FR-012) and accepts the tradeoff that if the app is entirely closed and has no active service worker, it won't fire. 
- **Alternatives considered**: Backend push server (explicitly rejected by clarification).
