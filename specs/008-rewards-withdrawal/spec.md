# Feature Specification: Rewards & Money Withdrawal System

**Feature Branch**: `008-rewards-withdrawal`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Introduce a comprehensive Rewards and Balance Withdrawal system that allows users to redeem their earned discipline balance for real-world rewards and track personal spending: 1. Ad-Hoc Money Withdrawal (Quick Spend); 2. Reward Store & Wishlist; 3. Dedicated 'Rewards' Hub (in Navigation); 4. Category Management in Settings; 5. Data Integrity"

## Clarifications

### Session 2026-09-05

- Q: Once a one-time milestone reward is claimed, how should it be organized and displayed within the Store / Wishlist view? → A: Keep claimed one-time rewards in the Store with a toggle/filter (or dedicated "Claimed" section below active items) showing a "Claimed" badge and timestamp.
- Q: If a user deletes a custom reward from their Store / Wishlist that was previously claimed, how should the system handle the deletion and associated ledger records? → A: Snapshot preservation: Withdrawal records retain their title, amount, category, and timestamp snapshots; deleting the reward removes it from the Store without altering or deleting historical ledger records.
- Q: Can users delete or rename the built-in system default categories in Settings, or are they protected? → A: Editable defaults, locked fallback: Users can rename or delete any default category except "General", which is permanently locked from deletion as the system fallback target for reassignment.
- Q: What time periods and grouping granularity should the Spending Analytics tab offer for category breakdown and spending over time? → A: Flexible timeframe presets ("This Month" [default], "Last 30 Days", "This Year", "All Time") with auto-granularity: daily grouping for 30-day/monthly views, and monthly grouping for yearly/all-time views.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Balance Withdrawal (Ad-Hoc Spend) (Priority: P1)

As a disciplined user who wants to reward myself with an everyday purchase or log personal spending, I want to quickly deduct money from my earned balance directly from the Dashboard balance widget or Rewards page by providing an amount, title, category, and optional notes, so that my app balance always stays in sync with my real-world spending decisions.

**Why this priority**: Core foundation of the withdrawal system. Without the ability to withdraw funds and record transactions, no ledger, balance deduction, or spending tracking can function.

**Independent Test**: Can be tested independently by opening the Quick Spend dialog from the dashboard balance widget, entering an amount, title, and category, and confirming the withdrawal. The user's balance immediately decreases by the entered amount, and a corresponding withdrawal entry is saved.

**Acceptance Scenarios**:

1. **Given** the user has an accumulated balance of 500 ₴, **When** the user triggers Quick Spend, enters 120 ₴, title "Protein Bar", selects category "Food & Treats", and confirms, **Then** the balance updates to 380 ₴ and a withdrawal entry is recorded with the current date (YYYY-MM-DD) and timestamp.
2. **Given** the user has a balance of 100 ₴, **When** the user attempts to enter an amount greater than 100 ₴ (e.g., 150 ₴) or a non-positive amount (e.g., 0 or -20 ₴), **Then** form submission is disabled and an informative validation message indicates insufficient balance or invalid amount.
3. **Given** the user is viewing the Dashboard, **When** clicking the quick spend trigger on the balance card, **Then** the quick spend modal opens immediately with the amount field pre-focused.

---

### User Story 2 - Define and Track Custom Rewards in Store / Wishlist (Priority: P1)

As an ambitious user saving toward personal milestones and treats, I want to define custom rewards with a title, cost in ₴, category, and reward type (repeatable treat vs. one-time milestone), and view visual progress bars on each reward card showing how close my current balance is to unlocking them.

**Why this priority**: Provides the primary motivational driver for accumulating discipline balance, allowing users to visualize tangible goals and track their saving trajectory.

**Independent Test**: Can be tested independently by adding custom rewards with varying costs and types in the Store / Wishlist tab, and observing that each reward card displays the title, cost, category, type badge, and a progress bar calculated from the current balance.

**Acceptance Scenarios**:

1. **Given** the user is on the Rewards Store / Wishlist tab, **When** adding a new reward with title "Mechanical Keyboard", cost 2,500 ₴, category "Gear & Tech", and type "One-time milestone", **Then** the reward is saved and displayed in the rewards grid with an active progress bar reflecting the percentage of 2,500 ₴ saved.
2. **Given** the user has a balance of 600 ₴ and a reward costing 1,200 ₴, **When** viewing the reward card, **Then** the progress bar visually indicates 50% progress with an exact ratio indicator ("600 / 1,200 ₴").
3. **Given** the user's balance meets or exceeds a reward's cost, **When** viewing the reward card, **Then** the progress bar reaches 100% and an enabled "Claim" action becomes accessible.

---

### User Story 3 - Claim Rewards and Auto-Deduct Balance (Priority: P1)

