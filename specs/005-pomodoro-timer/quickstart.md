# Quickstart Validation Guide: Pomodoro Timer

## Prerequisites
- Node.js installed
- Angular project dependencies installed (`npm install`)
- App served locally via `npm run start`

## Scenario 1: Complete a session and earn reward
1. Open the application in a browser and navigate to the "Pomodoro" tab.
2. Observe the timer configuration inputs (duration: 25 mins, engagement: work).
3. Start the timer.
4. _For testing purposes, manually adjust the timer service's remaining time to 1 second via browser console or temporary debug button._
5. Wait for the timer to hit zero.
6. Verify that a pop-up dialog appears announcing completion and the reward earned (25 points).
7. Dismiss the dialog and check the user balance to confirm the reward was added.

## Scenario 2: Cancel a session
1. Start a new timer with duration 15 mins.
2. Click the "Cancel" or "Stop" button.
3. Verify the timer resets to the default configuration state.
4. Check the user balance and verify no points were added.

## Scenario 3: Background Notification
1. Start a timer (e.g., 20 mins).
2. Background the app or navigate to a different tab in the browser.
3. _Fast forward time._
4. Verify that an OS/browser local notification is triggered when the time is up.
5. Click the notification to return to the app and see the completion dialog.
