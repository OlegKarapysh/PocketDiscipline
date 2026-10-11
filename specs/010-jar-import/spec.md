# Feature Specification: Import Daily-Task History from a monobank Jar Statement

**Feature Branch**: `[feature/010-jar-import]`

**Created**: 2026-10-10

**Status**: Draft

**Input**: User description: "Import daily-task history from a monobank jar statement. Before this app existed, every reward was paid into a monobank jar with a comment naming the habit, its difficulty, the streak bonus and sometimes a shift to yesterday. Turn that CSV into daily tasks with their full completion history, so past earnings show on the dashboard and streaks carry on in the app."

## Clarifications

### Session 2026-10-10

Answered by Oleh in the brief, before any work started.

- Q: Which branch is the work based on? → A: A feature branch, `feature/010-jar-import`, from the main branch (after the audit fixes were merged).
- Q: What gets imported? → A: The tasks plus the full completion history: dashboard earnings for past days, and streaks that carry on into the app.
- Q: What happens to the balance? → A: Leave it unchanged. The deposits in the file total 202,633 ₴ and the jar closes at 7,152.60 ₴; neither is added.
- Q: What happens to the rows that are not daily tasks? → A: All of them are imported: scores (`9/10`, `10/10`) become daily scores; pomodoro rows become focus sessions, 25 minutes each because the jar has no durations; one-offs become completed goals; withdrawals go to the withdrawal ledger, with no title of their own because they carry no comment. Whatever matches none of these is classified and reported as skipped.
- Q: How are labels grouped into tasks? → A: A review screen shows a suggested grouping, and every row of it can be edited.
- Q: How are measured exercises (pull-ups by reps, Sally up and plank by time) turned into difficulties? → A: One difficulty per reward tier, named by the observed range ("11–19", "20–29", "30+").
- Q: What about the same task twice on one day (16 cases after the yesterday shift)? → A: Keep both rows, because the money was paid. The streak counts distinct days.
- Q: Is there an undo? → A: Not now. "Purge database" is the only reset.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read a statement and see what is in it (Priority: P1)

Oleh opens Settings, follows "Import jar statement", and picks the CSV file monobank exported. The page reads it on the device and shows a summary: how many rows, the date range, how many are rewards and how many are withdrawals, and how many of the rewards are tasks, scores, focus sessions, one-offs and top-ups. A file that is not a jar statement is rejected with a message, and nothing else happens.

**Why this priority**: Nothing else works without a correct reading of the file, and the summary is how Oleh checks that reading against the bank before anything is written.

**Independent Test**: Pick the synthetic fixture and compare the summary with the counts the fixture was built to produce; pick a CSV with a different header and see it rejected.

**Acceptance Scenarios**:

1. **Given** the import page, **When** Oleh picks a jar statement, **Then** the summary shows the row count, the first and last date, the deposit and withdrawal counts, and the count of each kind of reward.
2. **Given** the import page, **When** Oleh picks a file whose header is not exactly the jar header, **Then** an error says the file is not a monobank jar statement, and no summary or review appears.
3. **Given** a row whose comment marks it as yesterday's, **When** the statement is read, **Then** that row belongs to the day before its bank date.

---

### User Story 2 - Review the suggested grouping and import (Priority: P1)

Below the summary, the page lists one review row per label it found ("тренировка", "холодный душ", "подтягивания", "pomodoro study", "withdrawals", each one-off...). Each row shows how many statement rows it covers and what they paid, and suggests what to do with them: add them to a daily task (named, and marked when that task already exists), record them as daily scores or focus sessions, record each one as a completed goal, write them to the withdrawal ledger, or skip them. Oleh changes any row he disagrees with, including the task name, which is also how two labels are merged into one task. He presses "Import" and gets one message saying what was written and what was skipped.

**Why this priority**: This is the feature. The review is the decision the brief asks for; the import is what puts the history in the app.

**Independent Test**: Import the synthetic fixture and check the task list (titles, difficulties, streaks) and the dashboard's earnings for past days.

**Acceptance Scenarios**:

