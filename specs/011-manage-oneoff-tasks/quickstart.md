# Quickstart Validation Guide: Manage One-Off Tasks

## Prerequisites

- Start the dev server with `npm start` and open `http://localhost:4200/tasks`.
- Switch to the **One-off** tab.

## Automated Verification

Run the full verification suite from the repository root:

```bash
npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e
```

Key test suites covering this feature:
- `src/app/features/tasks/services/task.service.spec.ts`: CRUD operations, whole-hryvnia and title validation, completion reward crediting, undo reward deduction, and pending-only guards for edit/delete.
- `src/app/features/tasks/components/task-form/task-form.spec.ts`: Signal form validation (required trimmed title, `TITLE_MAX_LENGTH`, `moneyAmount`), create and edit initialization, submit and cancel outputs.
- `src/app/features/tasks/components/task-item/task-item.spec.ts`: Pending actions (Complete, Edit, Delete) vs. Completed actions (Undo only), reward display via `<app-amount>`.
- `src/app/features/tasks/components/task-list/task-list.spec.ts`: Empty state without `"Add initial tasks"`, adding, editing, deleting with confirmation, completing, undoing, and toggling the collapsible `"Completed"` section.
- `e2e/src/one-off-tasks.spec.ts` & `e2e/src/layout-audit.spec.ts`: End-to-end CRUD + completion/undo flows and responsive layout audit at all 7 reference widths (`360px` to `1920px`).

## Manual Validation Scenarios

### 1. Empty State (Legacy Seeding Removed)
1. Open `/tasks` and select the **One-off** tab with an empty `tasks` store (or after purging the database in Settings).
2. **Expected**: The empty state displays `"No one-off tasks yet"` with no `"Add initial tasks"` button, and the header offers **Add one-off task**.

### 2. Add a One-Off Task & Validation
1. Click **Add one-off task**.
2. Leave the title blank or enter a fractional/zero reward (e.g., `12.5` or `0`).
3. **Expected**: **Save task** is disabled and field error messages explain the validation requirements.
4. Enter title `"Pay internet bill"` and reward `150`, then click **Save task**.
5. **Expected**: The form closes, a snackbar confirms `"One-off task added"`, and `"Pay internet bill"` appears in the pending list with `+150 ₴` and no `HABIT`/`ONEOFF` badge.

### 3. Edit a Pending One-Off Task
1. Click **Edit** on `"Pay internet bill"`.
2. Change the title to `"Pay fiber internet bill"` and reward to `200`, then click **Save task**.
3. **Expected**: The item updates in place to show `"Pay fiber internet bill"` and `+200 ₴`, with a `"One-off task updated"` snackbar.

### 4. Complete and Undo a One-Off Task
1. Note the current balance on the Dashboard, then return to **Tasks → One-off** and click **Complete** on `"Pay fiber internet bill"`.
2. **Expected**: Balance increases by `200 ₴`, a snackbar shows `"Pay fiber internet bill done · +200 ₴"`, the pending list shows `"Everything is done."`, and the task moves into the collapsible **Completed (1)** section.
3. Expand **Completed (1)**.
4. **Expected**: The completed task shows a green check icon, its title, `+200 ₴`, and an **Undo** button (no Edit or Delete buttons).
5. Click **Undo**.
6. **Expected**: The task returns to the pending list, `200 ₴` is deducted from the balance, and `"Completion undone"` is shown.

### 5. Delete a Pending One-Off Task
1. Click **Delete** on the pending task (or inside its edit form) and confirm in the dialog.
2. **Expected**: The task is removed, the user's balance does not change, and the tab returns to the empty state.