As a user who has earned sufficient balance for a reward, I want to click "Claim" to redeem it so that the cost is automatically deducted from my balance, a corresponding withdrawal record is logged in the ledger, and one-time milestone rewards are marked as claimed.

**Why this priority**: Completes the core discipline-reward cycle by turning earned virtual currency into redeemed real-world rewards.

**Independent Test**: Can be tested independently by clicking "Claim" on an affordable repeatable or one-time reward, verifying that the balance drops by the reward cost, a withdrawal record is created with the reward details, and one-time rewards transition to claimed status.

**Acceptance Scenarios**:

1. **Given** the user has a balance of 300 ₴ and an active repeatable reward "Specialty Coffee" (cost 80 ₴), **When** the user clicks "Claim", **Then** the balance is reduced to 220 ₴, a withdrawal record for 80 ₴ with title "Claimed: Specialty Coffee" is recorded, and the reward remains available for future claims.
2. **Given** the user has a balance of 1,500 ₴ and an active one-time milestone reward "Noise-Cancelling Headphones" (cost 1,500 ₴), **When** the user clicks "Claim", **Then** the balance is reduced to 0 ₴, a withdrawal record is logged, and the reward is marked as "Claimed" with timestamp, moving to the Claimed filter/section with its claim action disabled.
3. **Given** a reward whose cost exceeds the user's current balance, **When** rendered in the store, **Then** the "Claim" button remains disabled with an indicator of the remaining balance needed to unlock it.

---

### User Story 4 - View, Search, and Revert Withdrawals in History / Ledger (Priority: P2)

As a user reviewing past expenditures, I want to view a chronological ledger of all withdrawals, filter them by category and date range, search by title or notes, and have the ability to revert/delete any withdrawal record to restore the deducted balance if logged by mistake.

**Why this priority**: Guarantees auditability, trust, and mistake recovery. Users must be able to verify their redemption history and correct erroneous balance deductions.

**Independent Test**: Can be tested independently by creating withdrawals, navigating to the History / Ledger tab, applying search/category filters, and deleting a withdrawal record to confirm that the deducted amount is immediately refunded to the user's balance.

**Acceptance Scenarios**:

1. **Given** recorded withdrawals exist, **When** the user opens the "History / Ledger" tab in the Rewards Hub, **Then** all past withdrawals are listed in reverse chronological order showing date, title, category, amount, and notes.
2. **Given** a ledger with multiple records, **When** the user filters by category or types a search query in the search box, **Then** the ledger list instantly filters to match the criteria.
3. **Given** a withdrawal record of 200 ₴ and a current balance of 150 ₴, **When** the user chooses to revert/delete the record and confirms the confirmation prompt, **Then** the withdrawal is removed from the ledger and the user's balance increases to 350 ₴.
4. **Given** a withdrawal that was created by claiming a one-time milestone reward, **When** that withdrawal is reverted, **Then** the associated reward is restored to its unclaimed active state in addition to refunding the balance.

---

### User Story 5 - Spending Analytics and Category Breakdown (Priority: P2)

As a user wanting to understand my spending patterns, I want to view dedicated analytics including a spending breakdown by category (donut/pie chart) and spending over time (trend chart), so that I can visualize where my discipline rewards are being allocated.

**Why this priority**: Complements the existing earnings analytics on the Dashboard with expenditure insights, providing a complete 360-degree view of personal discipline finance.

**Independent Test**: Can be tested independently by recording withdrawals across distinct categories, navigating to the Analytics tab, and verifying that total spend, category percentage breakdowns, and timeline distributions accurately reflect the ledger.

**Acceptance Scenarios**:

1. **Given** withdrawals in "Food & Treats" (300 ₴) and "Gear & Tech" (700 ₴), **When** opening the Rewards Analytics tab, **Then** a category breakdown chart displays 30% for Food & Treats and 70% for Gear & Tech, alongside a total spend summary of 1,000 ₴.
2. **Given** the user selects a time period filter ("This Month", "Last 30 Days", "This Year", or "All Time"), **When** selected, **Then** the category breakdown and spending trend charts dynamically update to reflect withdrawals from that period, automatically using daily bars for monthly views and monthly bars for yearly/all-time views.
3. **Given** a period with no recorded withdrawals, **When** viewing the Analytics tab, **Then** a clear empty state message is shown without chart rendering errors.

---

### User Story 6 - Custom Category Management in Settings (Priority: P3)

As a user with personalized spending habits, I want to manage withdrawal and reward categories in the Settings page (view default categories, create custom categories with custom names and colors/icons, and delete unused categories), so that my categories match my personal lifestyle.

**Why this priority**: Customizability enhances user ownership and flexibility, building on top of sensible built-in defaults.

**Independent Test**: Can be tested independently by navigating to Settings, adding a new category "Fitness & Sports", assigning it to a new reward or withdrawal, and confirming it appears in category pickers and analytics.