1. **Given** a read statement, **When** Oleh imports without changing anything, **Then** every recurring habit becomes a daily task with its difficulties, every one of its rows becomes a completion on its effective day that earned exactly what the jar was paid, and the dashboard shows those earnings on those days.
2. **Given** a daily task that already exists with the same title (ignoring case, extra spaces and ё/е), **When** the import runs, **Then** the existing task gets the completions and only the difficulties it lacked; no second task is created.
3. **Given** the import finished, **When** Oleh opens Tasks, **Then** each imported task's streak is the number of consecutive days, ending on its latest completion, that have at least one completion.
4. **Given** two rows of the same task on one day, **When** the import runs, **Then** both become completions, and the day counts once toward the streak.
5. **Given** a statement that was already imported, **When** Oleh imports it again, or imports a newer statement that overlaps it, **Then** only the rows not yet in the app are written, and the message says how many were already there.
6. **Given** any import, **When** it finishes, **Then** the balance is exactly what it was before.
7. **Given** Oleh changes a row to "Skip", **When** the import runs, **Then** none of that row's statement rows are written, and they are counted as skipped.
8. **Given** the import fails part-way, **When** the error is shown, **Then** nothing from the statement has been written.

---

### User Story 3 - The rest of the history: scores, focus sessions, one-offs and withdrawals (Priority: P2)

The rows that are not daily tasks are imported too, so the dashboard's past earnings are complete: `9/10` and `10/10` become daily scores, pomodoro rows become completed focus sessions, one-off rewards become completed goals, and withdrawals appear in the rewards history.

**Why this priority**: The decision for question 4 includes them, but the daily-task history works without them.

**Independent Test**: Import the fixture and check the daily scores page, the dashboard's focus and goal earnings for a past day, the completed goals list and the withdrawal ledger.

**Acceptance Scenarios**:

1. **Given** a `10/10` row, **When** imported, **Then** its day has a score of 10 that earned what the jar was paid, with the score streak counted from the days before it.
2. **Given** a pomodoro row for N sessions, **When** imported, **Then** N completed 25-minute sessions of the right kind end on its effective day and together earned what the jar was paid.
3. **Given** a one-off row, **When** imported, **Then** a completed goal with the comment as its title and the paid amount as its reward is completed on that day.
4. **Given** a withdrawal row, **When** imported, **Then** the ledger shows it on its day, in whole hryvnias, without changing the balance.
5. **Given** a day that already has a daily score in the app, **When** a score row for that day is imported, **Then** the app's score is kept and the imported one is reported as skipped.

### Edge Cases

- A comment with a day-shift marker in any of its forms ("(yesterday)" before or after the text, inside the bonus brackets, "(вчера)", "yessterday" with a doubled letter) belongs to the previous day, at 23:59.
- A comment with an unclosed bonus bracket ("(+100%"), a bonus glued to the text ("душ(+100%)"), double spaces, mixed case or ё instead of е reads the same as the clean form.
- A "(COMPLETED!)" milestone is a one-off, not a tier of its habit.
- A label used once or twice with no bonus is a one-off, not a habit. A label with a bonus, or used three or more times, is a habit.
- "Подсчёт итогов месяца" is monthly, so it is not a daily task; it is skipped unless Oleh chooses otherwise.
- A withdrawal of 21.40 ₴ is stored as 21 ₴: the app holds whole hryvnias only.
- A measured row whose reward does not fit its tier (a mis-typed bonus, a one-off price) still earns what was paid; it is filed under the tier its measurement falls in.
- An empty file, a header-only file, or a row with the wrong number of fields is rejected with the line number, before anything is shown.
- 60 or more review rows, or a 100-character label, still fit a 360px screen.

## Requirements *(mandatory)*

### Architectural Constraints
- **AC-001**: Feature MUST be structured as a Vertical Slice, keeping all related concerns together.
- **AC-002**: Feature MUST NOT introduce unnecessary external dependencies.
- **AC-003**: Code design MUST adhere to SOLID principles and established developer best practices.
- **AC-004**: Any UI MUST follow `docs/design_system.md`: shared components first, theme and token layer only.

### Functional Requirements

