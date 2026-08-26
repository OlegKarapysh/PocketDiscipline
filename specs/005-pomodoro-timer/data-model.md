# Data Model: Pomodoro Timer

## Entities

### `PomodoroSession`

Represents a focused block of time completed by the user.

**Fields**:
- `id` (string/UUID): Unique identifier.
- `durationMinutes` (number): Configured duration for the session (15-120).
- `engagementType` (enum: `'work' | 'study'`): The type of engagement.
- `startTime` (timestamp): When the timer started.
- `endTime` (timestamp): When the timer was completed.
- `status` (enum: `'active' | 'completed' | 'cancelled'`): Current state of the session.
- `rewardEarned` (number): The calculated reward points earned (if completed).

**Validation Rules**:
- `durationMinutes` must be between 15 and 120 (inclusive) and a multiple of 5.
- `rewardEarned` is calculated based on duration: 15-24 mins = 0.5x, 25-45 mins = 1x, 50-75 mins = 2x, 80-120 mins = 3x (base is 25 for work, 20 for study). No reward is granted if the status is `'cancelled'`.

**State Transitions**:
- `active` -> `completed` (Timer finishes normally)
- `active` -> `cancelled` (User stops timer manually)

### `RewardEarnedEvent` (Event Contract)

Represents an event emitted to the global EventBus when a Pomodoro completes successfully.

**Payload**:
- `points` (number): The calculated reward points earned.
- `source` (string): Usually `'pomodoro'`.

*Note: The actual User Balance is maintained externally by the `UserService` in the core module, which listens to this event.*
