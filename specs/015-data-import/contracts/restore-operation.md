# Contract: Restore Operation

## Service ownership

- BackupValidationService: unknown file/envelope/row validation and structured errors; source/current descriptors.
- BackupSchemaService: explicit source schemas and detached adjacent transformations to current; no device writes.
- BackupImportService: file preparation orchestration, full current snapshot, stale-consent check, atomic replacement and timer coordination.
- Existing BackupExportService / FileSharingService: reuse generation, last-export recording and delivery.
- Existing PomodoroTimerService / PomodoroStorageService: replacement hold, memory-only reset and guarded timer mutations; backup does not reach into private state.

No service or model in core imports backup. Do not add a public method used only by a test.

## Operation sequence

1. Await database ready/legacy migration and timer initial recovery.
2. Read/validate/transform incoming file, outside any device write transaction.
3. Capture a consistent all-table device snapshot for comparison.
4. User may safety-export; refresh full baseline afterwards.
5. Obtain explicit confirmation tied to selected-file generation and current baseline.
6. Acquire timer replacement hold: prevent new local starts/completions, drain already-started timer database operations, preserve visible session state/deadline.
7. Enter one read-write transaction over db.tables. Read current full rows, compare synchronously with confirmed baseline. If changed, throw device-changed before any clear.
8. Clear every table; bulk-add prepared rows. Set restored user.lastExportedAt from the envelope within the same transaction, without touching other profile values. Do not call purgeDatabase, populate, seedDefaults, reward-crediting APIs or legacy migration.
9. Let any exception escape the transaction. On rejection, release timer hold, resume original deadline, report failure or refresh changed review. Remain on import page.
10. On transaction resolution, invalidate old timer operation generation and reset only memory. Do not invoke stopTimer/cancelSession. Scheduled-notification cancellation is best effort and cannot turn a committed restore into a rollback claim.
11. Show success and route to dashboard. Keep committed outcome separate from page-transition errors.

Only Dexie/database work is awaited inside step 7–8. Do not await File.text, dialogs, native sharing, notifications, timers, workers or cryptographic digest calls there. Synchronous canonical equality is safe after valid data has been read.

## Timer mutation guard

The hold covers the importing browser context. Other-tab transactions before replacement participate in the full baseline check; transactions serialized after commit are subsequent activity. No cross-tab timer suspension is promised.

The hold must cover initial recovery, startSession, cancel/stop and completion mutations already in flight, not just setInterval. Delayed reward reads, restoration reads, notifications and finally blocks must check their captured generation. A queued storage operation rechecks the guard inside its transaction after lock acquisition. In-flight work drained before the replacement may change the baseline; that is a device-changed result requiring renewed consent.

On rollback the original session is not cancelled or re-created. Recalculate time from its original expected end; an elapsed timer may then complete normally. On commit clear timer identity before releasing the hold, preventing old work from addressing a matching imported id.

This import does not start an imported active row. Subsequent app reload uses the existing normal recovery semantics, as confirmed by the user. Native transaction serialization defines the replacement boundary; it does not freeze normal writes forever after commit.

## Error outcomes

| Code | User outcome |
| --- | --- |
| file-read / invalid-json / invalid-header | Clear file problem; no review/restore eligibility. |
| too-large | Explain the 50 MiB limit. |
| update-required | Ask to update the app first. |
| encryption-unsupported | Explicit spec 016 limitation. |
| unsupported-version | Older format or transformation unavailable; no guessing. |
| invalid-row / duplicate-key / invalid-reference | Safe table, row id/index and field path; no whole payload in logs. |
| device-changed | No writes; refresh comparison and request fresh confirmation. |
| storage-failed | Atomic rollback, timer unchanged, retry possible. |
| committed-feedback-failed | Restored state remains committed; do not say the old data was preserved. |

## Legacy ready hook

BackupSchemaService never invokes legacy PomodoroDatabase migration. Guard the existing database migration owner against resurrecting stale sessions over authoritative backed-up/restored main data on a later open. Await the current ready hook before review; do not delete a legacy database to repair an import error. Cover this guard using real database tests.

## Browser proof of atomicity

In test code only, wrap native IDBObjectStore.clear/add/put. Observe successful clearing and insertion of a designated synthetic incoming row in the same captured transaction, then abort that transaction from its request success handler before commit. Assert both observations, an abort, error UI and all-table equality immediately and after reload. Restore wrappers in finally. No debug route, production flag, Angular global or mock database is required.
