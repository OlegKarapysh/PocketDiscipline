# Tasks: Rewards & Money Withdrawal System

**Input**: Design documents from `/specs/008-rewards-withdrawal/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Exact file paths are included in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Feature directory layout and routing prerequisites

- [X] T001 Create feature directory layout under `src/app/features/rewards/` and scaffold route stub in `src/app/features/rewards/rewards.routes.ts`
- [X] T002 [P] Register lazy-loaded `/rewards` route in `src/app/app.routes.ts`
- [X] T003 [P] Add Rewards navigation item (`/rewards`, icon: `card_giftcard`) to `NAV_ITEMS` and `ROUTE_TITLE_MAP` in `src/app/shared/components/layout/layout.ts`, and update navigation test assertions in `src/app/shared/components/layout/layout.spec.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data models, Dexie schema upgrade, and category baseline that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create `RewardCategory` model and pre-seeded default categories in `src/app/features/rewards/models/reward-category.model.ts`
- [X] T005 [P] Create `WithdrawalRecord` model and DTO interfaces in `src/app/features/rewards/models/withdrawal.model.ts`
- [X] T006 [P] Create `RewardItem` model and type definitions in `src/app/features/rewards/models/reward.model.ts`
- [X] T007 [P] Create `SpendingAnalyticsSummary` and chart model interfaces in `src/app/features/rewards/models/spending-analytics.model.ts`
- [X] T008 Update `DbService` schema to `version(8)` in `src/app/core/services/db.service.ts` adding `withdrawals`, `rewards`, and `rewardCategories` tables with initial category seeding, and update table existence assertions in `src/app/core/services/db.service.spec.ts`
- [X] T009 Implement `CategoryService` in `src/app/features/rewards/services/category.service.ts` managing category CRUD, protected `"General"` category lock, and automatic item reassignment
- [X] T010 [P] Author unit tests for `CategoryService` in `src/app/features/rewards/services/category.service.spec.ts`

**Checkpoint**: Core models, Dexie schema, and category management foundation ready. User story implementation can begin.

---

## Phase 3: User Story 1 - Quick Balance Withdrawal (Ad-Hoc Spend) (Priority: P1) 🎯 MVP

**Goal**: Allow users to quickly withdraw balance directly from the Dashboard balance widget or Rewards Hub with full validation preventing negative balance.

**Independent Test**: Trigger Quick Spend from Dashboard balance widget, submit 120 ₴ for "Protein Bar" in category "Food & Treats". Verify balance immediately drops and a withdrawal record is saved in IndexedDB. Verify amounts exceeding balance are blocked.

- [X] T011 [US1] Implement `WithdrawalService` in `src/app/features/rewards/services/withdrawal.service.ts` for atomic balance deduction, balance validation, and withdrawal record creation
- [X] T012 [P] [US1] Author unit tests for `WithdrawalService` in `src/app/features/rewards/services/withdrawal.service.spec.ts` verifying atomic transactions and balance limits
- [X] T013 [P] [US1] Create `QuickSpendDialogComponent` template and component logic with validation in `src/app/features/rewards/components/quick-spend-dialog/quick-spend-dialog.ts` and `src/app/features/rewards/components/quick-spend-dialog/quick-spend-dialog.html`
- [X] T014 [P] [US1] Create styling for `QuickSpendDialogComponent` in `src/app/features/rewards/components/quick-spend-dialog/quick-spend-dialog.scss`
- [X] T015 [P] [US1] Author unit tests for `QuickSpendDialogComponent` in `src/app/features/rewards/components/quick-spend-dialog/quick-spend-dialog.spec.ts`
- [X] T016 [US1] Integrate Quick Spend trigger button and modal opener into `BalanceWidgetComponent` in `src/app/features/dashboard/components/balance-widget/balance-widget.html` and `src/app/features/dashboard/components/balance-widget/balance-widget.ts`
- [X] T017 [P] [US1] Update `BalanceWidgetComponent` tests in `src/app/features/dashboard/components/balance-widget/balance-widget.spec.ts` to verify the Quick Spend trigger

**Checkpoint**: At this point, User Story 1 (Quick Spend MVP) is fully functional and testable independently directly from the Dashboard.

---

## Phase 4: User Story 2 - Define and Track Custom Rewards in Store / Wishlist (Priority: P1)

**Goal**: Allow users to create custom repeatable and one-time rewards with cost, category, and visual savings progress bars.

