# Research: Rewards & Money Withdrawal System

## 1. Technology Stack & Zero External Dependencies

- **Decision**: 
  - Build all UI components using Angular v22 standalone components, Angular Material (`@angular/material` - Dialog, Tabs, Card, Form Field, Input, Select, Button, Icon, Menu, ProgressBar, SnackBar), and Angular CDK.
  - Implement the Category Breakdown (Donut/Pie Chart) and Spending Over Time (Bar/Trend Chart) using native, responsive SVG without installing any external charting libraries (e.g., no Chart.js, no D3, no ngx-charts).
- **Rationale**:
  - Adheres strictly to Principle II (Minimal Dependencies) and `GEMINI.md` project rules.
  - Native SVG donut charts using SVG `<circle>` with `stroke-dasharray` and `stroke-dashoffset` (or SVG `<path>` arc segments) are lightweight, sharp at any DPI, natively reactive to Angular signals, and simple to unit test in headless Vitest without requiring canvas mock layers.
  - Native SVG bar chart for spending trends reuses proven patterns from `007-dashboard-earnings-stats`.
- **Alternatives considered**:
  - `chart.js` / `ng2-charts`: Adds ~150KB+ bundle weight, canvas-based rendering that complicates headless tests.
  - `d3`: Heavy dependency footprint, imperative DOM manipulation contrary to Angular declarative patterns.

## 2. Data Integrity & Atomic Transactions in Dexie.js

- **Decision**: 
  - Bump `DbService` schema to `version(8)` adding three new tables:
    - `withdrawals`: `'id, date, categoryId, timestamp, rewardId'`
    - `rewards`: `'id, categoryId, type, status, createdAt'`
    - `rewardCategories`: `'id, name, isDefault, isProtected'`
  - Perform all balance deductions, reward claims, and withdrawal reversions within Dexie read-write transactions:
    ```typescript
    await this.db.transaction('rw', [this.db.users, this.db.withdrawals, this.db.rewards], async () => {
      const user = await this.db.users.get(CURRENT_USER_ID);
      if (!user || user.balance < amount) {
        throw new Error('Insufficient balance');
      }
      await this.db.users.update(CURRENT_USER_ID, {
        balance: user.balance - amount,
        updatedAt: Date.now()
      });
      await this.db.withdrawals.add(withdrawalRecord);
      if (isClaim && rewardId) {
        await this.db.rewards.update(rewardId, { status: 'claimed', claimedAt: Date.now() });
      }
    });
    ```
  - Reversion/deletion of withdrawals similarly restores balance atomically and resets linked one-time rewards to active.
- **Rationale**:
  - IndexedDB native transactions managed via Dexie ensure that if any operation fails or throws (e.g. insufficient funds, database constraint), the entire transaction aborts with zero mutations.
  - Strictly prevents balance from falling below zero or ledger going out of sync with user balance.
- **Alternatives considered**:
  - Separate service calls without transactions: Prone to race conditions and inconsistent states where balance is deducted but withdrawal fails to save.

## 3. Ledger Snapshot Immutability & Reference Model

- **Decision**: 
  - Every `WithdrawalRecord` stores a self-contained snapshot of transaction data at execution time: `title` (string), `amount` (number), `categoryId` (string), `date` (`YYYY-MM-DD`), and `timestamp` (number), plus an optional `rewardId` (string).
  - If a reward is later modified (e.g., cost or title changed) or deleted from the Store, past withdrawal records remain 100% immutable. The `rewardId` remains as a historical pointer or clears without altering the title or amount snapshot in the ledger.
- **Rationale**:
  - Accounting best practice: Financial ledgers must represent historical reality at the moment of expenditure, regardless of subsequent catalog changes.
  - Protects ledger auditability and prevents retrospective balance/spend distortion.
- **Alternatives considered**:
  - Dynamically looking up reward title and category by `rewardId`: If the reward is edited or deleted, past ledger entries would change or break.

## 4. Category Lifecycle, Safeguards, and Protected Fallback

- **Decision**: 
  - Seed 6 default categories on initial database creation and migration:
    1. "Food & Treats" (icon: `restaurant`, color: `#f59e0b`)
    2. "Entertainment" (icon: `movie`, color: `#8b5cf6`)
    3. "Gear & Tech" (icon: `devices`, color: `#3b82f6`)
    4. "Books & Learning" (icon: `menu_book`, color: `#10b981`)
    5. "Health & Fitness" (icon: `fitness_center`, color: `#ef4444`)
    6. "General" (icon: `category`, color: `#6b7280`, `isProtected: true`, `isDefault: true`)
  - The "General" category is permanently protected (`isProtected: true`): it cannot be deleted in Settings.
  - All other categories (default or custom) can be renamed or deleted. When a category is deleted, Dexie transaction reassigns all existing rewards and withdrawals pointing to it to the "General" category.
- **Rationale**:
  - Satisfies User Clarification Q3: Users have full flexibility to prune categories they don't use, while guaranteeing an indestructible fallback for referential integrity.
- **Alternatives considered**:
  - Disallowing category deletion if items exist: Frustrates users with cascading blocking alerts.
  - Deleting all items associated with a category: Would destroy financial ledger history, which is prohibited.

## 5. Quick Spend UX & Component Sharing

- **Decision**: 
  - Encapsulate the Quick Spend form in `QuickSpendDialogComponent` (Angular Material dialog).
  - Triggerable from:
    1. The `BalanceWidgetComponent` on the Dashboard tab via an intuitive spend icon button (`remove_circle_outline` / `payments`).
    2. The Rewards Hub (Store tab and Ledger tab) via a primary action button "+ Quick Spend".
  - The dialog validates amount in real-time against `userService.user$` balance, pre-focuses the amount input, provides category selection, and closes immediately upon successful atomic transaction.
- **Rationale**:
  - Keeps user in context on the Dashboard without unwanted route transitions.
  - Reuses a single dialog component across Dashboard and Rewards, avoiding code duplication while maintaining slice boundaries.
- **Alternatives considered**:
  - Navigating to `/rewards/spend`: Unnecessary friction for quick ad-hoc entries from the Dashboard.

## 6. Architecture & Slice Layout

- **Decision**: 
  - Create feature slice `src/app/features/rewards/` containing its models, services, components, and pages.
  - Route: `/rewards` loaded lazily in `app.routes.ts`.
  - Main Navigation: Add "Rewards" (`/rewards`, icon: `card_giftcard`) to `NAV_ITEMS` in `src/app/shared/components/layout/layout.ts`.
  - Category Management: Exposed as a tab or section in `src/app/features/settings/` leveraging `CategoryService` from the rewards slice.
- **Rationale**:
  - Adheres to Vertical Slice Architecture (Principle I).
  - Encapsulates domain logic cleanly within `features/rewards`.
