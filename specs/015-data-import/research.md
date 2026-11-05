# Research: Data Import (Restore)

**Date**: 2026-11-03. Read-only repository research and official protocol/API documentation; no application code changed.

## 1. File compatibility and versions

**Decision**: Accept spec 014's UTF-8 JSON content in a .txt file (renamed .json also accepted). Format marker is `pocket-discipline-backup`, format version 1. Validate the header, refuse newer format/schema/app versions, then refuse encryption before looking for plaintext data. Compare app versions by SemVer precedence, including prereleases and ignoring build metadata.

**Rationale**: User explicitly required newer-app refusal; this tightens spec 014's informational app-version wording without changing the wire format. App versions are currently 0.0.0, so schema and format checks remain essential.

**Alternatives**: Extension-only checking cannot validate input. Lexicographic versions misorder 1.10 and 1.9. A package solely for a small SemVer comparator is unnecessary; use spec examples and boundary tests. Do not coerce malformed version strings.

**Sources**: `specs/014-data-export/contracts/backup-file.md`, `package.json`, [SemVer 2.0.0](https://semver.org/). Spec 014's reader guidance has been reconciled with this policy; implementation verifies it remains consistent.

## 2. Validation represents persisted rows

**Decision**: Parse as unknown; explicit table/field descriptors and service validators check source-version structure, keys, domains and references. Accept documented legacy reward description/icon only as optional strings and preserve them; current producers do not emit or require them. Validate every money field as finite/safe whole hryvnias after transforms. Accept legitimate stored zero values produced by the old money-rounding upgrade, even where new forms now require at least one. Do not apply current form maxima to accumulated balances or histories.

**Rationale**: Type assertions offer no runtime protection. Current schema docs contain stale reward examples (description/icon and required updatedAt) and fallback id general; actual RewardItem.updatedAt is optional and the fallback id is cat-general. Validators must not invent required fields that valid exports lack.

**Alternatives**: Blindly transcribing docs would reject real exports; permissive casts silently accept corruption. No schema-validation dependency is needed for eleven explicit tables.

**Sources**: `docs/security.md`, `docs/schema.md`, `src/app/core/models/`, `src/app/core/constants/initial-reward-categories.const.ts`, `src/app/features/backup/services/backup-export.service.ts`.

## 3. Historical references

**Decision**: Check category references from rewards and withdrawals against incoming categories. Accept valid-shaped historical completion task/difficulty ids without existing targets and optional withdrawal reward ids without existing targets. Do not synthesize parents, discard history or replay balance effects.

**Rationale**: The user confirmed these exceptions. Daily-task deletion retains completion history, editing replaces difficulties, reward deletion retains withdrawals, and category deletion reassigns relationships.

**Alternatives**: Strict foreign keys everywhere would make the app's own export unrestorable. Allowing all dangling references would hide invalid category links.

**Sources**: `daily-tasks.service.ts` deleteTask/updateTask, `rewards.service.ts` deleteReward, `category.service.ts` deleteCategory under their feature service directories.

## 4. Older schema transformations

**Decision**: Support positive schema versions 1–11 in format 1 using detached data transformations and version-specific validators. Existing upgrade blocks are the source of behaviour:

| Transition | Action |
| --- | --- |
| 1 → 2 | Introduce goals; seed initial goals as the existing version-2 upgrade does. |
| 2 → 3 | Add dailyTasks = []. |
| 3 → 4 | Add dailyScores = []. |
| 4 → 5 | Add pomodoroSessions = []. |
| 5 → 6 | Add dailyTaskCompletions = []. |
| 6 → 7 | Explicit identity for row shape; only indexes changed. |
| 7 → 8 | Add withdrawals/rewards = []; add initial rewardCategories as in the upgrade. |
| 8 → 9 | Round all present money fields, nested difficulty rewards included, using Math.round(value) or 0 to normalize negative zero. |
| 9 → 10 | Assign sortOrder in IndexedDB primary-key order, independent of file order. |
| 10 → 11 | Add pomodoroRewardRates = []; missing rates use defaults. |

Validate source rows before transforming and current rows afterwards. A missing transform is an unsupported-version error. Generate seeded ids/timestamps once during preparation, retain that exact prepared snapshot through review and retries, and regenerate only on new file selection. These old-schema upgrade additions are disclosed in preview; same-schema restore never seeds.

**Rationale**: This follows existing database migrations without opening/upgrading/deleting another persistent database. Export first shipped with schema 11; historical-envelope fixtures are compatibility tests, not claims that schema-1 backups were released.

**Alternatives**: Running migrations on the live database violates no-writes-before-review. Temporary persistent databases add cleanup and ready-hook hazards. Refusing all old schemas contradicts the request.

**Sources**: `src/app/database/db.service.ts`, `money-rounding-migration.service.ts`, `daily-task-order-migration.service.ts`, `core/constants/initial-goals.const.ts`.

## 5. Atomicity and current-state consent

**Decision**: Read all tables in a consistent transaction for review. Keep full rows, not only summary counts. After confirmation, read all tables again inside the all-table read-write transaction; compare canonical rows/keys with the captured baseline. On any difference abort before clearing and refresh review. Otherwise clear all tables, bulk-add prepared rows and apply lastExportedAt in that transaction. Never swallow write errors inside it.

**Rationale**: IndexedDB serializes conflicting transactions; the comparison and replacement share that protection. File reads, transforms, dialogs, timer coordination and hashing must occur outside the transaction. Equality uses synchronous canonical comparison inside it; no awaited cryptographic API is needed.

**Alternatives**: Counts/balance miss title edits. A live-query refresh alone leaves a race after confirmation. A persisted revision adds restore metadata and requires changes to every writer.

**Sources**: `DbService.purgeDatabase()`; [Dexie transaction documentation](https://dexie.org/docs/Dexie/Dexie.transaction%28%29) on transaction lifetime; [IndexedDB transaction scheduling](https://www.w3.org/TR/IndexedDB/#transaction-scheduling). This provides an atomic replacement boundary, not a permanent prohibition on subsequent normal user writes.

## 6. Timer work at replacement

**Decision**: Add a production replacement-hold mechanism to PomodoroTimerService. It waits for initial recovery and already-started mutations, blocks new timer starts/completions while replacement runs, and leaves visible session state intact. On failure release the hold and recalculate remaining time from the original deadline. On success invalidate old async work and reset interval/session id/active state in memory, then best-effort cancel scheduled notifications. Do not call stopTimer() after restore.

Track asynchronous start/recovery/completion work and check a generation token before queued storage mutations inside their transactions; guard finally blocks and notifications too. The restore's database transaction does not wait on timer/network APIs. A completion that finished before the hold changed device state and therefore triggers refreshed confirmation.

**Rationale**: Existing stopTimer calls storage.cancelSession(id). If that id exists in the incoming snapshot, it mutates imported data. Existing delayed reward reads can also credit an imported active row if guarded only by id/status.

**Alternatives**: Stopping persistently before the transaction changes data on failure. A post-commit stopTimer violates exactness. Only clearing an interval does not cancel an already-awaiting completion.

**User decision**: Stop for this import; normal session recovery on reload remains unchanged. No durable marker or session status rewrite is introduced. The matching-id/in-flight timer guarantee applies to the importing context's old work. Other-tab writes before the replacement are caught by the transactional baseline check; writes serialized after commit are subsequent normal activity, not part of the restored snapshot. This feature does not claim to suspend every other browser tab indefinitely.

**Sources**: `src/app/features/pomodoro/services/pomodoro-timer.service.ts`, `pomodoro-storage.service.ts`.

## 7. Safety export reuse

**Decision**: Extract the current BackupCard's export/share/download interaction to BackupExportActions within the backup slice. Inputs: primary label (default Export data) and disabled; output: busy state. File preparation stays local to each instance. BackupCard keeps last-backup display; import uses the same actions labelled Export current data and Download.

**Rationale**: Export and FileSharing services already implement the file generation and delivery mechanisms, while the card owns fresh-tap retry/cancellation UI. Sharing that interaction avoids copying it or embedding an unwanted last-backup card in the import page.

**Alternatives**: Duplicate handlers drift; reuse the full card makes its surrounding content and controls harder to coordinate.

**Sources**: `features/backup/components/backup-card/`, `features/backup/services/file-sharing.service.ts`, `docs/design_system.md`.

## 8. Real rollback verification

**Decision**: A Playwright-only native API wrapper observes a successful store clear and a successful designated incoming add/put, then calls the captured IDBTransaction.abort() before commit. Restore prototype methods in finally. Assert injection actually happened, all eleven stores equal baseline afterwards, and reopening preserves that result. No app flag or debug-global injector is added.

**Rationale**: This exercises the real import path and transaction engine after changes have begun. Invalid-file rejection only proves validation. Native rollback semantics are defined by [IndexedDB aborting a transaction](https://www.w3.org/TR/IndexedDB/#abort-transaction).

**Alternatives**: Fake-indexeddb remains valuable unit coverage but is not the requested real-browser proof; forcing quota exhaustion is nondeterministic; a production error-injection endpoint is unnecessary.

**Sources**: `e2e/src/indexed-db.ts`, `backup-export.spec.ts`, `purge-database.spec.ts`.

## 9. Resource limits and hostile input

**Decision**: Refuse files larger than 50 × 1024 × 1024 bytes before file.text(). Bound nesting by accepting only explicit flat row structures and the known nested difficulties list; do not recursively canonicalize unvalidated arbitrary objects. Display safe text errors without raw payload logging. Use request-generation checks to discard stale reads.

**Evidence**: An in-memory Node serialization-size probe (no fixture saved) produced 14.93 MiB for 78,475 synthetic history rows over five years. Repeated synthetic dates mean this probe is a size estimate only, not a validator/restore benchmark. Long notes/catalogs can increase size; test the cap exactly and profile valid large fixtures during implementation.

**Alternatives**: An unbounded parser risks excessive allocation. Silently truncating files or rows violates exact replacement.

## 10. Startup migration and tooling constraints

**Decision**: Await database open/ready and timer startup recovery before capturing current review state. Do not run LegacyPomodoroMigrationService as an import transform. Guard its existing ready-hook copy so a lingering legacy database cannot overwrite restored rows on reopening (single-user lastExportedAt presence can conservatively suppress a stale legacy copy; do not delete that legacy source as part of a rejected/failed import).

**Rationale**: The ready hook normally bulkPuts old sessions and deletes its source. A failed old migration could otherwise run again after import. A valid restored profile always has lastExportedAt; treating backed-up/restored main data as authoritative is safer than resurrecting obsolete local rows.

**Tooling**: The managed worktree did not contain ignored Spec Kit scripts/templates. Copied the original checkout's existing ignored directories locally and ran setup-plan successfully; they remain ignored. Angular MCP was removed from this session; user was prompted to start ng mcp, and implementation setup requires reconnecting it. No framework-version assertion here relies on memory.

**Sources**: `src/app/database/legacy-pomodoro-migration.service.ts`, `DbService` ready hook, `docs/code_style.md`, `AGENTS.md`.