**Acceptance Scenarios**:

1. **Given** the user navigates to the Settings page, **When** viewing the Categories management section, **Then** all default and custom categories are listed, with the "General" category clearly designated as protected (deletion disabled).
2. **Given** the user enters a category name and confirms, **When** saved, **Then** the new category immediately appears in reward creation forms, quick spend dialogs, and ledger filter dropdowns.
3. **Given** a category that is currently assigned to existing rewards or withdrawals, **When** the user attempts to delete it, **Then** the system prompts the user to reassign existing items to the fallback "General" category or cancel the deletion.

---

### Edge Cases

- **Zero or negative balance**: System strictly prohibits balance from dropping below 0 ₴. All spend/claim operations validate against the current live balance before execution.
- **Negative or non-numeric inputs**: Form inputs reject zero, negative values, and non-numeric characters.
- **Atomic updates**: Balance deduction and withdrawal record creation occur as a single atomic unit; failure of either part leaves the balance and ledger unchanged.
- **Reversion of rewards**: When a withdrawal created from claiming a one-time reward is deleted, the one-time reward is atomically reset to unclaimed status if it still exists in the database. If the reward was previously deleted by the user, the reversion safely completes by refunding the balance and removing the withdrawal record without error. For repeatable rewards, reverting a withdrawal decrements the reward's `claimCount` by 1 (floored at 0) if the reward still exists.
- **Category deletion safeguards**: Deleting a category does not leave orphaned records; associated rewards and withdrawals are automatically reassigned to the default "General" category. The "General" category is permanently protected from deletion.
- **Reward deletion with claim history**: When a reward that has historical claim entries is deleted, the reward is removed from the Store/Wishlist, while all corresponding historical ledger entries remain fully intact with their captured title, amount, and category snapshot.
- **Empty state handling**: Friendly, descriptive empty states are displayed when no rewards exist in the wishlist, no withdrawals exist in the ledger, or no spending data exists for the selected analytics period.
- **Large values and decimals**: Currency values display formatted numbers with Ukrainian Hryvnia symbol (₴) consistently. Currency inputs allow positive numbers up to 2 decimal places (kopecks) or integers, displayed uniformly with Angular's `number` pipe (`1.0-2`).

## Requirements *(mandatory)*

### Architectural Constraints

- **AC-001**: Feature MUST be structured as a Vertical Slice, keeping all related concerns together.
- **AC-002**: Feature MUST NOT introduce unnecessary external dependencies.
- **AC-003**: Code design MUST adhere to SOLID principles and established developer best practices.

### Functional Requirements

