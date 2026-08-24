# Quickstart: App Skeleton Validation

This guide explains how to validate the app skeleton feature end-to-end once implemented.

## Prerequisites

- Node.js (v18+)
- Angular CLI installed (`npm install -g @angular/cli`)

## Setup & Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Serve the Angular application:
   ```bash
   ng serve
   ```

3. Open your browser and navigate to `http://localhost:4200`.

## Validation Scenarios

### Scenario 1: Responsive Core Navigation
1. Open the app on a desktop browser window.
   - **Expected**: A persistent side navigation or top navigation bar is visible, allowing routing between Dashboard and Settings.
2. Open Developer Tools and switch to a Mobile Device emulator (e.g., iPhone 12).
   - **Expected**: The layout adapts automatically. Navigation collapses into a hamburger menu or bottom tab bar.
3. Click navigation links.
   - **Expected**: Routing works without layout breakage.

### Scenario 2: Offline-First Dashboard & Rewards
1. Navigate to the Dashboard.
   - **Expected**: The UI displays a virtual money balance (initially 0) and a list of dummy/initial tasks.
2. Complete a task by clicking a checkbox/button.
   - **Expected**: The task visually marks as completed, and the virtual money balance increases immediately by the task's reward value.
3. Refresh the page (`F5`).
   - **Expected**: The data persists. The completed task remains completed, and the balance retains its increased value (validating Dexie.js IndexedDB storage).

### Scenario 3: Lighthouse Performance
1. In Chrome DevTools, go to the **Lighthouse** tab.
2. Run a standard Navigation report for both Mobile and Desktop.
   - **Expected**: Performance score is 90+.

## Teardown / Reset
To reset the local data for testing:
1. Open Chrome DevTools -> Application tab -> IndexedDB.
2. Delete the `pocket-discipline-db` database.
3. Refresh the page to start from a clean state.
