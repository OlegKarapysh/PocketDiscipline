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
3. Click **Purge** in the confirmation dialog.
4. **Expected Outcome**:
   - The dialog closes.
   - The application programmatically navigates you to the home screen (or default view).
   - The screen does not hard-refresh (the browser tab should not reload).
   - Everything you added is gone and the app looks like a fresh install: the three starter goals, the default reward categories and the starting balance are back, and every other list is empty.
   - You can verify the data is truly gone by opening Chrome DevTools -> Application -> IndexedDB -> checking that only `users`, `goals` and `rewardCategories` hold rows, and only the seeded ones.

### 3. Test Empty Database Purge
1. Immediately after completing Step 2 (when the database holds only the defaults).
2. Navigate to the **Settings** tab.
3. Click the **Purge Database** button and confirm.
4. **Expected Outcome**: The operation succeeds transparently, navigating you to the home screen without any errors.
