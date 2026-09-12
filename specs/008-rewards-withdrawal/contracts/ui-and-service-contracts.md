# Interface Contracts: Rewards & Money Withdrawal System

## 1. Service Contracts

### `IWithdrawalService`
Responsible for recording withdrawals, balance deductions, ledger queries, and transaction reversions.

```typescript
export interface CreateWithdrawalDto {
  amount: number;
  title: string;
  categoryId: string;
  notes?: string;
  rewardId?: string | null;
}

export interface WithdrawalFilter {
  categoryId?: string;
  startDate?: string;             // YYYY-MM-DD
  endDate?: string;               // YYYY-MM-DD
  searchQuery?: string;
}

export interface IWithdrawalService {
  /**
   * Records a withdrawal and atomically deducts the amount from user balance.
   * If rewardId is provided, also updates the reward state if needed.
   * Throws Error if amount <= 0 or if balance is insufficient.
   */
  withdraw(dto: CreateWithdrawalDto): Promise<WithdrawalRecord>;

  /**
   * Reverts a withdrawal by ID. Atomically:
   * 1. Refunds the balance to the user.
   * 2. Removes the withdrawal record from the ledger.
   * 3. If linked to an existing one-time reward, resets its status to 'active'.
   * 4. If linked to an existing repeatable reward, decrements claimCount (floored at 0).
   * 5. If linked reward was deleted, safely completes balance refund and withdrawal removal.
   */
  revertWithdrawal(id: string): Promise<void>;

  /**
   * Observable stream of all withdrawals matching the optional filter,
   * sorted in reverse chronological order.
   */
  getWithdrawals(filter?: WithdrawalFilter): Observable<WithdrawalRecord[]>;

  /**
   * Gets a single withdrawal by ID.
   */
  getWithdrawalById(id: string): Promise<WithdrawalRecord | undefined>;
}
```

---

### `IRewardsService`
Responsible for managing reward wishlist items, calculating savings progress, and processing claims.

```typescript
export interface CreateRewardDto {
  title: string;
  cost: number;
  categoryId: string;
  type: RewardType;
}

export interface UpdateRewardDto {
  title?: string;
  cost?: number;
  categoryId?: string;
  type?: RewardType;
}

export interface IRewardsService {
  /**
   * Observable stream of rewards, optionally filtered by status ('active' or 'claimed').
   */
  getRewards(status?: RewardStatus): Observable<RewardItem[]>;

  /**
   * Creates a new reward item.
   */
  createReward(dto: CreateRewardDto): Promise<RewardItem>;

  /**
   * Updates an existing reward.
   */
  updateReward(id: string, dto: UpdateRewardDto): Promise<RewardItem>;

  /**
   * Deletes a reward by ID.
   * Past withdrawal records that claimed this reward retain their snapshot data.
   */
  deleteReward(id: string): Promise<void>;

  /**
   * Claims an affordable reward. Atomically:
   * 1. Deducts cost from user balance.
   * 2. Creates a corresponding WithdrawalRecord.
   * 3. For one-time rewards, marks status as 'claimed'. For repeatable, increments claimCount.
   */
  claimReward(reward: RewardItem): Promise<WithdrawalRecord>;
}
```

---

### `ICategoryService`
Responsible for category CRUD and data integrity safeguards.

```typescript
export interface CreateCategoryDto {
  name: string;
  color?: string;
  icon?: string;
}

export interface ICategoryService {
  /**
   * Observable stream of all categories.
   */
  getCategories(): Observable<RewardCategory[]>;

  /**
   * Creates a custom category.
   */
  createCategory(dto: CreateCategoryDto): Promise<RewardCategory>;

  /**
   * Updates an existing category (cannot change isProtected on 'General').
   */
  updateCategory(id: string, dto: Partial<CreateCategoryDto>): Promise<RewardCategory>;

  /**
   * Deletes a category by ID.
   * Throws Error if category is protected (i.e., 'General').
   * Atomically reassigns all existing rewards and withdrawals with this category to 'General'.
   */
  deleteCategory(id: string): Promise<void>;

  /**
   * Gets the permanent fallback category ('General').
   */
  getFallbackCategory(): Promise<RewardCategory>;
}
```

---

### `ISpendingAnalyticsService`
Responsible for aggregating withdrawal expenditures across timeframes.

```typescript
export interface ISpendingAnalyticsService {
  /**
   * Computes spending analytics summary for the specified period.
   */
  getAnalyticsSummary(period: AnalyticsPeriod): Observable<SpendingAnalyticsSummary>;
}
```

---

## 2. Component Contracts

### `QuickSpendDialogComponent`
Opened from Dashboard balance widget or Rewards hub.

```typescript
export interface IQuickSpendDialogComponent {
  // Form controls
  amountControl: FormControl<number | null>;
  titleControl: FormControl<string>;
  categoryControl: FormControl<string>;
  notesControl: FormControl<string>;

  // Data signals/observables
  currentBalance: Signal<number>;
  categories: Signal<RewardCategory[]>;
  isSubmitting: Signal<boolean>;

  // Actions
  submit(): Promise<void>;
  cancel(): void;
}
```

### `RewardCardComponent`
Renders a single reward item in the Store grid.

```typescript
export interface IRewardCardComponent {
  // Inputs
  reward: InputSignal<RewardItem>;
  currentBalance: InputSignal<number>;
  category: InputSignal<RewardCategory | undefined>;

  // Computed
  progressPercentage: Signal<number>;     // 0 - 100
  isAffordable: Signal<boolean>;          // currentBalance >= reward.cost
  remainingNeeded: Signal<number>;        // Math.max(0, reward.cost - currentBalance)

  // Outputs
  claim: OutputEmitterRef<RewardItem>;
  edit: OutputEmitterRef<RewardItem>;
  delete: OutputEmitterRef<RewardItem>;
}
```

### `SpendingDonutChartComponent`
Native SVG Donut / Pie chart visualization.

```typescript
export interface ISpendingDonutChartComponent {
  // Inputs
  breakdown: InputSignal<CategorySpendingBreakdown[]>;
  totalSpent: InputSignal<number>;

  // Computed SVG sectors/segments
  segments: Signal<Array<{
    categoryId: string;
    categoryName: string;
    color: string;
    percentage: number;
    amount: number;
    strokeDasharray: string;
    strokeDashoffset: number;
  }>>;
}
```
