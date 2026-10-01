# Research: Purge Database

No complex research or external dependencies were required for this feature, as it utilizes the existing stack (Angular 22, Dexie.js). 

## Findings

### Database Reset (Dexie)
- **Decision**: Use Dexie's built-in `delete()` or clear each table programmatically.
- **Rationale**: Dexie provides a straightforward way to clear all data in tables, e.g., `db.table.clear()`, or wiping the entire DB with `Dexie.delete(dbName)`. Wiping tables via `clear()` is often safer for maintaining the active connection and schema without needing to reinitialize the DB connection in a single page application context.
- **Alternatives considered**: Wiping IndexedDB natively. Rejected because we want to maintain Dexie's wrapper and active observables.

### State Reset and Navigation
- **Decision**: After clearing the DB, use Angular's `Router` to navigate to the default route (e.g., `/` or `/dashboard`). State management services should be instructed to reset their cached subjects/signals to initial states.
- **Rationale**: The specification explicitly forbids a hard browser refresh and requires programmatic state clearing and navigation.
- **Alternatives considered**: `window.location.reload()`. Rejected due to explicit spec constraints (SC-003).

### Confirmation Dialog
- **Decision**: Use Angular Material Dialog (`MatDialog`) with a shared confirmation component or a custom `confirm-purge-dialog` component.
- **Rationale**: Fits the project's existing Material design system UI baseline.
- **Alternatives considered**: Native `window.confirm()`. Rejected because it violates UI/UX consistency and design system rules.
