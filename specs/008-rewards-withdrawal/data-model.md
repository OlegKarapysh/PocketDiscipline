# Data Model: Rewards & Money Withdrawal System

## Entities

### 1. `WithdrawalRecord`
Represents an individual balance withdrawal or redeemed reward event.

- **Storage**: Stored in Dexie table `withdrawals`.
- **Primary Key**: `id: string` (UUID).
- **Indexed Properties**: `id`, `date`, `categoryId`, `timestamp`, `rewardId`.

```typescript
export interface WithdrawalRecord {
  id: string;                      // UUID
  amount: number;                  // Positive number in ₴ (snapshot value)
  title: string;                   // Display title snapshot (e.g., "Protein Bar", "Claimed: Keyboard")
  categoryId: string;              // Reference to RewardCategory id (snapshot value)
  notes?: string;                  // Optional user notes
  date: string;                    // Calendar date in ISO format (YYYY-MM-DD)
  timestamp: number;               // Milliseconds timestamp of creation
  rewardId?: string | null;        // Reference to source RewardItem if created via reward claim
}
```

**Validation Rules**:
- `amount` MUST be a positive number (`> 0`) and MUST NOT exceed user's current balance at execution time.
- `title` MUST NOT be empty or whitespace-only (maximum 100 characters).
- `categoryId` MUST reference a valid existing `RewardCategory`.
- `date` MUST conform to `YYYY-MM-DD` format.
- `timestamp` MUST be a valid finite integer.

---

### 2. `RewardItem`
Represents a user-defined treat or milestone item in the Store / Wishlist.

- **Storage**: Stored in Dexie table `rewards`.
- **Primary Key**: `id: string` (UUID).
- **Indexed Properties**: `id`, `categoryId`, `type`, `status`, `createdAt`.

```typescript
export type RewardType = 'repeatable' | 'one-time';
export type RewardStatus = 'active' | 'claimed';

export interface RewardItem {
  id: string;                      // UUID
  title: string;                   // Reward display name
  cost: number;                    // Required balance in ₴ (> 0)
  categoryId: string;              // Reference to RewardCategory id
  type: RewardType;                // 'repeatable' or 'one-time'
  status: RewardStatus;            // 'active' (available) or 'claimed' (for one-time)
  claimedAt?: number | null;       // Timestamp when claimed (if one-time)
  claimCount: number;              // Number of times claimed (for repeatable rewards, default 0)
  createdAt: number;               // Milliseconds timestamp of creation
  updatedAt?: number;              // Milliseconds timestamp of last edit
}
```

**State Transitions**:
- **Repeatable**:
  - `status` remains `'active'` indefinitely.
  - On claim: `claimCount` increments by 1.
  - On withdrawal reversion: `claimCount` decrements by 1 (`Math.max(0, claimCount - 1)`) if reward exists.
- **One-time Milestone**:
  - Starts with `status: 'active'`, `claimedAt: null`.
  - On claim: transitions to `status: 'claimed'`, `claimedAt: Date.now()`.
  - On withdrawal reversion: transitions back to `status: 'active'`, `claimedAt: null` if reward exists. (If reward was deleted, balance is refunded and withdrawal is removed without error).

**Validation Rules**:
- `cost` MUST be a positive number (`> 0`) with up to 2 decimal places or integer.
- `title` MUST be non-empty (1-100 characters).
- `categoryId` MUST reference an existing `RewardCategory`.

---

### 3. `RewardCategory`
Represents a category classification for rewards and withdrawals.

- **Storage**: Stored in Dexie table `rewardCategories`.
- **Primary Key**: `id: string` (UUID or slug).
- **Indexed Properties**: `id`, `name`, `isDefault`, `isProtected`.

```typescript
export interface RewardCategory {
  id: string;                      // UUID or unique slug
  name: string;                    // Category display name
  color: string;                   // Hex color code (e.g., '#f59e0b')
  icon: string;                    // Material icon name (e.g., 'restaurant')
  isDefault: boolean;              // True for initial seeded categories
  isProtected: boolean;            // True exclusively for 'General' fallback category (blocks deletion)
  createdAt: number;               // Timestamp of creation
}
```

**Pre-Seeded Default Categories**:
1. `{ id: 'cat-food', name: 'Food & Treats', color: '#f59e0b', icon: 'restaurant', isDefault: true, isProtected: false }`
2. `{ id: 'cat-ent', name: 'Entertainment', color: '#8b5cf6', icon: 'movie', isDefault: true, isProtected: false }`
3. `{ id: 'cat-tech', name: 'Gear & Tech', color: '#3b82f6', icon: 'devices', isDefault: true, isProtected: false }`
4. `{ id: 'cat-books', name: 'Books & Learning', color: '#10b981', icon: 'menu_book', isDefault: true, isProtected: false }`
5. `{ id: 'cat-health', name: 'Health & Fitness', color: '#ef4444', icon: 'fitness_center', isDefault: true, isProtected: false }`
6. `{ id: 'cat-general', name: 'General', color: '#6b7280', icon: 'category', isDefault: true, isProtected: true }`

**Safeguards**:
- The `"General"` category cannot be deleted (`isProtected: true`).
- Deleting any category reassigns all existing items (`rewards` and `withdrawals`) with that `categoryId` to `'cat-general'`.

---

### 4. `SpendingAnalyticsSummary`
Represents calculated expenditure metrics for a selected timeframe in the Analytics tab.

```typescript
export type AnalyticsPeriod = 'thisMonth' | 'last30' | 'thisYear' | 'allTime';
export type TrendGranularity = 'daily' | 'monthly';

export interface CategorySpendingBreakdown {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  totalSpent: number;
  percentage: number;              // 0 - 100
}

export interface SpendingTrendPoint {
  dateOrMonth: string;             // 'YYYY-MM-DD' or 'YYYY-MM'
  label: string;                   // Display label (e.g., "Sep 05" or "Sep 2026")
  amount: number;
}

export interface SpendingAnalyticsSummary {
  period: AnalyticsPeriod;
  granularity: TrendGranularity;
  totalSpent: number;
  withdrawalCount: number;
  categoryBreakdown: CategorySpendingBreakdown[];
  spendingTrend: SpendingTrendPoint[];
}
```

---

## Database Schema Migration (`DbService.ts`)

```typescript
// Version 8: Rewards and Withdrawals
this.version(8).stores({
  withdrawals: 'id, date, categoryId, timestamp, rewardId',
  rewards: 'id, categoryId, type, status, createdAt',
  rewardCategories: 'id, name, isDefault, isProtected'
}).upgrade(async (tx) => {
  const categoriesCount = await tx.table('rewardCategories').count();
  if (categoriesCount === 0) {
    await tx.table('rewardCategories').bulkAdd(INITIAL_REWARD_CATEGORIES);
  }
});
```
