# Quickstart Validation Guide: Rewards & Money Withdrawal System

This guide outlines runnable end-to-end validation scenarios to verify the Rewards and Balance Withdrawal system.

## Prerequisites & Setup

1. Ensure all packages and dependencies are installed:
   ```bash
   npm install
   ```
2. Run lint check to verify project formatting:
   ```bash
   npm run lint
   ```
3. Start the development server:
   ```bash
   npm start
   ```

---

## Validation Scenarios

### Scenario 1: Quick Spend from Dashboard Balance Widget
- **Goal**: Verify ad-hoc balance deduction, atomic ledger entry creation, and zero negative balance constraint.
- **Steps**:
  1. Open Dashboard (`http://localhost:4200/dashboard`).
  2. Note the initial balance (e.g., 500 ₴).
  3. Click the "Quick Spend" button directly on the balance widget.
  4. Attempt to enter `600` ₴ (exceeding balance) → Verify form validation shows "Amount exceeds current balance" and submit is disabled.
  5. Attempt to enter `0` or `-50` ₴ → Verify validation prevents submission.
  6. Enter `120` ₴, title `"Protein Bar"`, select category `"Food & Treats"`, and click "Withdraw".
- **Expected Outcome**:
  - Modal closes immediately.
  - Dashboard balance drops from 500 ₴ to 380 ₴.
  - No errors in browser console.

---

### Scenario 2: Create Custom Rewards & Track Progress
- **Goal**: Verify reward creation and real-time progress calculation in the Store / Wishlist.
- **Steps**:
  1. Navigate to the Rewards hub (`http://localhost:4200/rewards`) via the main sidebar navigation.
  2. In the "Store / Wishlist" tab, click "+ Add Reward".
  3. Create a one-time reward: Title `"Wireless Headphones"`, Cost `1000` ₴, Category `"Gear & Tech"`, Type `"One-time milestone"`.
  4. Create a repeatable treat: Title `"Specialty Coffee"`, Cost `80` ₴, Category `"Food & Treats"`, Type `"Repeatable treat"`.
- **Expected Outcome**:
  - Both reward cards appear in the grid.
  - "Specialty Coffee" (cost 80 ₴, balance 380 ₴) shows a full 100% progress bar and an enabled "Claim" button.
  - "Wireless Headphones" (cost 1000 ₴, balance 380 ₴) shows 38% progress bar ("380 / 1000 ₴") and a disabled "Claim" button.

---

### Scenario 3: Claim Rewards & Ledger Synchronicity
- **Goal**: Verify claiming rewards deducts balance, updates one-time status, and logs a withdrawal record.
- **Steps**:
  1. In the Store tab, click "Claim" on "Specialty Coffee".
  2. Verify balance updates from 380 ₴ to 300 ₴.
  3. Switch to the "History / Ledger" tab in the Rewards hub.
- **Expected Outcome**:
  - A withdrawal entry titled `"Claimed: Specialty Coffee"` appears for 80 ₴ under category `"Food & Treats"` with today's date and timestamp.
  - "Specialty Coffee" remains active in the Store for future claims.

---

### Scenario 4: Revert / Delete a Ledger Transaction
- **Goal**: Verify balance refund and reset of claimed one-time rewards upon reverting a withdrawal.
- **Steps**:
  1. On the "History / Ledger" tab, find the `"Claimed: Specialty Coffee"` withdrawal (80 ₴).
  2. Click "Revert / Delete".
  3. Confirm the dialog prompt.
- **Expected Outcome**:
  - The withdrawal record is removed from the ledger.
  - The user's balance increases from 300 ₴ back to 380 ₴.

---

### Scenario 5: Category Management & Protected Fallback
- **Goal**: Verify custom category creation and safe reassignment to protected "General".
- **Steps**:
  1. Navigate to Settings (`http://localhost:4200/settings`).
  2. Locate the Categories management section.
  3. Verify default category `"General"` has its delete action disabled/locked.
  4. Add custom category `"Hobbies"`.
  5. Assign `"Hobbies"` to a new withdrawal or reward.
  6. Delete `"Hobbies"`.
- **Expected Outcome**:
  - System prompts and safely reassigns existing items to `"General"`.
  - No database exceptions or broken category references.

---

### Scenario 6: Spending Analytics
- **Goal**: Verify category breakdown donut chart and spending timeline.
- **Steps**:
  1. Navigate to the Rewards Hub -> "Analytics" tab.
  2. Toggle through timeframe presets: `"This Month"`, `"Last 30 Days"`, `"This Year"`, `"All Time"`.
- **Expected Outcome**:
  - Donut chart renders clean SVG slices colored by category with exact percentages.
  - Timeline renders daily or monthly bar distribution matching the ledger total.

---

## Automated Verification

Run unit test suites:
```bash
npm test
```

Run linting verification:
```bash
npm run lint
```
