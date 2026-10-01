# Quickstart Validation Guide: Purge Database

This guide documents how to manually validate the Purge Database feature once implemented.

## Prerequisites

- The application is running locally.
- You have some sample data populated in the application (e.g., tasks, goals, scores).

## Validation Steps

### 1. Test Confirmation Prompt Cancelation
1. Navigate to the **Settings** tab.
2. Click the **Purge Database** button.
3. Observe that a confirmation dialog appears warning about permanent data loss.
4. Click **Cancel** in the dialog.
5. **Expected Outcome**: The dialog closes, you remain on the Settings page, and no data is deleted (verify by checking other tabs to ensure data is still there).

### 2. Test Successful Purge
1. Navigate to the **Settings** tab.
2. Click the **Purge Database** button.
3. Click **Confirm/Delete** in the confirmation dialog.
4. **Expected Outcome**:
   - The dialog closes.
   - The application programmatically navigates you to the home screen (or default view).
   - The screen does not hard-refresh (the browser tab should not reload).
   - All lists (tasks, goals, etc.) are now empty.
   - You can verify the data is truly gone by opening Chrome DevTools -> Application -> IndexedDB -> checking that tables are empty.

### 3. Test Empty Database Purge
1. Immediately after completing Step 2 (when the database is already empty).
2. Navigate to the **Settings** tab.
3. Click the **Purge Database** button and confirm.
4. **Expected Outcome**: The operation succeeds transparently, navigating you to the home screen without any errors.
