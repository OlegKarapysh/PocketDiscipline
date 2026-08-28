# Tasks: daily-scores

**Input**: Design documents from `/specs/006-daily-scores/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create feature directory structure `src/app/features/daily-scores/`
- [x] T002 [P] Create `DailyScoresPageComponent` in `src/app/features/daily-scores/pages/daily-scores-page.component.ts`
- [x] T003 [P] Add route for Daily Scores tab in `src/app/app.routes.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Setup `dailyScores` table in Dexie database in `src/app/core/services/db.service.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Set Daily Score (Priority: P1) 🎯 MVP

**Goal**: As a user, I want to set a daily score from 1 to 10 once per day, so that I can track my daily performance.

**Independent Test**: Can open the daily scores tab and submit a score for today.

### Implementation for User Story 1

- [x] T005 [P] [US1] Create `DailyScore` model interface in `src/app/features/daily-scores/models/daily-score.model.ts`
- [x] T006 [US1] Implement `DailyScoresService` with a method to save score in `src/app/features/daily-scores/services/daily-scores.service.ts`
- [x] T007 [P] [US1] Build UI form component to input score in `src/app/features/daily-scores/components/score-input/score-input.component.ts`
- [x] T008 [US1] Integrate `ScoreInputComponent` and `DailyScoresService` into `src/app/features/daily-scores/pages/daily-scores-page.component.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Earn Rewards for High Scores (Priority: P1)

**Goal**: As a user, I want to earn rewards for high daily scores (9 or 10) and get a streak multiplier.

**Independent Test**: Can submit a high score and see the correct reward applied to the balance.

### Implementation for User Story 2

- [x] T009 [US2] Update `DailyScoresService` to query previous score, calculate streak, and calculate reward amount in `src/app/features/daily-scores/services/daily-scores.service.ts`
- [x] T010 [US2] Integrate reward calculation to add to user balance using `DbService` when score is saved in `src/app/features/daily-scores/services/daily-scores.service.ts`
- [x] T011 [US2] Display the earned reward and streak confirmation message on success in `src/app/features/daily-scores/pages/daily-scores-page.component.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - View Daily Score Statistics (Priority: P2)

**Goal**: As a user, I want to see my average score for the month, a chart of the week's scores, and my current streak.

**Independent Test**: Can open the daily scores tab and see accurate statistics based on historical data.

### Implementation for User Story 3

- [x] T012 [P] [US3] Add methods to fetch current month and week scores in `src/app/features/daily-scores/services/daily-scores.service.ts`
- [x] T013 [P] [US3] Create `ScoresChartComponent` in `src/app/features/daily-scores/components/scores-chart/scores-chart.component.ts`
- [x] T014 [P] [US3] Create `ScoresStatsComponent` for average and streak display in `src/app/features/daily-scores/components/scores-stats/scores-stats.component.ts`
- [x] T015 [US3] Integrate chart and stats into `src/app/features/daily-scores/pages/daily-scores-page.component.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Daily Reminder (Priority: P2)

**Goal**: As a user, I want to receive a notification at 21:30 if I haven't set my daily score.

**Independent Test**: Can receive a notification at the scheduled time only if the score hasn't been set.

### Implementation for User Story 4

- [x] T016 [P] [US4] Implement `NotificationService` to request permissions and schedule local notifications in `src/app/core/services/notification.service.ts`
- [x] T017 [US4] Create initialization logic to check for unset scores at 21:30 in `src/app/app.component.ts` (mapped to app.ts)
- [x] T018 [US4] Integrate with `DailyScoresService` to suppress the notification if a score is already set for today.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T019 Run project linting (ESLint, Prettier) and fix any formatting issues.
- [x] T020 Run manual validation scenarios documented in `quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed sequentially in priority order (P1 → P2)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after US1 - integrates tightly with US1 save logic.
- **User Story 3 (P2)**: Can start after US1 - needs data model from US1.
- **User Story 4 (P2)**: Can start after US1 - relies on checking if score is set.

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- US1 models and UI components can be built in parallel.
- US3 stats components and chart components can be built in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently (MVP)
3. Add User Story 2 → Test independently
4. Add User Story 3 → Test independently
5. Add User Story 4 → Test independently

## Phase 8: Convergence

- [x] T022 Fix currency symbol in `DailyScoresPageComponent` success message to use `₴` instead of `?` per FR-007, Assumption (partial)
