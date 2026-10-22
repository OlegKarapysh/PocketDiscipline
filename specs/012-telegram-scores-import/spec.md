# Feature Specification: Import Historical Daily Scores from Telegram Chat Export

**Feature Branch**: `[012-telegram-scores-import]`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Add a Telegram daily scores import page in Settings (`/settings/telegram-import`) to import historical daily scores from a Telegram Desktop JSON chat export (`result.json`).

The export contains 400+ messages in `X/10` format (`1/10` to `10/10`); any messages with date shifts or notes are pre-patched in `result.json` before import so the parser only needs to match `1/10`–`10/10` and read each message's `date`. Service and empty messages are ignored.

Picking a file parses it locally on the device and displays a Preview card before importing: total scores to import (new vs. replacing existing dates), resulting high-score streak (`9`–`10`), average score, date range, same-day duplicates (keeping the latest message), and any skipped non-matching text messages so unpatched lines are visible before confirming.

Clicking Import writes the scores in a single `dailyScores` transaction, replaces existing scores on overlapping dates, recalculates `streakAtThisDay` and `rewardEarned` chronologically across all dates, leaves `users.balance` untouched, shows a snackbar summary, and navigates to `/daily-scores`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preview a Telegram Chat Export Before Importing (Priority: P1)

A user opens Settings, navigates to the Telegram scores import page, and selects a Telegram Desktop chat export file (`result.json`). The file is read locally on the device and a preview is displayed before anything is saved. The preview shows the total number of daily scores to import (broken down into new days vs. replacing existing days), the resulting consecutive high-score streak (`9` or `10`), the average score across the export, the date range covered, how many earlier messages on the same day were replaced by a later message, and the list of any skipped text messages that did not match the `1/10`–`10/10` score format so the user can spot unpatched notes before confirming.

**Why this priority**: Reading the export accurately and surfacing skipped lines and summary metrics before writing data is essential so the user can verify that their pre-patched `result.json` is clean and complete before modifying historical records.

**Independent Test**: Open `/settings/telegram-import`, pick a sample Telegram export containing valid `1/10`–`10/10` messages, service messages, same-day duplicates, and non-matching text messages, and verify the preview counts, date range, streak, average score, and skipped message list without saving anything.

**Acceptance Scenarios**:

1. **Given** the user is on `/settings/telegram-import`, **When** they pick a valid Telegram export file containing `1/10`–`10/10` messages, **Then** a Preview section displays the total scores to import (new vs. replaced), the resulting high-score streak, the average score (rounded to 1 decimal place), and the start-to-end date range.
2. **Given** an export containing non-matching text messages alongside valid score messages, **When** the file is selected, **Then** the Preview section lists each skipped message with its date and quoted text (truncated if over 40 characters) so the user can inspect unpatched lines before importing.
3. **Given** an export containing multiple valid score messages on the same calendar date, **When** the file is selected, **Then** only the latest message on that date is kept as the day's score and the preview notes the count of earlier same-day messages replaced.
4. **Given** an export containing Telegram service messages (e.g., pinned messages, chat creation) or empty messages, **When** the file is selected, **Then** those entries are silently ignored and do not appear as skipped messages.
5. **Given** the user selects a file that is not valid JSON, lacks a `messages` list, has an invalid message date, or contains zero valid `1/10`–`10/10` scores, **When** the file is read, **Then** a clear error alert is shown and no preview or import option is displayed.

---

### User Story 2 - Import Scores and Recalculate Chronological Streaks and Rewards (Priority: P1)

After reviewing the preview, the user clicks "Import". All parsed daily scores are saved in a single all-or-nothing operation. Existing scores on overlapping dates are replaced by the imported scores, while existing scores on non-overlapping dates are preserved. Across the entire combined timeline of dates, each day's consecutive high-score streak (`9` or `10`) and earned reward (for imported days) are recalculated in chronological order. The user's current money balance remains untouched, a confirmation notification summarizes what was imported, replaced, and skipped along with the resulting streak, and the user is taken to `/daily-scores`.

**Why this priority**: Persisting the historical scores and ensuring accurate chronological streaks and historical reward records is the core goal of the feature.

**Independent Test**: With existing daily scores in the app, import a Telegram export that overlaps some dates and precedes others, and verify that overlapping dates are updated, all daily streaks and imported rewards follow the chronological streak rules, the user's balance is unchanged, the summary notification appears, and the app navigates to `/daily-scores`.

**Acceptance Scenarios**:

