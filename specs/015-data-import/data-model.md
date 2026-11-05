# Data Model: Data Import (Restore)

## Persistence

Use the existing eleven tables at schema 11. No table/index/version changes. Accepted rows are restored with their original keys, values, optional-field absence and nullability. The sole same-schema override is `users[1].lastExportedAt = Date.parse(envelope.exportedAt)`. Do not rewrite updatedAt or add an import marker.

A successful safety export may update the current profile before restore. This becomes the baseline for a later failed attempt. Normal timer recovery after reload is explicitly allowed.

## Runtime entities

One declared interface/type per file; runtime validation services consume unknown values.

| Entity / planned file under features/backup/models | Fields and meaning |
| --- | --- |
| ValidatedBackup / validated-backup.model.ts | Checked header; source schema; current-schema table data; transformed flag; incoming counts and balance. Retain the prepared object for the selected-file generation. |
| DeviceSnapshot / device-snapshot.model.ts | Full consistent current table rows, canonical comparison value, counts and balance. A private device baseline, not content added to the backup file. |
| BackupComparison / backup-comparison.model.ts | File display name/exportedAt/appVersion, transformed notice, precomputed per-table label/incoming/current counts, incoming/current balance. |
| BackupImportState / backup-import-state.type.ts | Discriminated idle/checking/review/confirming/replacing/error/success view states; review data retained on recoverable errors. |
| BackupImportError / backup-import-error.model.ts | Stable reason code, safe message, optional table/row/field path; no personal row dump. |

Use existing BackupEnvelope/BackupData/BackupFile models for export. A plaintext import must not be cast to BackupEnvelope before validating it; encrypted headers may have no data at all.

## Envelope

Exact marker: `pocket-discipline-backup`. Format version: positive integer, only 1 supported. Schema version: positive integer 1–11 supported by explicit source descriptors/transforms. App version: valid SemVer; compare numeric components and prerelease precedence, ignoring build metadata. Export time: valid UTC ISO instant compatible with exporter output, not Date.parse alone accepting an impossible calendar date. Encryption flag: actual boolean.

Newer format/schema/app → update-required. Recognised encrypted header → encryption-unsupported before requiring data. Unknown envelope keys are not evidence of support: plaintext keys follow format 1; encrypted payload keys are not interpreted by this reader.

## Table validation at current schema

Table set must exactly match DbService.tables. Explicit descriptor coverage tests fail when a database table or a documented migration version is added without import support. JSON cannot represent undefined; optional fields absent in the exporter remain absent.

| Table / primary key | Shape and domain checks |
| --- | --- |
| users / numeric id | Exactly one row, id = 1; name string; signed safe-integer balance as stored (do not infer a form maximum); finite valid createdAt/updatedAt; optional balanceSetUpAt/lastExportedAt timestamps. |
| tasks / id | Nonempty string id, string title, declared HABIT/ONEOFF type, boolean isCompleted, whole nonnegative rewardValue, nullable lastCompletedAt timestamp, createdAt. |
| goals / id | String id/title, whole nonnegative rewardValue, ACTIVE/COMPLETED status, nullable completedAt, createdAt. |
| dailyTasks / id | String id/title, createdAt, nonnegative safe-integer sortOrder/streak, nullable lastCompletedAt; difficulties array with unique nonempty ids scoped to task, string names and whole nonnegative baseReward. |
| dailyTaskCompletions / id | String id/taskId/difficultyId, real YYYY-MM-DD date, whole nonnegative rewardEarned, completedAt timestamp. Historical missing task/difficulty is permitted. |
| dailyScores / date | Real unique YYYY-MM-DD, integer score 1–10, whole nonnegative rewardEarned, nonnegative safe-integer streakAtThisDay, createdAt. |
| pomodoroSessions / id | String id; finite positive durationMinutes compatible with stored legacy/imported sessions (do not impose the current preset list); work/study engagementType; active/completed/cancelled status; startTime; optional endTime and whole nonnegative rewardEarned. |
| pomodoroRewardRates / engagementType | work/study key, unique; whole positive baseReward. Empty table valid: default rates are not materialized. |
| withdrawals / id | String id/title/categoryId, whole nonnegative amount, real date, timestamp; optional string notes; optional nullable rewardId. |
| rewards / id | String id/title/categoryId, whole nonnegative cost, repeatable/one-time type, active/claimed/archived status; nonnegative safe-integer claimCount; createdAt; optional updatedAt; optional nullable claimedAt. Accept documented legacy description/icon as optional strings and preserve them when present; current producers do not require or emit them. |
| rewardCategories / id | String id/name/color/icon; boolean isDefault/isProtected; createdAt. Actual fixed fallback id is cat-general. Color is either the existing stored empty string or a leading # followed by exactly three or six ASCII hex digits (case-insensitive), matching CategoryService's persisted output; preserve its exact value. Reject CSS names/functions/declarations; do not trim, normalize, or turn imported data into style code. The empty-string exception preserves values createCategory can currently store. |

