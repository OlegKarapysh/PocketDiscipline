# Data Model: Purge Database

This feature does not introduce any new entities or modify the schema of existing entities. Its primary function is to act upon the existing database to clear all data and restore the defaults a fresh install gets.

## Affected Entities

- **All Existing Dexie Tables**: The feature will iterate through or explicitly target all tables in the local Dexie database (e.g., tasks, goals, scores, etc.) and clear their contents, then re-seed `users`, `goals` and `rewardCategories` with the same rows the Dexie `populate` hook writes on a fresh install. Both steps run in one transaction.

## State Transitions

- **Purge Action**: 
  - `Populated Database` -> `Fresh-install Database` (default user, starter goals, default reward categories)
  - Live queries re-emit on their own once the tables change. The pomodoro timer is the only in-memory state, and it is stopped after the purge.
