# Quickstart: Validate Data Import (Restore)

This guide applies after implementation. Fixtures must be synthetic; never use real backups in tests or commits.

## Prerequisites

From the 015 worktree, install locked dependencies with `npm ci`. Reconnect the project Angular CLI MCP server using `ng mcp` before generating Angular services or changing Angular code; obtain workspace-specific best practices. This planning session reported the missing server to the user.

Run `npm start` for manual checks. Stop another app using port 4200 or confirm it serves this worktree: Playwright reuses an existing server locally, which could otherwise test the wrong checkout.

## Mandatory automated gates

Run sequentially:

```powershell
npm run lint
npm run typecheck
npm test -- --watch=false
npm run e2e
```

For a focused iteration before the full suite:

```powershell
npx playwright test backup-import
npm run e2e:smoke
```

Expected: unit tests use real DbService/fake-indexeddb; browser tests use native IndexedDB. All required full gates pass without suppressions, new baseline gaps or skipped import tests.

## Round trip and moving devices

1. Seed all eleven stores through existing e2e helpers, reload, and retain a complete keyed snapshot.
2. Use Settings Download to obtain the real export file. Read its envelope; expect format 1/schema 11, plaintext JSON in .txt.
3. Purge through the existing confirmed Settings action. Add a synthetic destination-only row so replacement can be distinguished from merging.
4. Open Settings → Import data, select that downloaded file and verify every count, both balances, export time and app version.
5. Confirm replacement; expect Data restored toast and dashboard.
6. Compare every keyed row with the file, allowing only users.lastExportedAt = Date.parse(exportedAt). No destination-only/default extras remain. Balance and streaks match exactly.
7. Repeat with an isolated destination browser context to prove no dependency on device A's storage; test offline with a loaded app.

## Safety backup

Start with A on the device and a file containing B. Export current data from review (test both share results and actual Download); restore B; select the downloaded safety file and restore A. Cancellation/failure never initiates replacement. Verify A's stored rows/balance return, with only the timestamp override.

## Invalid and old files

Use [restore-file.md](./contracts/restore-file.md) and source-version fixtures for same/older/newer app/schema/format, encrypted header without plaintext data, missing/unknown tables or fields, row types, dates, nested money, duplicate keys and invalid category links. Historical missing tasks/difficulties/rewards remain importable. Category colors accept three/six hex digits with either case and existing empty-string values unchanged; reject CSS names, functions and declarations. All rejected cases preserve every store.

Check all adjacent transformations 1→11 and a chained oldest fixture. Review displays transformed counts/balance, and reopening the dialog does not generate new seed ids/timestamps.

## Mid-write rollback

Run the browser failure spec. Verify its native API wrapper observed a successful clear and incoming insert before aborting. Check the error UI and exact all-store baseline immediately and after reload. A test that merely rejects a malformed file does not satisfy this scenario.

## Concurrency and timer

- Modify a title without changing counts/balance while confirmation is open, including from a second page sharing the same context. Confirming refreshes review without writes. Timer race checks below concern the importing page; other-tab transactions serialized after commit are subsequent activity, outside its timer hold.
- Start a local timer; restore a file with the same session id. The imported row is unchanged and the destination timer stops.
- Delay a reward read so completion is in flight; verify replacement coordination prevents old rewards or notifications after commit.
- Force replacement rollback; the original session and deadline remain intact.
- Reload after a successful restore containing an active session: normal stored-session recovery is allowed, per the user's decision.
- Verify page navigation/unmount and file A→B selection cannot apply stale validation results.

## Layout and manual inspection

Register route and states as specified in [import-page.md](./contracts/import-page.md). Generate narrow/wide screenshots:

```powershell
$env:LAYOUT_AUDIT_SCREENSHOTS = '1'
npx playwright test layout-audit
Remove-Item Env:LAYOUT_AUDIT_SCREENSHOTS
```

Inspect 360px and 1280px images under test-results/layout-audit. Explicitly repeat using light and dark theme via the app's documented data-theme attribute or browser color scheme; the import-page screenshot pass now writes both themes at these two widths. Check all eleven counts, long filenames/errors, seven-digit money, confirmation, touch targets and wide-screen layout.

## Resource checks

Test exactly 50 MiB and 50 MiB + 1-byte file-size decisions before parsing. Profile valid multi-year histories on a representative phone, recording file bytes, validation/restore duration and responsiveness. The planning size estimate is not a performance result.


## Implementation evidence (2026-11-05)

Work now runs in the primary checkout on specs/015-data-import; the separate worktree was removed after hash-verifying the transfer of its pending artifacts. Angular CLI MCP discovered this workspace and supplied Angular 22 guidance. No package or database schema version was added.

The synthetic five-year fixture contains 78,475 history rows and 11,686,355 UTF-8 bytes. A focused desktop Chromium run reviewed it in 1,352 ms and confirmed/restored it in 23,063 ms using bounded batches in one transaction. The initial unbatched run took 43,804 ms for confirmation/restore. These are local observations, not a phone benchmark or a performance guarantee. Exact 50 MiB and one-byte-over rejection boundaries are unit-tested.

Automated browser evidence covers a native transaction abort after successful clear and insert, exact all-store preservation immediately and after reload, preservation of the running local timer, successful safety-export metadata surviving rollback, cross-tab same-count edits, queued timer completion, offline restore, same-id imported active sessions, and native-download safety recovery. Temporary native wrappers live only in browser test code and are restored or disposed with their page. Timer cancellation mutation checking failed the expected two tests when cancellation was deliberately removed; the original behavior was restored.

Pending physical-device checks: representative-phone validation/restore timings and responsiveness; actual operating-system share sheet, cancellation, fresh-tap retry and download fallback. Browser stubs and desktop offline tests do not replace those checks. T043 and T048 remain open for this reason.


Final automated evidence: lint and typecheck passed; all 1,197 unit tests passed (plus the strengthened delayed-notification/consent focused run); all 108 E2E tests passed with screenshot capture enabled. Reviewed all eight import states in both light/dark themes at 360px and 1280px, including long filenames, aligned count columns, large balances, progress, error, safety export, ready-to-share and confirmation. Thirty-two import screenshots were retained in the session artifact workspace. The production build retains the pre-existing initial-bundle warning at approximately 805 kB. Final production smoke recheck passed all 23 tests after rebuilding the final source.

Performance varies with concurrent work: the five-year restore took 40,214 ms during a normal full-suite run and 68,775–78,306 ms under concurrent full-page screenshot generation. These load-heavy observations reinforce the need for T043 physical-phone measurement; no phone responsiveness claim is made.