All required timestamp numbers must be finite and representable valid dates; preserve supported historical epoch values and future dates. Do not invent chronology constraints or form-length maxima that existing imports/exports do not require. Duplicate row keys and duplicate nested difficulty ids are invalid. Disallow unknown fields once the persisted allowlist audit is complete; preserve every allowed legacy optional field instead of stripping it.

Money validation includes every schema money field and every nested difficulty reward. Version-9 rounding can legitimately produce zero from an older positive fractional amount, so those nominal fields accept stored zero even though today's creation forms require at least one. Rates introduced in version 11 remain positive. Old schemas may contain finite fractional money; only the version-9 transform normalizes them. Reject non-money/type corruption before transformation rather than relying on permissive old migration code to repair it.

## Relationships

- rewards.categoryId → incoming rewardCategories.id, required.
- withdrawals.categoryId → incoming rewardCategories.id, required.
- dailyTaskCompletions.taskId/difficultyId → historical references allowed even when task or difficulty is absent. If a difficulty exists on an unrelated task, that does not repair/change the stored reference.
- withdrawals.rewardId → optional/null or historical reward reference; missing target allowed.
- No incoming reference is satisfied by destination-only rows.
- Do not enforce unique active titles or recompute streak/reward/balance from history.

## Source schemas and transforms

The table-introduction map and complete 1→11 chain are in [research.md](./research.md#4-older-schema-transformations). Pre-v10 dailyTasks lack required sortOrder; pre-v9 money can be fractional; pre-v11 rate table is absent. Other optional fields remain optional when historically absent. Schema-specific descriptors distinguish a legitimately absent future table from a missing required table.

Prepare a detached copy; validate source, execute adjacent transformations, validate the full result. New ids/default timestamps generated by the historical v2/v8 upgrade semantics are fixed once for the reviewed snapshot. No ready/populate hook runs against the device during preparation.

## Equality and consent

Canonicalize only validated row structures. Sort tables by name, rows by their actual primary key and object keys recursively within declared shapes; preserve array order where meaningful (dailyTasks.difficulties), absent fields and null. Table row order is not part of the backup contract.

Capture current rows and canonical baseline in one read transaction. In the replacement transaction re-read all rows and synchronously compare against that baseline. If anything changed, abort with device-changed and refresh review; no clear/insert is attempted. Do not use only counts, profile updatedAt or a weak hash as the consent token.

## State transitions

```text
idle -> checking -> review -> confirming -> replacing -> success
           |          |           |             |
           v          |           +-> review    +-> review + error (rollback)
         error        +-> safety export -> review (baseline refreshed)
                      +-> checking (new file; old async result discarded)
replacing -> review + device-changed (fresh confirmation required)
```

Safety export has its existing idle/preparing/ready-to-share substate in the reusable actions component. Busy state disables conflicting file/restore/export actions. Confirmation cancellation completes without an emitted true value; release UI state on observable completion as well as success.

A temporary timer hold is private coordination state, not a durable paused session. Release on rollback using the original expected deadline; finalize on success through memory-only reset. Normal stored active-session recovery on a later reload is unchanged.


## Implementation field audit (2026-11-05)

Verified all eleven core row models, the database migrations, reward/category producers and export serialization. Reward updatedAt is optional; description/icon remain accepted legacy optional strings. Current reward status producers emit active/claimed; archived remains accepted as documented legacy data. Category fallback is cat-general, and createCategory can persist an empty color. Version 9 can round positive fractional money to zero. IDs from jar imports and date keys remain valid. No current form maxima or UUID requirement apply to restore. The existing format-1 reader contract agrees with newer-app refusal and encrypted-header precedence; no exported bytes change.
