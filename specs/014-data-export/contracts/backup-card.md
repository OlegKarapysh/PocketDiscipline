# Contract: Backup card on Settings (UI)

`app-backup-card` (`features/backup/components/backup-card/`), rendered by `settings.html` above the list of
links. It takes no inputs and emits no outputs: it reads the user row and drives the export itself.

## Content

Built on `app-section-card` with heading **Backup**.

| Element          | Copy                                                                                       | Notes                                                    |
| ---------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Note             | "Saves all your data to one file you can keep elsewhere. The file is not encrypted."       | `body-medium`, `on-surface-variant` (FR-001)             |
| Last backup      | "Last backup: Never" / "today" / "yesterday" / "N days ago"                                 | Blank until the user row is read ("not loaded is not empty") |
| Primary action   | "Export data" (icon `ios_share`); "Share" (icon `ios_share`) in the ready state           | `mat-flat-button`                                        |
| Secondary action | "Download" (icon `download`)                                                               | `mat-stroked-button`; always present (FR-012)            |

## States

| State       | Primary                                    | Download                      | Accessible feedback                    |
| ----------- | ------------------------------------------ | ----------------------------- | -------------------------------------- |
| `idle`      | "Export data", enabled                     | enabled                       | —                                      |
| `preparing` | disabled, spinner in place of the icon     | disabled                      | `aria-busy` on the actions             |
| `ready`     | "Share", enabled; one tap opens the sheet  | enabled, saves the same file  | "Your backup is ready to share." text  |

Where the device cannot share files, "Export data" downloads (FR-013); the Download button is still shown.

## Feedback

All through `SnackBarService`:

- Shared → "Backup shared." Downloaded → "Backup saved."
- Share cancelled → no toast.
- Share failed → "Couldn't share the backup. Use Download instead."
- Reading the database failed → `snackBar.error(e, "Couldn't prepare the backup.")`.

## Layout

- One column at 360px. The actions sit in a `flex-wrap` row; each button may grow to the full width of a
  phone column and keeps its 44px height. No `t.up()`/`t.down()` for the card's own layout.
- Registered in `e2e/src/layout-audit.spec.ts` (see [quickstart](../quickstart.md#layout-audit)).

## Test hooks

Selectors for e2e: the buttons by role and name; the last-backup line by its text. No test ids.