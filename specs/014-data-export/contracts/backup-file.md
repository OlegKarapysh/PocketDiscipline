# Contract: Backup file, format version 1

The file is the interface between this app and every later reader: import (spec 015), an encrypted backup
(spec 016), and a person opening it in a text editor. Changing anything below in a way an existing reader
would misread requires a new `formatVersion`.

## Name and type

- Name: `pocket-discipline-YYYY-MM-DD-HHmm.txt`, local date and 24-hour time of the export
  (`pocket-discipline-2026-11-01-1930.txt`).
- MIME type: `text/plain`. Encoding: UTF-8, no BOM.
- Why `.txt`: Chromium shares only allowlisted types and `json` is not on the list
  ([research §1](../research.md#1-which-file-types-the-share-sheet-accepts)).

## Content

One JSON object, pretty-printed with two-space indentation so a person can read it:

```json
{
  "format": "pocket-discipline-backup",
  "formatVersion": 1,
  "schemaVersion": 11,
  "appVersion": "0.0.0",
  "exportedAt": "2026-11-01T17:30:12.345Z",
  "encrypted": false,
  "data": {
    "users": [{ "id": 1, "name": "Current", "balance": 1250, "createdAt": 1790000000000, "updatedAt": 1790000000000 }],
    "goals": [],
    "...": []
  }
}
```

| Field           | Type      | Meaning                                                                                                  |
| --------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `format`        | string    | Always `pocket-discipline-backup`. A reader rejects any other value: it is not a backup of this app.     |
| `formatVersion` | integer   | Version of this envelope contract. `1` here. Bumped only for a change an existing reader would misread. |
| `schemaVersion` | integer   | Dexie schema version of the exporting app (`db.verno`, 11 today). Describes the shape of `data`'s rows. |
| `appVersion`    | string    | App version from `package.json`. Informational only.                                                     |
| `exportedAt`    | string    | ISO 8601 UTC time the snapshot was taken.                                                                |
| `encrypted`     | boolean   | `false` in this spec. When `true` (spec 016), `data` is absent and an encryption block replaces it.      |
| `data`          | object    | Present when `encrypted` is `false`. Table name → array of that table's rows, as stored.                 |

### `data`

- Holds every table of the database, also empty ones (`[]`): today `users`, `tasks`, `goals`, `dailyTasks`,
  `dailyScores`, `pomodoroSessions`, `dailyTaskCompletions`, `withdrawals`, `rewards`, `rewardCategories`,
  `pomodoroRewardRates`. Row shapes are those of [docs/schema.md](../../../docs/schema.md) at `schemaVersion`.
- Rows are written as stored: same keys, same values, same ids (UUIDs, `jar-…` ids and date keys alike).
  Optional fields that are absent on a row are absent in the file, never `null`.
- Row order within a table is not part of the contract.

## Rules for readers (for spec 015 and 016)

1. Parse; if it is not a JSON object with `format === 'pocket-discipline-backup'`, it is not a backup.
2. `formatVersion` greater than the reader knows → the file is from a newer app; refuse and ask to update.
3. `encrypted === true` → decrypt first (spec 016); a reader without encryption support refuses.
4. `schemaVersion` greater than the reader's database version → newer app; refuse. Smaller → the rows are
   older; the reader upgrades them as the Dexie upgrade functions would.

## Compatibility promise for spec 016

Encryption adds fields beside the envelope (for example `encryption: { algorithm, kdf, salt, iv, ciphertext }`)
and sets `encrypted: true` with `data` absent. All other header fields stay readable in plain text, so a
reader can tell what the file is and how old it is before asking for the passphrase. That is not a format
break, so `formatVersion` stays `1`.