- **FR-001**: System MUST provide a Quick Spend action on the Dashboard's balance widget and within the Rewards Hub to record an ad-hoc balance deduction.
- **FR-002**: Quick Spend form MUST validate that the amount is a positive number and does not exceed the user's current balance.
- **FR-003**: Quick Spend form MUST require Amount, Title, and Category, and accept an optional Notes field.
- **FR-004**: System MUST automatically record the exact calendar date (YYYY-MM-DD) and timestamp for every withdrawal transaction.
- **FR-005**: System MUST deduct the specified withdrawal amount from the user's total balance atomically upon recording a withdrawal.
- **FR-006**: System MUST prevent any withdrawal or claim transaction that would cause the user's balance to fall below zero.
- **FR-007**: Users MUST be able to define custom rewards with Title, Cost in ₴, Category, and Type (`repeatable` treat or `one-time` milestone).
- **FR-008**: System MUST display a visual progress bar on each reward card reflecting savings progress (`currentBalance / rewardCost`), visually capping at 100%.
- **FR-009**: System MUST allow users to claim any active reward whose cost is less than or equal to their current balance.
- **FR-010**: Claiming a reward MUST atomically deduct the reward cost from the balance, log a corresponding withdrawal record (with the reward's title, category, and reference), and mark one-time rewards as `claimed`.
- **FR-011**: System MUST provide a dedicated "Rewards" Hub accessible from the main navigation, containing three sub-sections/tabs: "Store / Wishlist", "History / Ledger", and "Analytics".
- **FR-012**: History / Ledger tab MUST display a searchable and filterable list of all past withdrawals in reverse chronological order.
- **FR-013**: History / Ledger tab MUST allow filtering withdrawals by category and date range, as well as text searching by title and notes.
- **FR-014**: System MUST allow users to revert/delete any past withdrawal, which atomically removes the record and restores the deducted amount back to the user's balance.
- **FR-015**: Reverting a withdrawal linked to a one-time milestone reward MUST atomically reset that reward's status to unclaimed (`active`) if the reward still exists. If linked to a repeatable reward, reverting MUST decrement `claimCount` by 1 (floored at 0). If the referenced reward has been deleted, reverting MUST still refund the balance and delete the withdrawal record safely.
- **FR-016**: Analytics tab MUST display spending metrics, including total amount spent within a selected period, a category breakdown donut/pie visualization, and a spending over time trend chart. System MUST provide timeframe filters ("This Month" [default], "Last 30 Days", "This Year", "All Time"), automatically grouping trend data by day for monthly/30-day views and by month for yearly/all-time views.
- **FR-017**: Settings page MUST provide a Category Management section allowing users to create, view, edit, and delete custom categories.
- **FR-018**: System MUST provide built-in default categories ("Food & Treats", "Entertainment", "Gear & Tech", "Books & Learning", "Health & Fitness", "General") available out-of-the-box.
- **FR-019**: System MUST permanently protect the default "General" category from deletion as the system fallback target. Users MAY rename or delete any other default or custom category. Deleting any category MUST automatically reassign all associated rewards and withdrawals to "General" to preserve data integrity.
- **FR-020**: Store / Wishlist view MUST provide a filter/toggle (or distinct section) allowing users to view and distinguish active wishlist rewards and claimed one-time milestone rewards, displaying completion timestamps and badges on claimed items.
- **FR-021**: Withdrawal records MUST retain an immutable snapshot of the transaction data (title, amount, category, date, timestamp). Deleting or modifying a reward in the Store MUST NOT alter, corrupt, or delete past withdrawal ledger entries.

### Key Entities *(include if feature involves data)*

- **WithdrawalRecord**: Represents a spending or redemption event. Attributes include:
  - `id`: unique identifier
  - `amount`: number in ₴ (positive value snapshot at transaction time)
  - `title`: display name snapshot (e.g. "Protein Bar", "Claimed: Mechanical Keyboard")
  - `categoryId`: reference to the associated category snapshot
  - `notes`: optional user notes or description
  - `date`: calendar date formatted as YYYY-MM-DD
  - `timestamp`: date-time timestamp of transaction
  - `rewardId`: optional reference to the source reward (remains or clears cleanly without affecting the ledger if the reward is deleted)
- **RewardItem**: Represents a user-defined goal or treat in the store. Attributes include:
  - `id`: unique identifier
  - `title`: reward title
  - `cost`: required balance in ₴ (positive value)
  - `categoryId`: reference to the associated category
  - `type`: `'repeatable'` (can be claimed multiple times) or `'one-time'` (single milestone redemption)
  - `status`: `'active'` or `'claimed'`
  - `claimedAt`: optional timestamp when one-time reward was claimed
  - `claimCount`: number of times redeemed (for repeatable rewards)
  - `createdAt`: timestamp of creation
- **RewardCategory**: Represents a classification for rewards and withdrawals. Attributes include:
  - `id`: unique identifier
  - `name`: category display name
  - `color`: optional accent color code
  - `icon`: optional icon name
  - `isDefault`: boolean indicating whether this is a system default category
  - `isProtected`: boolean (true exclusively for "General" fallback category, preventing deletion; false for other categories)
- **SpendingAnalyticsSummary**: Represents aggregated expenditure metrics for a time period. Attributes include:
  - `period`: active time filter identifier (`'thisMonth' | 'last30' | 'thisYear' | 'allTime'`)
  - `granularity`: trend grouping interval (`'daily' | 'monthly'`)
  - `totalSpent`: total currency amount spent across matching withdrawals
  - `categoryBreakdown`: list of categories with spent amount and percentage share
  - `spendingTrend`: chronological timeline entries of spending by day or month

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can trigger and complete an ad-hoc quick spend withdrawal in under 15 seconds from the Dashboard balance widget.
- **SC-002**: 100% of balance deductions and withdrawal records execute atomically with zero data discrepancies, strictly preventing negative balances.
- **SC-003**: The Reward Store accurately reflects savings progress for every reward relative to the current balance, updating instantly when balance changes.
- **SC-004**: Reverting or deleting any withdrawal refunds 100% of the deducted amount to the user's balance and properly restores linked one-time reward states.
- **SC-005**: Navigating between Rewards Hub tabs (Store, Ledger, Analytics) is responsive and renders in under 500 milliseconds.
- **SC-006**: Category breakdown analytics accurately reflect 100% of recorded withdrawals for the selected period without rounding or calculation errors.

## Assumptions

- Currency is denominated in ₴ (Ukrainian Hryvnia), matching the existing reward points system across the application.
- Initial out-of-the-box categories ("Food & Treats", "Entertainment", "Gear & Tech", "Books & Learning", "Health & Fitness", "General") are seeded on first load to provide immediate utility without requiring manual setup.
- Reverting a withdrawal created via a one-time reward claim restores both the deducted balance and the reward's claimable status.
- Deleting a category used by existing items safely reassigns those items to the default "General" category rather than deleting the items or leaving orphaned foreign keys.
- Quick spend withdrawals and reward claims use the user's current local date and timestamp.
