# Tasks: Pomodoro Timer

**Input**: Design documents from `/specs/005-pomodoro-timer/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create feature directory structure in `src/app/features/pomodoro/`
- [x] T002 [P] Create initial routes definition in `src/app/features/pomodoro/pomodoro.routes.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create `PomodoroSession` model in `src/app/features/pomodoro/models/pomodoro-session.model.ts` based on `data-model.md`
- [x] T004 Implement IndexedDB storage wrapper with Dexie in `src/app/features/pomodoro/services/pomodoro-storage.service.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Start and Complete a Pomodoro (Priority: P1) 🎯 MVP

**Goal**: As a user, I want to start a Pomodoro timer for a specific duration and engagement type, so that I can focus on my task and earn a reward upon completion.

**Independent Test**: Can be fully tested by navigating to the Pomodoro tab, starting a timer, waiting for it to finish, and verifying the completion dialog and reward addition.

### Implementation for User Story 1

- [x] T005 [US1] Implement `pomodoro-timer.service.ts` in `src/app/features/pomodoro/services/` to manage timer state and OS background notifications.
- [x] T006 [P] [US1] Create Timer Display UI component in `src/app/features/pomodoro/components/timer-display/`
- [x] T007 [P] [US1] Create Timer Controls UI component (Start/Stop) in `src/app/features/pomodoro/components/timer-controls/`
- [x] T008 [P] [US1] Create Completion Dialog UI component in `src/app/features/pomodoro/components/completion-dialog/`
- [x] T009 [US1] Integrate display, controls, and dialog with the timer and storage services into a main container component in `src/app/features/pomodoro/` and expose via `pomodoro.routes.ts`.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Configure Timer Settings (Priority: P2)

**Goal**: As a user, I want to select different durations and engagement types before starting the timer, so that I can tailor the session to my specific needs and tasks.

**Independent Test**: Can be fully tested by changing the duration and engagement inputs before starting the timer.

### Implementation for User Story 2

- [x] T010 [P] [US2] Create Session Config UI component (Duration & Engagement selectors) in `src/app/features/pomodoro/components/session-config/`
- [x] T011 [US2] Update `pomodoro-timer.service.ts` in `src/app/features/pomodoro/services/` to accept custom configurations before starting.
- [x] T012 [US2] Integrate the config component into the main container component, linking it to the timer service.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T013 Update Angular Material styling and layout for a cohesive look across all Pomodoro components.
- [x] T014 Run validation scenarios from `quickstart.md` to ensure end-to-end functionality.
- [x] T015 Ensure navigation menu links correctly to the Pomodoro tab in the app's main layout.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in sequential priority order (US1 → US2)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Integrates with US1 container but extends configuration logic independently

### Parallel Opportunities

- Foundational tasks can be worked on concurrently if split between DB setup and model creation.
- US1 UI components (Display, Controls, Dialog) can be developed in parallel before integration.
- US2 Config UI can be built in parallel with US1 integration.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Provide MVP functionality for default timers

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Full Feature Release

## Phase 6: Convergence

- [x] T016 Create `event-bus.service.ts` in `src/app/core/services/` to act as an app-wide event bus per plan.md Structure (missing)
- [x] T017 Update `user.service.ts` to listen to `RewardEarnedEvent` from EventBus and add balance per plan.md Structure (missing)
- [x] T018 Ensure `pomodoro-timer.service.ts` emits `RewardEarnedEvent` on timer completion per plan.md Summary (missing)
- [x] T019 Ensure `pomodoro-timer.service.ts` calculates elapsed time upon app reopen per spec.md Edge Cases (missing)

## Phase 7: Convergence

- [x] T020 Schedule OS local notification for when timer fires upon app backgrounding per spec.md Edge Cases (missing)
- [x] T021 Apply Math.trunc() or Math.floor() to reward calculation to drop decimal parts per FR-005 (partial)
- [x] T022 Remove unused .html and .scss files from Pomodoro components per plan.md Structure (unrequested)

## Phase 8: Convergence

- [X] T023 Rebuild `src/app/features/pomodoro/pomodoro-container/pomodoro-container.html` and `.scss` so the timer, the engagement type, the duration and the start or stop button sit in one `app-section-card` directly below `app-page-header`, and remove the `min-height: 80vh` vertical centring per FR-009, US3/AC1 (contradicts)
- [X] T024 Replace the engagement type `mat-select` in `src/app/features/pomodoro/components/session-config/` with a full-width `app-segmented-control` showing Work and Study side by side, labelled from a new `ENGAGEMENT_TYPE_LABELS` constant in `src/app/features/pomodoro/constants/engagement-type-labels.const.ts` (the constant spec 013 T014 names, so 013 reuses it) per FR-010, US3/AC2 (contradicts)
- [X] T025 Replace the typed duration input in `src/app/features/pomodoro/components/session-config/` with decrease and increase icon buttons (44px touch targets, accessible names) around the current value, stepping 5 minutes within 15–120, each disabled at its end of the range, so no text input remains on the page per FR-011, SC-005, US3/AC3, US3/AC4 (contradicts)
- [X] T026 Replace the round `mat-fab` Start button in `src/app/features/pomodoro/components/timer-controls/` with a full-width button that shows the reward the configured session pays, rendered with `app-amount` and updated live from `PomodoroRewardRateService.rates$` when the duration, engagement type or rates change; share one reward calculation with `PomodoroTimerService.completeSession` rather than copying `REWARD_TIERS`, and keep it disabled while `isRestoring()` per FR-012, FR-015, US3/AC5, Edge Cases: restoring after a reload (missing)
- [X] T027 While a session runs, replace the engagement and duration controls with one line naming the running session's engagement type and duration, put a full-width Stop button styled as a destructive action in the Start button's place (keeping the stop confirmation), and remove the separate "Ready to start" / "Focusing on …" status line from `src/app/features/pomodoro/components/timer-display/` per FR-013, US3/AC6 (contradicts)
- [X] T028 Make the shell reserve the quick-actions speed dial's height in `.content`'s bottom padding on compact widths in `src/app/shared/components/layout/layout.scss` (today 112px of padding sits under a FAB whose top is 152px above the viewport bottom), so the button never covers the Pomodoro page's last control or figure at any scroll position; the design system puts fixed elements' space in the shell, not the page, per FR-014, Edge Cases: quick actions button (missing)
  - Done without a shell change: the measurement above was wrong. `app-bottom-nav` sits in the shell's flex column, not over the scroller, so `.content`'s 112px bottom padding already leaves 40px between the last content and the button. `e2e/src/pomodoro.spec.ts` now checks every control and figure against the button at every scroll position, idle and running.
- [X] T029 Give the container's timer card a first column with a flex basis on the container's own width (`flex: 1 1 min(100%, 360px)` with `flex-wrap`, per `specs/013-pomodoro-stats/research.md`, no `t.up()`), so the card does not stretch across a 1280px+ content area and leaves room beside it for the spec 013 statistics per FR-015 (missing)
  - Done as `max-width: 560px` on the timer card rather than a flex column: with one card there is no second column yet, and a flex basis alone would let it grow across the content area. Spec 013 T022 adds the two-column flex container around it.
- [X] T030 Update `e2e/src/layout-audit.spec.ts`: point the `pomodoro` screen's `ready` selector at the new timer card and add a `pomodoro: running` screen (session started, summary line and Stop shown); run the audit at every width in light and dark themes and check the 360px and 1280px screenshots per SC-006 (missing)
- [X] T031 Update `e2e/src/pomodoro.spec.ts`: select Study through the segmented control instead of a dropdown option, and add a 360 × 640 test of User Story 3 covering a tap-only 25 → 30 change showing 30:00, the increase button disabled at 120 and the decrease button disabled at 15, the reward on Start for a 50-minute work session at the default rate, the running summary line and Stop, no `textbox`/`spinbutton` on the page, and the timer card ending far enough above the bottom nav to leave room for the 013 Today card per US3 Independent Test, SC-004, SC-005 (missing)
- [X] T032 Update the unit specs `session-config.spec.ts`, `timer-controls.spec.ts`, `timer-display.spec.ts`, `pomodoro-container.spec.ts` and `pomodoro-timer.service.spec.ts` under `src/app/features/pomodoro/` for the stepper bounds, the one-tap engagement selection, the live reward preview, the running summary line and the absence of a status line when idle per US3 (missing)
