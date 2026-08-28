# Quickstart & Validation Guide: daily-scores

This guide explains how to validate the Daily Scores feature locally.

## Prerequisites
- Angular dev server running (`npm start` or `ng serve`).
- Pocket Discipline loaded in the browser.

## Validation Scenarios

### Scenario 1: Submitting a Standard Score
1. Open the application and navigate to the **Daily Scores** tab.
2. Select a score between 1 and 8 and submit.
3. **Expected Outcome**: The score is saved. The UI updates to show the score for today, disabling further input. No reward is granted, and the streak resets to 0.

### Scenario 2: Earning a High Score Reward
1. Navigate to the **Daily Scores** tab on a new day.
2. Select a score of `9` and submit.
3. **Expected Outcome**: The user balance increases by `100`. The streak counter becomes `1`.

### Scenario 3: Validating the Streak Bonus
1. Using browser DevTools (Application > IndexedDB), manually create a `dailyScores` entry for yesterday with `score: 10` and `streakAtThisDay: 1`.
2. Reload the application and navigate to the **Daily Scores** tab.
3. Select a score of `10` and submit.
4. **Expected Outcome**: The user balance increases by `550` (500 base + 10% streak bonus). The streak counter updates to `2`.

### Scenario 4: Validating Statistics
1. Using browser DevTools, insert several past scores in the current week and month.
2. Reload the application and open the **Daily Scores** tab.
3. **Expected Outcome**: The monthly average correctly reflects the average of all entries for the current month. The weekly chart correctly plots the scores for the last 7 days.

### Scenario 5: Validating Notifications
1. Change your local device clock to 21:29.
2. Open the application. Do not set a daily score.
3. Wait 1 minute.
4. **Expected Outcome**: A browser/system notification appears at 21:30 reminding you to set a score.