**Independent Test**: Create custom rewards in the Store with varying costs. Verify that progress bars visually reflect `currentBalance / rewardCost` (capped at 100%), and filter toggle switches between active and claimed rewards.

- [X] T018 [US2] Implement `RewardsService` CRUD operations and active/claimed query streams in `src/app/features/rewards/services/rewards.service.ts`
- [X] T019 [P] [US2] Author unit tests for `RewardsService` CRUD methods in `src/app/features/rewards/services/rewards.service.spec.ts`
- [X] T020 [P] [US2] Create `RewardCardComponent` with progress bar, type badge, and claim button in `src/app/features/rewards/components/reward-card/reward-card.ts`, `src/app/features/rewards/components/reward-card/reward-card.html`, and `src/app/features/rewards/components/reward-card/reward-card.scss`
- [X] T021 [P] [US2] Author unit tests for `RewardCardComponent` in `src/app/features/rewards/components/reward-card/reward-card.spec.ts`
- [X] T022 [P] [US2] Create `RewardFormDialogComponent` for adding/editing rewards in `src/app/features/rewards/components/reward-form-dialog/reward-form-dialog.ts`, `src/app/features/rewards/components/reward-form-dialog/reward-form-dialog.html`, and `src/app/features/rewards/components/reward-form-dialog/reward-form-dialog.scss`
- [X] T023 [P] [US2] Author unit tests for `RewardFormDialogComponent` in `src/app/features/rewards/components/reward-form-dialog/reward-form-dialog.spec.ts`
- [X] T024 [US2] Create `RewardStoreComponent` grid with active vs. claimed filter/toggle in `src/app/features/rewards/components/reward-store/reward-store.ts`, `src/app/features/rewards/components/reward-store/reward-store.html`, and `src/app/features/rewards/components/reward-store/reward-store.scss`
- [X] T025 [P] [US2] Author unit tests for `RewardStoreComponent` in `src/app/features/rewards/components/reward-store/reward-store.spec.ts`

**Checkpoint**: User Story 2 is fully testable. Rewards can be created, edited, and viewed with live savings progress.

---

## Phase 5: User Story 3 - Claim Rewards and Auto-Deduct Balance (Priority: P1)

**Goal**: Enable claiming affordable rewards, atomically deducting balance, creating a corresponding ledger record, and marking one-time rewards as claimed.

**Independent Test**: Click "Claim" on an affordable repeatable reward and one-time milestone reward. Verify balance deduction, creation of withdrawal record with snapshot title, and transition of one-time reward to claimed view with badge and timestamp.

- [X] T026 [US3] Implement `claimReward` atomic transaction method in `src/app/features/rewards/services/rewards.service.ts` (deduct balance, save withdrawal snapshot, mark one-time as claimed or increment repeatable count)
- [X] T027 [P] [US3] Author unit tests for `claimReward` in `src/app/features/rewards/services/rewards.service.spec.ts` testing balance updates, snapshot preservation, and rollback on error
- [X] T028 [US3] Connect claim action, disabled states, and feedback snackbar in `src/app/features/rewards/components/reward-card/reward-card.html` and `src/app/features/rewards/components/reward-card/reward-card.ts`
- [X] T029 [US3] Connect claim handling in `RewardStoreComponent` in `src/app/features/rewards/components/reward-store/reward-store.ts` ensuring immediate grid reactivity

**Checkpoint**: The complete discipline reward redemption cycle (US1 + US2 + US3) is operational.

---

## Phase 6: User Story 4 - View, Search, and Revert Withdrawals in History / Ledger (Priority: P2)

**Goal**: Provide a searchable and filterable chronological ledger of past withdrawals with the ability to revert/delete a withdrawal to restore balance.

**Independent Test**: Navigate to History / Ledger tab, filter by category and search query, click "Revert / Delete" on a transaction. Confirm balance increases by the refunded amount and associated one-time milestone reward resets to active.

