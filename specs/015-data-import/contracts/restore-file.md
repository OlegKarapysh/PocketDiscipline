# Contract: Restore File and Compatibility

## Wire format

Reuse [spec 014 format 1](../../014-data-export/contracts/backup-file.md). No format or database version bump. A .txt file contains UTF-8 JSON; picker also permits .json/renamed files. Filename/MIME are hints, never validation.

Maximum file size: 52,428,800 bytes (50 MiB). Reject one byte above before reading contents; test exact boundary independently of file validity.

## Reader order

1. Check size and read once; parse JSON with a safe failure message.
2. Require a non-null object, exact format marker, well-typed positive format/schema numbers, valid SemVer appVersion, valid UTC exportedAt and boolean encrypted.
3. If formatVersion > 1, schemaVersion > current, or appVersion has higher SemVer precedence, refuse: "Update the app first to import this backup."
4. If encrypted is true, refuse: "Encrypted backups are not supported yet. Passphrase encryption is planned for spec 016." Do not require data or interpret an encryption block.
5. For plaintext, require supported format/schema, exactly its declared tables and array payloads. Check every row, primary-key uniqueness, nested shape, allowed fields and source money rules.
6. Transform older data through every adjacent schema version in memory, then validate the complete current data including required category references.
7. Return a prepared current-schema snapshot and immutable-by-ownership metadata for review. No device writes.

Invalid version/header types do not get coerced into versions. Header-only encrypted refusal is intentional; this is not a decryption validator. The newer-version refusal takes priority if an encrypted file also comes from a newer version.

## Data fidelity

All accepted keys and optional values are kept. IDs need not be UUIDs. Missing optional fields are not written as null. Row ordering is irrelevant except inside ordered nested arrays. Preserve stored balance/streaks and allow the historical missing references documented in [data-model.md](../data-model.md).

After the transaction, the only same-schema difference is users[1].lastExportedAt set to the header timestamp. Seed additions in an older-schema upgrade are shown in preview and reused exactly at commit.

## Compatibility obligations

- Support schema 1 through current 11 using explicit table sets, validators and adjacent transforms.
- Refuse unsupported older format/version or a missing transform with a compatibility explanation; never guess.
- Table-descriptor coverage must equal the real database table names.
- Transformation coverage must reach the current schema and fail tests when a new version lacks an entry, including explicit identity entries.
- Spec 014's reader guidance uses this same app-version ordering and refusal precedence; keep it aligned. Existing exported files remain unchanged.
