# Data Model: Data Export (Backup)

Schema version stays **11**. One optional field is added to an existing row; everything else is in-memory or
in the exported file.

## Stored

### `users` row (existing, `core/models/user.model.ts`)

| Field            | Type     | Change  | Rule                                                                                         |
| ---------------- | -------- | ------- | -------------------------------------------------------------------------------------------- |
| `lastExportedAt` | `number` | **new** | Optional, epoch ms. Absent until the first successful export. Not indexed, so no new version. |

- Written only after a share resolved or a download was handed to the browser (FR-017), with
  `db.users.update(CURRENT_USER_ID, { lastExportedAt })`. No other field changes, `updatedAt` included (FR-018).
- `purgeDatabase()` reseeds the row without it, so the card shows "Never" after a purge (FR-020).
- `docs/schema.md` gets the field and one sentence, like `balanceSetUpAt`.

## In memory (`features/backup/models/`)

### `BackupEnvelope` (`backup-envelope.model.ts`)

The file's top-level object. Fields and rules: [contracts/backup-file.md](./contracts/backup-file.md).

```ts
interface BackupEnvelope {
  format: typeof BACKUP_FORMAT; // 'pocket-discipline-backup'
  formatVersion: number; // 1
  schemaVersion: number; // db.verno
  appVersion: string;
  exportedAt: string; // ISO 8601, UTC
  encrypted: false;
  data: BackupData;
}
```

### `BackupData` (`backup-data.type.ts`)

`Record<string, unknown[]>`: table name → every row of that table, as stored. Keys are exactly the names in
`db.tables`.

### `BackupFile` (`backup-file.model.ts`)

What the export hands to delivery: the `File` (name, `text/plain` type, JSON content) and nothing else
derived from it. The name is built from the local time at the moment of export.

### `ShareOutcome` (`share-outcome.type.ts`)

`'shared' | 'cancelled' | 'needs-tap'`: the three results of `navigator.share` that are not failures
([research §2](./research.md#2-the-share-sheet-needs-a-recent-tap)). Any other rejection is rethrown.

### `BackupState` (`backup-state.type.ts`)

The card's state machine:

```text
idle ──Export──▶ preparing ──share resolved / download handed over──▶ idle (lastExportedAt recorded)
                     │  ├──AbortError─────────────────────────────▶ idle (nothing recorded)
                     │  ├──other error───────────────────────────▶ idle + toast
                     │  └──NotAllowedError──▶ ready ──Share──▶ (shared / cancelled / error) ──▶ idle
idle ──Download──▶ preparing ──handed over──▶ idle (recorded)
```

`ready` keeps the prepared `BackupFile` until it is shared, cancelled or downloaded; every one of those returns
to `idle` and drops it. While `preparing`, both buttons are disabled (FR-006). Download stays enabled in
`ready`, saves the prepared file, records the backup time and returns to `idle`.

## Validation

- `formatVersion`, `schemaVersion` are positive integers; `exportedAt` parses as a date; `encrypted` is `false`.
- `Object.keys(data)` equals `db.tables.map((table) => table.name)`; every array holds every row of its table.
- The file name matches `^pocket-discipline-\d{4}-\d{2}-\d{2}-\d{4}\.txt$`.