- [X] T030 [US4] Implement filtered ledger queries and `revertWithdrawal` atomic refund transaction in `src/app/features/rewards/services/withdrawal.service.ts` (refund balance, delete withdrawal record, safely reset one-time reward to active if still present, and decrement repeatable claimCount)
- [X] T031 [P] [US4] Author unit tests for `revertWithdrawal` in `src/app/features/rewards/services/withdrawal.service.spec.ts` validating balance restoration, linked reward status recovery, safe handling of previously deleted rewards, and repeatable claimCount decrement
- [X] T032 [P] [US4] Create `WithdrawalLedgerComponent` in `src/app/features/rewards/components/withdrawal-ledger/withdrawal-ledger.ts`, `src/app/features/rewards/components/withdrawal-ledger/withdrawal-ledger.html`, and `src/app/features/rewards/components/withdrawal-ledger/withdrawal-ledger.scss` with category filter, date picker, search input, and revert confirmation dialog
- [X] T033 [P] [US4] Author unit tests for `WithdrawalLedgerComponent` in `src/app/features/rewards/components/withdrawal-ledger/withdrawal-ledger.spec.ts`

**Checkpoint**: Financial auditability and mistake recovery are complete and testable.

---

## Phase 7: User Story 5 - Spending Analytics and Category Breakdown (Priority: P2)

**Goal**: Display visual analytics of expenditures, including category breakdown donut/pie chart and spending over time trend chart across configurable timeframes.

**Independent Test**: Record withdrawals across distinct categories, navigate to Analytics tab, toggle between "This Month", "Last 30 Days", "This Year", and "All Time". Verify donut slices and timeline bars match ledger totals with 100% accuracy.

- [X] T034 [US5] Implement `SpendingAnalyticsService` in `src/app/features/rewards/services/spending-analytics.service.ts` aggregating totals, category breakdown percentages, and timeline data with daily/monthly auto-granularity
- [X] T035 [P] [US5] Author unit tests for `SpendingAnalyticsService` in `src/app/features/rewards/services/spending-analytics.service.spec.ts`
- [X] T036 [P] [US5] Create native SVG `SpendingDonutChartComponent` with category color swatches and tooltips in `src/app/features/rewards/components/spending-donut-chart/spending-donut-chart.ts`, `src/app/features/rewards/components/spending-donut-chart/spending-donut-chart.html`, and `src/app/features/rewards/components/spending-donut-chart/spending-donut-chart.scss`
- [X] T037 [P] [US5] Author unit tests for `SpendingDonutChartComponent` in `src/app/features/rewards/components/spending-donut-chart/spending-donut-chart.spec.ts`
- [X] T038 [P] [US5] Create native SVG `SpendingTrendChartComponent` in `src/app/features/rewards/components/spending-trend-chart/spending-trend-chart.ts`, `src/app/features/rewards/components/spending-trend-chart/spending-trend-chart.html`, and `src/app/features/rewards/components/spending-trend-chart/spending-trend-chart.scss`
- [X] T039 [P] [US5] Author unit tests for `SpendingTrendChartComponent` in `src/app/features/rewards/components/spending-trend-chart/spending-trend-chart.spec.ts`
- [X] T040 [US5] Create `SpendingAnalyticsComponent` composing summary metric cards and SVG charts in `src/app/features/rewards/components/spending-analytics/spending-analytics.ts`, `src/app/features/rewards/components/spending-analytics/spending-analytics.html`, and `src/app/features/rewards/components/spending-analytics/spending-analytics.scss`
- [X] T041 [P] [US5] Author unit tests for `SpendingAnalyticsComponent` in `src/app/features/rewards/components/spending-analytics/spending-analytics.spec.ts`

**Checkpoint**: Spending analytics and native SVG visualizations are functional and verified.

---

## Phase 8: User Story 6 - Custom Category Management in Settings (Priority: P3)

**Goal**: Allow users to manage custom categories in Settings while protecting the fallback `"General"` category from deletion.

**Independent Test**: In Settings, create custom category "Hobbies". Verify it appears in Quick Spend and Store. Delete "Hobbies" and verify existing items pointing to it are safely reassigned to "General". Verify "General" delete action is disabled.

- [X] T042 [P] [US6] Create `CategoryManagementComponent` in `src/app/features/rewards/components/category-management/category-management.ts`, `src/app/features/rewards/components/category-management/category-management.html`, and `src/app/features/rewards/components/category-management/category-management.scss` with category list, creation dialog, protected General lock, and reassignment confirmation
- [X] T043 [P] [US6] Author unit tests for `CategoryManagementComponent` in `src/app/features/rewards/components/category-management/category-management.spec.ts`
- [X] T044 [US6] Embed `CategoryManagementComponent` in Settings page in `src/app/features/settings/settings.html`, `src/app/features/settings/settings.ts`, and `src/app/features/settings/settings.scss`
- [X] T045 [P] [US6] Update `SettingsComponent` unit tests in `src/app/features/settings/settings.spec.ts`