1. **Given** a valid export preview is displayed, **When** the user clicks "Import", **Then** all scores from the export are saved atomically, a summary notification displays the imported count, replaced count (if any), skipped count (if any), and resulting high-score streak, and the app navigates to `/daily-scores`.
2. **Given** consecutive calendar days with scores of `9` or `10`, **When** imported, **Then** each high-score day increments the streak by 1 and calculates the day's reward as `100 ₴` (for `9`) or `500 ₴` (for `10`) plus `+10%` per prior consecutive high-score day (capped at `+100%`), rounded to whole hryvnias.
3. **Given** a day with a score of `1`–`8` or a missing calendar day between two recorded scores, **When** streaks are calculated across the timeline, **Then** the high-score streak resets to `0` on that day (or across the gap) and restarts at `1` on the next `9` or `10` day.
4. **Given** the app already has a daily score on a date present in the export, **When** the user imports the export, **Then** the existing score on that date is replaced with the imported score, timestamp, recalculated streak, and recalculated reward.
5. **Given** the app has an existing daily score on a date after the imported dates (not present in the export), **When** the imported scores change the streak leading into that existing date, **Then** the existing date's stored streak is updated to reflect the new chronological streak while preserving its existing reward.
6. **Given** any user balance before the import, **When** the import completes, **Then** the user's balance is identical to what it was before the import.

---

### User Story 3 - Navigate to Telegram Import from Settings (Priority: P2)

A user opens the Settings page and sees an option to open the Telegram daily scores import page alongside other data management actions.

**Why this priority**: Users need a discoverable entry point in Settings to access the import workflow.

**Independent Test**: Open `/settings`, click the link to import Telegram scores, and verify navigation to `/settings/telegram-import`.

**Acceptance Scenarios**:

1. **Given** the user is on `/settings`, **When** they select the Telegram scores import link, **Then** the app navigates to `/settings/telegram-import`.

---

### Edge Cases

- **Segmented message text arrays**: Telegram Desktop exports message `text` either as a plain string or as an array of strings and formatted text entity objects (e.g., `[{ "type": "bold", "text": "9" }, "/10"]`). Both formats must be flattened and trimmed before matching `1/10`–`10/10`.
- **UTF-8 BOM and whitespace**: Export files starting with a UTF-8 byte-order mark (`\uFEFF`) or messages with leading/trailing whitespace must parse cleanly.
- **Same-day duplicate scores**: When two or more valid score messages fall on the same local calendar date, they are ordered by message timestamp and the latest message wins; earlier messages on that date are counted as same-day duplicates.
- **Non-matching or out-of-range scores**: Text messages like `0/10`, `11/10`, `8.5/10`, or unpatched notes like `8/10 (yesterday)` do not match `^(10|[1-9])/10$` and are recorded in the skipped messages list with their date and a truncated quote (up to 40 characters + `…`).
- **Missing or invalid message dates**: A message with a missing, malformed, or calendar-invalid `date` (such as `2026-02-31T10:00:00`) causes parsing to fail immediately with an error naming the invalid date value before any preview is shown.
- **Re-picking the same file**: Selecting the same file a second time in the file picker still triggers parsing and refreshes the preview.
- **Atomic failure**: If writing to storage fails mid-import, no partial changes are kept and an error notification informs the user that nothing was written.

## Requirements *(mandatory)*

### Architectural Constraints

- **AC-001**: Feature MUST be structured as a Vertical Slice, keeping all related concerns together.
- **AC-002**: Feature MUST NOT introduce unnecessary external dependencies.
- **AC-003**: Code design MUST adhere to SOLID principles and established developer best practices.
- **AC-004**: Any UI MUST follow `docs/design_system.md`: shared components first, theme and token layer only.

### Functional Requirements

- **FR-001**: System MUST provide a Telegram daily scores import page at `/settings/telegram-import`, accessible from the Settings page (`/settings`).
- **FR-002**: System MUST process the selected JSON file entirely on the user's device without uploading data externally.
- **FR-003**: System MUST validate that the selected file is a JSON object containing a `messages` array of message objects, rejecting invalid files with the error message `"This is not a Telegram chat export."`.
- **FR-004**: System MUST ignore any message whose `type` is not `"message"` or whose extracted text is empty after trimming.
- **FR-005**: System MUST extract message text whether `text` is a plain string or an array of string/entity segments, collapsing internal whitespace and trimming ends.
- **FR-006**: System MUST parse each message's `date` (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm[:ss]`) as local device time (defaulting to `12:00:00` if time is omitted) and reject malformed or non-existent calendar dates with an error naming the invalid date.
- **FR-007**: System MUST match extracted message text against exact integer scores from `1/10` through `10/10` (`^(10|[1-9])/10$`).
- **FR-008**: System MUST collect non-empty `"message"` entries that do not match `1/10`–`10/10` as skipped messages formatted as `<YYYY-MM-DD>: "<text>"`, truncating text longer than 40 characters with `…`.
- **FR-009**: When multiple valid score messages occur on the same calendar date (`YYYY-MM-DD`), System MUST keep the message with the latest timestamp and count each superseded message toward `duplicateDates`.
- **FR-010**: System MUST reject an export that contains zero valid daily scores with the error message `"No daily scores (1/10–10/10) were found in this export."`.
- **FR-011**: Before importing, System MUST display a Preview card showing:
  - Total scores to import, with a hint indicating how many are new vs. replacing existing dates
  - Resulting high-score streak (ending on the latest date in the combined dataset)
  - Average score across the parsed export (rounded to 1 decimal place) and total count of high scores (`9`–`10`)
  - Date range from earliest to latest parsed score date
  - Notes for same-day duplicates and skipped messages when present, plus the full list of skipped messages
