import { Service, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { DbService } from '../../../core/services/db.service';
import type { AnalyticsPeriod } from '../models/analytics-period.type';
import type { TrendGranularity } from '../models/trend-granularity.type';
import type { SpendingAnalyticsSummary } from '../models/spending-analytics.model';
import type { CategorySpendingBreakdown } from '../models/category-spending-breakdown.model';
import type { SpendingTrendPoint } from '../models/spending-trend-point.model';
import type { WithdrawalRecord } from '../models/withdrawal.model';
import type { RewardCategory } from '../models/reward-category.model';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ONE_DAY_MS = 86_400_000;
const LAST_30_DAYS_COUNT = 30;

function formatZeroPadded(num: number): string {
  return String(num).padStart(2, '0');
}

function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = formatZeroPadded(date.getMonth() + 1);
  const d = formatZeroPadded(date.getDate());
  return `${y}-${m}-${d}`;
}

@Service()
export class SpendingAnalyticsService {
  private readonly db = inject(DbService);

  getAnalytics(period: AnalyticsPeriod): Observable<SpendingAnalyticsSummary> {
    return from(
      liveQuery(async () => {
        const now = new Date();
        const todayStr = formatDateString(now);

        let startDate: string | undefined;
        let endDate: string | undefined = todayStr;

        if (period === 'thisMonth') {
          startDate = `${now.getFullYear()}-${formatZeroPadded(now.getMonth() + 1)}-01`;
        } else if (period === 'last30') {
          const past30 = new Date(now.getTime() - (LAST_30_DAYS_COUNT - 1) * ONE_DAY_MS);
          startDate = formatDateString(past30);
        } else if (period === 'thisYear') {
          startDate = `${now.getFullYear()}-01-01`;
          endDate = `${now.getFullYear()}-12-31`;
        } else {
          startDate = undefined;
          endDate = undefined;
        }

        let withdrawalsPromise;
        if (startDate && endDate) {
          withdrawalsPromise = this.db.withdrawals.where('date').between(startDate, endDate, true, true).toArray();
        } else if (startDate) {
          withdrawalsPromise = this.db.withdrawals.where('date').aboveOrEqual(startDate).toArray();
        } else if (endDate) {
          withdrawalsPromise = this.db.withdrawals.where('date').belowOrEqual(endDate).toArray();
        } else {
          withdrawalsPromise = this.db.withdrawals.toArray();
        }

        const [allWithdrawals, allCategories] = await Promise.all([
          withdrawalsPromise,
          this.db.rewardCategories.toArray(),
        ]);

        const categoryMap = new Map<string, RewardCategory>();
        allCategories.forEach(cat => categoryMap.set(cat.id, cat));

        return this.computeAnalytics(period, allWithdrawals, categoryMap, startDate, endDate, now);
      })
    );
  }

  computeAnalytics(
    period: AnalyticsPeriod,
    withdrawals: WithdrawalRecord[],
    categoryMap: Map<string, RewardCategory>,
    _startDate?: string,
    _endDate?: string,
    now: Date = new Date()
  ): SpendingAnalyticsSummary {
    let granularity: TrendGranularity;

    if (period === 'thisMonth' || period === 'last30') {
      granularity = 'daily';
    } else {
      granularity = 'monthly';
    }

    const filteredWithdrawals = withdrawals;

    const totalSpent = filteredWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const withdrawalCount = filteredWithdrawals.length;

    const categoryTotals = new Map<string, number>();
    filteredWithdrawals.forEach(w => {
      const current = categoryTotals.get(w.categoryId) ?? 0;
      categoryTotals.set(w.categoryId, current + w.amount);
    });

    const categoryBreakdown: CategorySpendingBreakdown[] = Array.from(categoryTotals.entries())
      .map(([categoryId, catSpent]) => {
        const category = categoryMap.get(categoryId);
        const percentage = totalSpent > 0 ? Math.round((catSpent / totalSpent) * 1000) / 10 : 0;
        return {
          categoryId,
          categoryName: category?.name ?? 'General',
          color: category?.color ?? '#9e9e9e',
          icon: category?.icon ?? 'category',
          totalSpent: catSpent,
          percentage,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);

    const spendingTrend = this.generateSpendingTrend(period, granularity, filteredWithdrawals, now);

    return {
      period,
      granularity,
      totalSpent,
      withdrawalCount,
      categoryBreakdown,
      spendingTrend,
    };
  }

  private generateSpendingTrend(
    period: AnalyticsPeriod,
    granularity: TrendGranularity,
    withdrawals: WithdrawalRecord[],
    now: Date
  ): SpendingTrendPoint[] {
    if (granularity === 'daily') {
      return this.generateDailyTrend(period, withdrawals, now);
    }
    return this.generateMonthlyTrend(period, withdrawals, now);
  }

  private generateDailyTrend(
    period: AnalyticsPeriod,
    withdrawals: WithdrawalRecord[],
    now: Date
  ): SpendingTrendPoint[] {
    const dailyMap = new Map<string, number>();
    withdrawals.forEach(w => {
      dailyMap.set(w.date, (dailyMap.get(w.date) ?? 0) + w.amount);
    });

    const points: SpendingTrendPoint[] = [];

    if (period === 'last30') {
      for (let i = LAST_30_DAYS_COUNT - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * ONE_DAY_MS);
        const dateStr = formatDateString(d);
        const label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
        points.push({
          dateOrMonth: dateStr,
          label,
          amount: dailyMap.get(dateStr) ?? 0,
        });
      }
    } else {
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${formatZeroPadded(month + 1)}-${formatZeroPadded(day)}`;
        const label = `${day} ${MONTH_NAMES[month]}`;
        points.push({
          dateOrMonth: dateStr,
          label,
          amount: dailyMap.get(dateStr) ?? 0,
        });
      }
    }

    return points;
  }

  private generateMonthlyTrend(
    period: AnalyticsPeriod,
    withdrawals: WithdrawalRecord[],
    now: Date
  ): SpendingTrendPoint[] {
    const monthlyMap = new Map<string, number>();
    withdrawals.forEach(w => {
      const monthKey = w.date.substring(0, 7);
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) ?? 0) + w.amount);
    });

    const points: SpendingTrendPoint[] = [];

    if (period === 'thisYear') {
      const year = now.getFullYear();
      for (let month = 0; month < 12; month++) {
        const monthKey = `${year}-${formatZeroPadded(month + 1)}`;
        const label = MONTH_NAMES[month];
        points.push({
          dateOrMonth: monthKey,
          label,
          amount: monthlyMap.get(monthKey) ?? 0,
        });
      }
    } else {
      const sortedKeys = Array.from(monthlyMap.keys()).sort();
      if (sortedKeys.length === 0) {
        const year = now.getFullYear();
        const month = now.getMonth();
        const monthKey = `${year}-${formatZeroPadded(month + 1)}`;
        return [{
          dateOrMonth: monthKey,
          label: `${MONTH_NAMES[month]} '${String(year).slice(-2)}`,
          amount: 0,
        }];
      }

      for (const monthKey of sortedKeys) {
        const [yStr, mStr] = monthKey.split('-');
        const monthIdx = parseInt(mStr, 10) - 1;
        const shortYear = yStr.slice(-2);
        points.push({
          dateOrMonth: monthKey,
          label: `${MONTH_NAMES[monthIdx]} '${shortYear}`,
          amount: monthlyMap.get(monthKey) ?? 0,
        });
      }
    }

    return points;
  }
}
