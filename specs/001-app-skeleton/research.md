# Research: App Skeleton

## Storage Mechanism

**Context**: The application requires offline-first local data persistence for tracking daily habits, one-off tasks, and a virtual currency balance.

**Decision**: Use **IndexedDB via Dexie.js**.

**Rationale**:
- `localStorage` is synchronous (blocking the UI thread) and limited to 5MB, which can become problematic as user data grows (e.g. logging history of completed tasks over months).
- IndexedDB provides asynchronous, structured data storage that aligns perfectly with offline-first PWA requirements.
- Dexie.js provides a clean, promise-based API and integrates well with TypeScript and RxJS/Angular through simple wrapper services, removing the boilerplate of native IndexedDB.

**Alternatives considered**:
- `localStorage`: Rejected due to synchronous blocking and capacity limits.
- `@ngx-pwa/local-storage`: Considered, but Dexie provides better querying capabilities (e.g., querying tasks by date or completion status) which will be required for a discipline dashboard.
- `RxDB`: Too heavy for a simple offline-first MVP, though it has good sync capabilities. Dexie is lighter for pure local storage.

## UI Component Library

**Decision**: Use **Angular Material**.

**Rationale**:
- Provides high-quality, accessible, and responsive components out of the box (Sidenav, Toolbar, Cards, Lists).
- Maintained by the Angular team, ensuring compatibility with the latest Angular versions.
- Accelerates the development of the responsive application skeleton.

**Alternatives considered**:
- Tailwind CSS: Great for styling, but requires building components from scratch. Angular Material is faster for an MVP.
- Bootstrap: Less integrated with the Angular ecosystem compared to Material.