- **FR-001**: System MUST offer the import from Settings, linked the same way as "Manage reward categories".
- **FR-002**: System MUST read the file on the device only; the statement MUST NOT leave the device.
- **FR-003**: System MUST reject any file whose header is not exactly the monobank jar header, and any row it cannot read, naming the line.
- **FR-004**: System MUST read each row's date and time as local time from its parts.
- **FR-005**: System MUST classify every reward row as a score, a pomodoro, a timed exercise, a counted exercise, a top-up, a graded habit or free text, after removing the day-shift, bonus and "completed" markers.
- **FR-006**: System MUST treat a graded label as a recurring habit when it ever carries a bonus or occurs three or more times, and as a one-off otherwise.
- **FR-007**: System MUST apply the known aliases before grouping: "речью дня" is "ревью дня"; "холодный", "душ" and "холодная ванна" are the Холодный душ task; "первая заметка", "заметка N" and "заметки N" are one notes task.
- **FR-008**: System MUST show a summary and a review list with one editable row per label, each with a suggested action and, for a daily task, a suggested task name.
- **FR-009**: System MUST derive each task's difficulties from its rows: one per level for graded habits, and one per reward tier, named by its observed range, for measured exercises. Every difficulty's base reward MUST be a whole number of hryvnias, at least 1.
- **FR-010**: System MUST store, for every imported row, the amount the jar was actually paid as what it earned.
- **FR-011**: System MUST give every imported row a stable identity derived from its date-time and the jar's closing balance, so importing the same or an overlapping statement writes only the rows not yet present.
- **FR-012**: System MUST reuse an existing daily task whose title matches after folding, and add only the difficulties it lacks.
- **FR-013**: System MUST, after the import, set each touched task's last completion to its latest completion and its streak to the consecutive distinct days ending there.
- **FR-014**: System MUST leave the balance unchanged.
- **FR-015**: System MUST write everything in one all-or-nothing step.
- **FR-016**: System MUST report the result in one message: completions and tasks, the other records written, how many rows were already present and how many were skipped.

### Key Entities

- **Statement row**: One line of the CSV: bank date-time, category (reward deposit or withdrawal), amount, comment, closing balance. Its identity is the date-time plus the closing balance.
- **Classified reward**: A deposit row after the comment is read: its kind, label, level or measurement, bonus, effective day and base reward.
- **Review row**: One label's rows, the action chosen for them, and the task name when the action is a daily task.
- **Daily task, difficulty, completion, daily score, focus session, goal, withdrawal**: The existing records the import writes; see `docs/schema.md`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every one of the 1,315 reward rows in Oleh's real statement is classified, with none failing: 131 scores, 136 pomodoro, 34 timed, 171 counted, 11 top-ups, 811 graded habits and 21 free text; 100 rows shift to yesterday and 922 carry a bonus.
- **SC-002**: After the import, the sum of the dashboard's daily earnings over the statement's date range equals the sum of the imported rows' paid amounts.
- **SC-003**: Importing the same statement a second time writes nothing.
- **SC-004**: The balance before and after any import is identical.
- **SC-005**: From picking the file to the result message takes one file pick and one press of "Import" when the suggestions are accepted.
- **SC-006**: The import page passes the layout audit at every reference width with 60 review rows and a 100-character label.

## Assumptions

- The device runs in Kyiv time, which is the time the statement is written in.
- Only the "Разові поповнення" (reward deposit) and "Часткове зняття" (withdrawal) categories occur; any other category is rejected as unreadable.
- A day-shifted row is completed at 23:59 of the previous day. Every other row is completed at its bank time.
- A top-up ("поповнення рахунку банки") is money put into the jar, not an earning, so it is skipped by default; Oleh can import it as a goal instead.
- A "(COMPLETED!)" row is a milestone: it gets its own review row, suggested as a goal.
- A difficulty with no level is named "Standard". A level is shown as written, with its first letter capitalised.
- A pomodoro row with no kind is work. A pomodoro row with no session count is round(paid ÷ the kind's rate), at least one. Its sessions run back to back and end at the row's completion time; the paid amount is split across them.
- A withdrawal is titled "Jar withdrawal" and filed under the General category.
- A goal's title is the comment without its markers, cut to the title length limit.
- A statement row is written to at most one table. A row already present in any table counts as already imported, whatever the review now says. Daily scores are keyed by day, so a score is "already present" when its day has one.
- No new database version is needed: every record fits the current schema.
