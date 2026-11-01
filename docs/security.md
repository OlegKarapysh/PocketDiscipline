# Security guidance

PocketDiscipline is an offline-first, single-user PWA. Personal data lives in the browser's
IndexedDB through Dexie. Local storage is neither an application-level encryption guarantee nor
protection against someone with access to the browser profile. Describe only protections that exist.

## Protect local data

Users' local history may be their only copy. Preserve it through upgrades, failed operations, and
retries. Follow [schema.md](schema.md) for database versioning and data invariants. Never reset or
recreate a database to recover from an error. Destructive user actions must be explicit and confirmed.

Keep related writes atomic, imports safe to retry, and failures free of partial changes. Test migrations
against populated earlier schemas and verify that existing records and relationships survive.

## Personal data and imports

- Keep real bank statements, Telegram exports, database dumps, and personal records out of commits,
  logs, screenshots, and test fixtures. Use synthetic data for development and tests.
- Treat imported files as untrusted. Bound their size and validate structure, types, dates, amounts,
  and references before writing. A filename or TypeScript type is not runtime validation.
- Do not transmit personal data or add telemetry without an explicit product requirement and clear
  user consent.

## Browser rendering and secrets

- Render user and imported text through Angular's safe bindings. Never bypass sanitization for
  untrusted values, construct executable templates from input, or inject it through unsafe DOM APIs.
- Never put credentials in source, frontend bundles, fixtures, or logs. Browser configuration is
  public; distinguish public identifiers from secrets.

## Dependencies and deployment

- Review dependency changes for trust, security advisories, and necessity; commit lockfile changes.
- Deploy production builds over HTTPS, exclude development tools and test data, and give CI jobs only
  the permissions they need.
- Apply hosting security controls supported by the deployment platform, including an appropriate
  Content Security Policy where feasible. Verify compatibility with Angular and the PWA; document
  limitations rather than claiming unsupported protections.
