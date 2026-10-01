# Data Model: Purge Database

This feature does not introduce any new entities or modify the schema of existing entities. Its primary function is to act upon the existing database to clear all data.

## Affected Entities

- **All Existing Dexie Tables**: The feature will iterate through or explicitly target all tables in the local Dexie database (e.g., tasks, goals, scores, etc.) and clear their contents.

## State Transitions

- **Purge Action**: 
  - `Populated Database` -> `Empty Database`
  - Active application services using Signals/RxJS streams will be reset to their initial empty states to reflect the empty database.
