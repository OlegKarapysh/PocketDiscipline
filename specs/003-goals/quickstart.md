# Validation Quickstart

This guide provides steps to manually validate the feature end-to-end after implementation.

### Prerequisites
- Build and run the app locally: `npm start`
- Open the app in the browser at `http://localhost:4200`
- Open Chrome DevTools > Application > IndexedDB > `pocket-discipline-db` to inspect the raw data if needed.

### Scenario 1: Initial Predefined Goals
1. Navigate to the new "Goals" tab via the main menu.
2. Verify you see the 3 predefined active goals:
   - "do 50 push-ups on fists" (Reward: 2000)
   - "do 100 squats" (Reward: 1500)
   - "do 12 pomodorro a day" (Reward: 1500)

### Scenario 2: Add and Validate Custom Goal
1. Click the "Add Goal" button.
2. Enter the title "Test Goal 1" and reward "500".
3. Save the goal.
4. Verify "Test Goal 1" appears in the active goals list.
5. Attempt to add another goal with the exact same title "Test Goal 1".
6. Verify the form shows a validation error preventing duplication among active goals.

### Scenario 3: Complete Goal and Check Balance
1. Note your current Total Money Balance in the app UI.
2. Mark "Test Goal 1" as completed.
3. Verify it disappears from the Active goals list and moves to the Completed list below, grouped under the current month (e.g., "August 2026").
4. Verify your Total Money Balance has increased by exactly 500.

### Scenario 4: Undo Completion
1. Click the "Undo" or "Un-complete" button on "Test Goal 1" in the Completed list.
2. Verify it moves back to the Active goals list.
3. Verify your Total Money Balance decreases by 500.

### Scenario 5: Edit and Delete Active Goals
1. Click "Edit" on an active custom goal.
2. Change the title and reward value, and save. Verify changes are reflected.
3. Click "Delete" on the active custom goal.
4. Verify it is permanently removed from the list.