- **FR-012**: On confirmation ("Import"), System MUST write all new and updated daily score records in a single atomic operation, replacing existing scores on overlapping dates with the imported score, timestamp, recalculated streak, and recalculated reward.
- **FR-013**: System MUST recalculate `streakAtThisDay` chronologically across all stored and imported dates, where a score of `9` or `10` increments the previous calendar day's streak by 1 (or starts at 1 if the previous calendar day has no record or scored below 9) and a score of `1`–`8` sets `streakAtThisDay` to `0`.
- **FR-014**: System MUST calculate `rewardEarned` for each imported date as `0 ₴` for scores `1`–`8`, base `100 ₴` for score `9`, and base `500 ₴` for score `10`, multiplied by `1 + min(previousDayStreak * 0.1, 1.0)` and rounded to whole hryvnias.
- **FR-015**: System MUST NOT modify the user's money balance during or after the import.
- **FR-016**: After a successful import, System MUST display a summary notification (imported count, replaced count if > 0, combined skipped count `skippedMessages.length + duplicateDates` if > 0, and resulting high-score streak) and navigate to `/daily-scores`.

### Key Entities

- **Telegram Score Row (`TelegramScoreRow`)**: A validated daily score candidate extracted from a message in `result.json`, holding the calendar `date` (`YYYY-MM-DD`), numeric `score` (`1`–`10`), and `createdAt` timestamp.
- **Telegram Export Parse Result (`TelegramExportParseResult`)**: The parser output containing the deduplicated chronological list of `scores` (`TelegramScoreRow[]`), the count of superseded same-day `duplicateDates`, and the list of formatted `skippedMessages`.
- **Telegram Import Preview (`TelegramImportPreview`)**: The pre-import summary combining parsed export rows with existing stored scores to report `totalScores`, `newScores`, `replacedScores`, `highScores`, `averageScore`, `resultingStreak`, `startDate`, `endDate`, `duplicateDates`, and `skippedMessages`.
- **Telegram Import Result (`TelegramImportResult`)**: The post-import outcome reporting counts of `imported`, `replaced`, and `skipped` (`skippedMessages.length + duplicateDates`) entries alongside the `resultingStreak`.
- **Daily Score (`DailyScore`)**: The persisted daily self-assessment record keyed by calendar `date` (`YYYY-MM-DD`), storing `score` (`1`–`10`), `rewardEarned` (whole hryvnias), `streakAtThisDay`, and `createdAt` timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A Telegram Desktop `result.json` export containing 400+ messages is parsed and previewed on the device in under 1 second after file selection.
- **SC-002**: 100% of valid `1/10`–`10/10` messages (after same-day deduplication) are imported with chronologically accurate streak counts and whole-hryvnia rewards matching the app's daily score reward rules.
- **SC-003**: 100% of non-matching text messages in the export are surfaced in the preview's skipped messages list before the user confirms the import.
- **SC-004**: The user's money balance before and after importing any Telegram export is 100% identical.
- **SC-005**: The `/settings/telegram-import` page passes the responsive layout audit across all 7 reference widths (`360px` to `1920px`, including `360px` mobile and `1280px` desktop) without horizontal overflow or overlapping elements.

## Assumptions

- Any historical messages that originally contained date shifts (e.g., "yesterday") or free-text notes alongside a score have already been pre-patched in `result.json` before selecting the file; any remaining unpatched messages should be flagged as skipped in the preview rather than heuristically parsed.
- Message `date` strings in Telegram Desktop exports represent local time on the user's device.
- Existing scores on dates not present in the Telegram export keep their originally recorded `rewardEarned`, even if their `streakAtThisDay` is updated due to newly imported preceding dates.
- Re-importing the same export replaces the overlapping dates deterministically and yields the exact same resulting streaks, rewards, and daily scores.