**Checkpoint**: Category customization and referential safety are fully integrated into Settings.

---

## Phase 9: Rewards Hub Container & Polish (Cross-Cutting Concerns)

**Purpose**: Assemble the multi-tab Rewards Hub, configure child routing, update documentation, and perform final quality verifications

- [X] T046 Create `RewardsHubComponent` host container page with tabs for Store, Ledger, and Analytics plus top Quick Spend action in `src/app/features/rewards/pages/rewards-hub/rewards-hub.ts`, `src/app/features/rewards/pages/rewards-hub/rewards-hub.html`, and `src/app/features/rewards/pages/rewards-hub/rewards-hub.scss`
- [X] T047 [P] Author unit tests for `RewardsHubComponent` in `src/app/features/rewards/pages/rewards-hub/rewards-hub.spec.ts`
- [X] T048 Finalize child routes in `src/app/features/rewards/rewards.routes.ts` connecting `/rewards` to `RewardsHubComponent`
- [X] T049 [P] Update database schema documentation in `docs/schema.md` documenting Dexie version 8 tables (`withdrawals`, `rewards`, `rewardCategories`)
- [X] T050 Run end-to-end validation scenarios from `specs/008-rewards-withdrawal/quickstart.md`
- [X] T051 Run mandatory linting verification (`npm run lint`) and resolve any errors
- [X] T052 Run complete automated test suite (`npm test`) and ensure all tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **User Story 1 (Phase 3 - P1 MVP)**: Depends on Phase 2
- **User Story 2 (Phase 4 - P1)**: Depends on Phase 2
- **User Story 3 (Phase 5 - P1)**: Depends on Phase 3 (WithdrawalService) and Phase 4 (RewardsService)
- **User Story 4 (Phase 6 - P2)**: Depends on Phase 3 (WithdrawalService) and Phase 5 (claims)
- **User Story 5 (Phase 7 - P2)**: Depends on Phase 3 (WithdrawalRecord data)
- **User Story 6 (Phase 8 - P3)**: Depends on Phase 2 (CategoryService)
- **Polish (Phase 9)**: Depends on all user stories being completed

### Parallel Opportunities

- **Phase 1**: T002 and T003 can execute in parallel after T001.
- **Phase 2**: T004, T005, T006, T007 models can be authored concurrently. T010 tests can run alongside T009.
- **Phase 3**: T012, T013, T014, T015 can run in parallel once T011 is established.
- **Phase 4**: T020, T021, T022, T023 can run in parallel while T018/T024 are built.
- **Phase 7**: T036 (Donut chart) and T038 (Trend chart) can be implemented in parallel.

---

## Parallel Example: User Story 1 (MVP)

```bash
# Author WithdrawalService unit tests and UI components in parallel:
Task: "Author unit tests for WithdrawalService in src/app/features/rewards/services/withdrawal.service.spec.ts"
Task: "Create QuickSpendDialogComponent in src/app/features/rewards/components/quick-spend-dialog/quick-spend-dialog.ts"
Task: "Create QuickSpendDialogComponent styling in src/app/features/rewards/components/quick-spend-dialog/quick-spend-dialog.scss"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`src/app/features/rewards/` directories, routing, navigation item).
2. Complete Phase 2: Foundational (Dexie version 8 upgrade, base models, `CategoryService`).
3. Complete Phase 3: User Story 1 (Quick Spend dialog + Dashboard balance widget trigger).
4. **STOP and VALIDATE**: Open Dashboard, click Quick Spend, verify deduction and negative balance block.

### Incremental Delivery

1. **Increment 1 (MVP)**: Quick Spend on Dashboard (US1).
2. **Increment 2**: Reward Store & Wishlist with progress bars (US2).
3. **Increment 3**: Reward Claiming loop with automatic withdrawals (US3).
4. **Increment 4**: Withdrawal History Ledger with search/filters and balance refunds (US4).
5. **Increment 5**: Spending Analytics with native SVG Donut & Trend charts (US5).
6. **Increment 6**: Settings Category Management with protected General fallback (US6).
7. **Increment 7**: Hub integration, quickstart validation, linting, and full test suite (Phase 9).
