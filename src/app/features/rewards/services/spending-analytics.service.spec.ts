import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { SpendingAnalyticsService } from './spending-analytics.service';
import { DbService } from '../../../core/services/db.service';
import type { WithdrawalRecord } from '../models/withdrawal.model';
import type { RewardCategory } from '../models/reward-category.model';

vi.mock('dexie', () => {
  class MockDexie {
    version = vi.fn();
  }
  return {
    default: MockDexie,
    Dexie: MockDexie,
    liveQuery: (fn: () => unknown) => ({
      '@@observable'() {
        return {
          subscribe(subscriber: { next: (val: unknown) => void; complete: () => void; error: (err: unknown) => void }) {
            Promise.resolve().then(fn).then(
              (val) => {
                subscriber.next(val);
                subscriber.complete();
              },
              (err: unknown) => { subscriber.error(err); }
            );
            return {
              unsubscribe() {
                // no-op for mock
              },
            };
          },
        };
      },
    }),
  };
});

describe('SpendingAnalyticsService', () => {
  let service: SpendingAnalyticsService;
  let mockCategories: RewardCategory[];

  let mockDb: {
    withdrawals: {
      toArray: ReturnType<typeof vi.fn>;
      where: ReturnType<typeof vi.fn>;
    };
    rewardCategories: {
      toArray: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockCategories = [
      {
        id: 'cat-food',
        name: 'Food & Treats',
        color: '#ff9800',
        icon: 'fastfood',
        isDefault: true,
        isProtected: false,
        createdAt: 1000,
      },
      {
        id: 'cat-gear',
        name: 'Gear & Tech',
        color: '#2196f3',
        icon: 'devices',
        isDefault: true,
        isProtected: false,
        createdAt: 1000,
      },
    ];

    const toArrayFn = vi.fn().mockResolvedValue([]);
    const chain = { toArray: toArrayFn };
    mockDb = {
      withdrawals: {
        where: vi.fn().mockReturnValue({
          between: vi.fn().mockReturnValue(chain),
          aboveOrEqual: vi.fn().mockReturnValue(chain),
          belowOrEqual: vi.fn().mockReturnValue(chain),
        }),
        toArray: toArrayFn,
      },
      rewardCategories: {
        toArray: vi.fn().mockResolvedValue(mockCategories),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        SpendingAnalyticsService,
        { provide: DbService, useValue: mockDb },
      ],
    });

    service = TestBed.inject(SpendingAnalyticsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit analytics summary via liveQuery getAnalytics stream', async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    mockDb.withdrawals.toArray.mockResolvedValueOnce([
      {
        id: 'w1',
        title: 'Snack',
        amount: 50,
        categoryId: 'cat-food',
        date: todayStr,
        timestamp: Date.now(),
      },
    ]);

    const summary = await firstValueFrom(service.getAnalytics('thisMonth'));
    expect(summary.totalSpent).toBe(50);
    expect(summary.withdrawalCount).toBe(1);
    expect(summary.categoryBreakdown).toHaveLength(1);
    expect(summary.categoryBreakdown[0].categoryName).toBe('Food & Treats');
  });

  it('should accurately calculate total spend and category percentages', () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const withdrawals: WithdrawalRecord[] = [
      {
        id: 'w1',
        title: 'Burger',
        amount: 300,
        categoryId: 'cat-food',
        date: todayStr,
        timestamp: Date.now(),
      },
      {
        id: 'w2',
        title: 'Headphones',
        amount: 700,
        categoryId: 'cat-gear',
        date: todayStr,
        timestamp: Date.now(),
      },
    ];

    const categoryMap = new Map<string, RewardCategory>();
    mockCategories.forEach(c => categoryMap.set(c.id, c));

    const result = service.computeAnalytics('thisMonth', withdrawals, categoryMap);

    expect(result.totalSpent).toBe(1000);
    expect(result.withdrawalCount).toBe(2);
    expect(result.categoryBreakdown.length).toBe(2);

    const gearBreakdown = result.categoryBreakdown.find(c => c.categoryId === 'cat-gear');
    const foodBreakdown = result.categoryBreakdown.find(c => c.categoryId === 'cat-food');

    expect(gearBreakdown?.totalSpent).toBe(700);
    expect(gearBreakdown?.percentage).toBe(70);
    expect(foodBreakdown?.totalSpent).toBe(300);
    expect(foodBreakdown?.percentage).toBe(30);
  });

  it('should handle empty withdrawals gracefully', () => {
    const categoryMap = new Map<string, RewardCategory>();
    mockCategories.forEach(c => categoryMap.set(c.id, c));

    const result = service.computeAnalytics('thisMonth', [], categoryMap);

    expect(result.totalSpent).toBe(0);
    expect(result.withdrawalCount).toBe(0);
    expect(result.categoryBreakdown).toEqual([]);
    expect(result.spendingTrend.length).toBeGreaterThan(0);
  });

  it('should use daily granularity and produce 30 points for last30 with amounts', () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const withdrawals: WithdrawalRecord[] = [
      {
        id: 'w1',
        title: 'Daily spend',
        amount: 120,
        categoryId: 'cat-food',
        date: todayStr,
        timestamp: Date.now(),
      },
    ];

    const categoryMap = new Map<string, RewardCategory>();
    const result = service.computeAnalytics('last30', withdrawals, categoryMap);

    expect(result.granularity).toBe('daily');
    expect(result.spendingTrend.length).toBe(30);
    const todayPoint = result.spendingTrend.find(p => p.dateOrMonth === todayStr);
    expect(todayPoint?.amount).toBe(120);
  });

  it('should use monthly granularity and produce 12 points for thisYear with monthly totals', () => {
    const year = new Date().getFullYear();
    const withdrawals: WithdrawalRecord[] = [
      {
        id: 'w1',
        title: 'January spend',
        amount: 500,
        categoryId: 'cat-gear',
        date: `${year}-01-10`,
        timestamp: 1000,
      },
      {
        id: 'w2',
        title: 'February spend',
        amount: 250,
        categoryId: 'cat-food',
        date: `${year}-02-14`,
        timestamp: 2000,
      },
    ];

    const categoryMap = new Map<string, RewardCategory>();
    const result = service.computeAnalytics('thisYear', withdrawals, categoryMap);

    expect(result.granularity).toBe('monthly');
    expect(result.spendingTrend.length).toBe(12);

    const janPoint = result.spendingTrend.find(p => p.dateOrMonth === `${year}-01`);
    const febPoint = result.spendingTrend.find(p => p.dateOrMonth === `${year}-02`);
    expect(janPoint?.amount).toBe(500);
    expect(febPoint?.amount).toBe(250);
  });

  it('should handle allTime period with multiple months', () => {
    const withdrawals: WithdrawalRecord[] = [
      {
        id: 'w1',
        title: 'Item 1',
        amount: 100,
        categoryId: 'cat-food',
        date: '2026-01-15',
        timestamp: 1000,
      },
      {
        id: 'w2',
        title: 'Item 2',
        amount: 250,
        categoryId: 'cat-gear',
        date: '2026-03-20',
        timestamp: 2000,
      },
    ];

    const categoryMap = new Map<string, RewardCategory>();
    mockCategories.forEach(c => categoryMap.set(c.id, c));

    const result = service.computeAnalytics('allTime', withdrawals, categoryMap);

    expect(result.granularity).toBe('monthly');
    expect(result.totalSpent).toBe(350);
    expect(result.spendingTrend.length).toBe(2);
    expect(result.spendingTrend[0].dateOrMonth).toBe('2026-01');
    expect(result.spendingTrend[0].amount).toBe(100);
    expect(result.spendingTrend[1].dateOrMonth).toBe('2026-03');
    expect(result.spendingTrend[1].amount).toBe(250);
  });

  it('should return a single 0-amount point for current month when allTime has zero withdrawals', () => {
    const categoryMap = new Map<string, RewardCategory>();
    const result = service.computeAnalytics('allTime', [], categoryMap);

    expect(result.granularity).toBe('monthly');
    expect(result.totalSpent).toBe(0);
    expect(result.spendingTrend.length).toBe(1);
    expect(result.spendingTrend[0].amount).toBe(0);
  });

  it('should fallback to General and default styling when category is not found in map', () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const withdrawals: WithdrawalRecord[] = [
      {
        id: 'w1',
        title: 'Deleted Category Spend',
        amount: 50,
        categoryId: 'unknown-id',
        date: `${year}-${month}-${day}`,
        timestamp: Date.now(),
      },
    ];

    const result = service.computeAnalytics('thisMonth', withdrawals, new Map());

    expect(result.categoryBreakdown.length).toBe(1);
    expect(result.categoryBreakdown[0].categoryName).toBe('General');
    expect(result.categoryBreakdown[0].color).toBe('#9e9e9e');
    expect(result.categoryBreakdown[0].icon).toBe('category');
    expect(result.categoryBreakdown[0].totalSpent).toBe(50);
    expect(result.categoryBreakdown[0].percentage).toBe(100);
  });
});
