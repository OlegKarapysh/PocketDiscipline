# Contract: Import Page

## Entry and layout

Settings link: **Import data** → `/settings/data-import`, lazy-loaded DataImportPage under the existing Settings children. Use one PageHeader, SectionCard sections, Material buttons/spinner and Amount for money. Counts use pd-num. Actions wrap; comparison rows reflow rather than requiring a horizontally scrolling table.

Use signal/computed view state and safe Angular text bindings. Long filenames and error text wrap with min-width:0 and overflow-wrap:anywhere. Do not show a zero current balance/count while the current snapshot is loading or failed.

## States and controls

| State | Content and available actions |
| --- | --- |
| Idle | Single file picker; explains replacement and 50 MiB limit. |
| Checking | Busy feedback; conflicting actions disabled; older selection results cannot update this state. |
| Review | Filename, local display of exportedAt, source appVersion, transformed notice if applicable, every table's incoming/current counts, both balances. |
| Safety export | Export current data and Download; existing preparing/Share retry states; imported file remains selected. |
| Confirmation | Shared destructive ConfirmService dialog; Replace data and Cancel. |
| Replacing | Busy feedback; no second import/file change/export. |
| Rejected/error | Safe specific explanation; no restore for invalid input; retain valid review on recoverable transaction failure. |
| Committed | Memory-only timer reset, "Data restored." toast, navigate to /dashboard. Feedback/navigation failures do not claim rollback. |

Picker accepts .txt/.json and common text MIME hints but does not reject valid content based solely on the hint. Reset its value so the same file can be selected again. Generation checks ignore asynchronous results from an earlier selection or destroyed page.

## Confirmation copy

Title: **Replace all data?**

Body: **All data on this device will be replaced by this backup, including anything changed here since the file was exported.**

Action: **Replace data**, destructive styling. Cancel never writes. If current data changed since review, show **Data on this device changed. Review the updated values and confirm again.**

Subscribe using the shared ConfirmService semantics: it emits only true; cancellation completes without a value. Do not await firstValueFrom without handling empty completion.

## Export actions reuse

BackupExportActions owns per-instance prepared File and the current export interaction. Inputs: primaryLabel defaulting to Export data, disabled defaulting false. Output: busy boolean covering preparation and delivery. Ready-to-share overrides the label with Share; Download remains available when not busy.

Settings BackupCard delegates to it and retains the existing last-backup display. Import passes primaryLabel = Export current data; external disabled applies during validation/replacement/confirmation. On safety-export completion/cancellation, refresh the current full baseline before requesting confirmation. A successful export's metadata write is part of current device state, not an import failure side effect.

Native sharing cancellation is silent; non-cancellation failure offers Download. Existing services own file generation and native delivery. No share or download result triggers import.

## Layout audit

Register real route/states in e2e/src/layout-audit.spec.ts:

- picker / no file;
- complete preview, all eleven table kinds, large balances, long filename;
- checking and replacing states (browser response delay, not app flags);
- long validation failure;
- safety export preparing / ready-to-share;
- destructive confirmation overlay.

Use synthetic fixtures, existing dialog helper, audit widths 360/390/600/840/1024/1280/1920. Do not grow KNOWN_GAPS or UI baseline. Manually inspect light/dark at 360 and 1280, including touch targets and desktop use of space.
