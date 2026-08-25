# Validation Guide: Daily Tasks

This guide outlines how to manually validate that the Daily Tasks feature is functioning correctly end-to-end after implementation.

## Prerequisites

- Application is built and running locally (`npm start`).
- Access to the browser's developer tools (Application -> IndexedDB) to manipulate local time timestamps for testing streaks.

## Scenario 1: Creating a Daily Task

1. Navigate to the Daily Tasks section of the app.
2. Click "Add Daily Task".
3. Enter the title: "Morning Workout".
4. Add difficulties: "Easy" (Base Reward: 100) and "Hard" (Base Reward: 300).
5. Save the task.
6. **Expected Outcome**: The task appears in the list with a 0-day streak and is marked as ready to complete.

## Scenario 2: Completing a Task (Day 1)

1. Find the "Morning Workout" task.
2. Mark it as completed by selecting the "Easy" difficulty.
3. **Expected Outcome**:
   - The user's total balance increases by 100.
   - The task visually indicates it is completed for today.
   - The streak counter shows "1 Day Streak".
   - The completion buttons become disabled.

## Scenario 3: Testing Streak Bonus (Day 2)

1. *Developer Trick*: Open DevTools -> Application -> IndexedDB -> `pocket-discipline-db` -> `dailyTasks` table.
2. Edit the `lastCompletedAt` timestamp for "Morning Workout" to exactly 24 hours ago (yesterday). Refresh the page.
3. **Expected Outcome**: The task is available to complete again.
4. Mark it as completed, selecting the "Easy" difficulty.
5. **Expected Outcome**: 
   - The user's balance increases by 110 (100 base + 10% bonus).
   - The streak counter shows "2 Day Streak".

## Scenario 4: Testing Streak Max Cap (Day 12)

1. *Developer Trick*: Edit the `lastCompletedAt` to yesterday, and set `streak` to `11`. Refresh the page.
2. Mark it as completed, selecting the "Hard" difficulty.
3. **Expected Outcome**:
   - The user's balance increases by 600 (300 base + 100% max bonus).
   - The streak counter shows "12 Day Streak" (or higher).

## Scenario 5: Testing Streak Reset

1. *Developer Trick*: Edit the `lastCompletedAt` to 48+ hours ago (the day before yesterday), and keep `streak` at `12`. Refresh the page.
2. **Expected Outcome**: The streak visually resets to 0 because a calendar day was missed.
3. Mark it as completed on "Easy" difficulty.
4. **Expected Outcome**:
   - The user's balance increases by 100 (no bonus).
   - The streak counter shows "1 Day Streak".
