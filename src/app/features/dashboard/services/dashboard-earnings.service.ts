import { Service, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { liveQuery } from 'dexie';
import { DbService } from '../../../database/db.service';
import type { DailyEarningsRecord } from '../models/daily-earnings-record.model';
import type { MonthlyEarningsSummary } from '../models/monthly-earnings-summary.model';
import type { PeriodPreset } from '../models/period-preset.type';
import type { Goal } from '../../../core/models/goal.model';
import { GOAL_STATUS } from '../../../core/models/goal.model';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import type { DailyScore } from '../../../core/models/daily-score.model';
import type { DailyTaskCompletion } from '../../../core/models/daily-task-completion.model';
import { DATE_LOCALE_CA } from '../../../core/constants/date-locale.const';

// Upper bound on the days one chart query builds, whatever range it is asked for.
const MAX_ALLOWED_CHART_DAYS = 90;

@Service()
export class DashboardEarningsService {
  private readonly db = inject(DbService);

  getPresetDateRange(preset: PeriodPreset): { startDate: string; endDate: string } {
    const today = new Date();
    const endDate = this.formatLocalDate(today);

    let days = 7;
    if (preset === 'last14') {
      days = 14;
    } else if (preset === 'last30') {
      days = 30;
    }

    // The range includes today.
    const startDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
    const startDate = this.formatLocalDate(startDateObj);

    return { startDate, endDate };
  }

  getDailyEarnings(startDate: string, endDate: string): Observable<DailyEarningsRecord[]> {
    return from(liveQuery(async () => await this.calculateDailyEarnings(startDate, endDate))).pipe(
      catchError((error) => {
        console.error('DashboardEarningsService.getDailyEarnings stream error:', error);
        return of([]);
      }),
    );
  }

  getMonthlyEarningsSummary(year: number, month: number): Observable<MonthlyEarningsSummary> {
    return from(liveQuery(async () => await this.calculateMonthlyEarningsSummary(year, month))).pipe(
      catchError((error) => {
        console.error('DashboardEarningsService.getMonthlyEarningsSummary stream error:', error);
        return of(this.getFallbackMonthlySummary(year, month));
      }),
    );
  }

  async calculateDailyEarnings(startDate: string, endDate: string): Promise<DailyEarningsRecord[]> {
    try {
      if (!startDate || !endDate || startDate > endDate) {
        return [];
      }

      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

      const current = new Date(startYear, startMonth - 1, startDay);
      const end = new Date(endYear, endMonth - 1, endDay);

      if (isNaN(current.getTime()) || isNaN(end.getTime())) {
        return [];
      }

      const [completedGoalsInRange, scoresInRange, completedSessionsInRange, taskCompletionsInRange] =
        await Promise.all([
          this.getCompletedGoalsInRange(startDate, endDate).catch((error: unknown) => {
            console.error('Failed to get completed goals in range:', error);
            return [] as Goal[];
          }),
          this.db.dailyScores
            .where('date')
            .between(startDate, endDate, true, true)
            .toArray()
            .catch((error: unknown) => {
              console.error('Failed to get daily scores in range:', error);
              return [] as DailyScore[];
            }),
          this.getCompletedPomodoroSessionsInRange(startDate, endDate).catch((error: unknown) => {
            console.error('Failed to get completed pomodoro sessions in range:', error);
            return [] as PomodoroSession[];
          }),
          this.db.dailyTaskCompletions
            .where('date')
            .between(startDate, endDate, true, true)
            .toArray()
            .catch((error: unknown) => {
              console.error('Failed to get daily task completions in range:', error);
              return [] as DailyTaskCompletion[];
            }),
        ]);

      const dateMap = new Map<string, DailyEarningsRecord>();
      let dayCount = 0;

      while (current <= end && dayCount < MAX_ALLOWED_CHART_DAYS) {
        const dateStr = this.formatLocalDate(current);
        dateMap.set(dateStr, {
          date: dateStr,
          totalEarned: 0,
          goalsEarned: 0,
          dailyTasksEarned: 0,
          pomodoroEarned: 0,
          dailyScoresEarned: 0,
        });
        current.setDate(current.getDate() + 1);
        dayCount++;
      }

      for (const goal of completedGoalsInRange) {
        if (goal.completedAt) {
          const dateStr = this.formatLocalDate(new Date(goal.completedAt));
          const record = dateMap.get(dateStr);
          if (record) {
            record.goalsEarned += goal.rewardValue;
            record.totalEarned += goal.rewardValue;
          }
        }
      }

      for (const score of scoresInRange) {
        const record = dateMap.get(score.date);
        if (record) {
          record.dailyScoresEarned += score.rewardEarned;
          record.totalEarned += score.rewardEarned;
        }
      }

      for (const session of completedSessionsInRange) {
        const sessionTimestamp = session.endTime ?? session.startTime;
        const dateStr = this.formatLocalDate(new Date(sessionTimestamp));
        const record = dateMap.get(dateStr);
        if (record && session.rewardEarned) {
          record.pomodoroEarned += session.rewardEarned;
          record.totalEarned += session.rewardEarned;
        }
      }

      for (const taskComp of taskCompletionsInRange) {
        const record = dateMap.get(taskComp.date);
        if (record) {
          record.dailyTasksEarned += taskComp.rewardEarned;
          record.totalEarned += taskComp.rewardEarned;
        }
      }

      return Array.from(dateMap.values());
    } catch (error) {
      console.error('Failed to calculate daily earnings:', error);
      return [];
    }
  }

  async calculateMonthlyEarningsSummary(year: number, month: number): Promise<MonthlyEarningsSummary> {
    try {
      if (!year || !month || month < 1 || month > 12) {
        return this.getFallbackMonthlySummary(year, month);
      }

      const formattedMonth = String(month).padStart(2, '0');
      // Day 0 of the next month is the last day of this one.
      const totalDaysInMonth = new Date(year, month, 0).getDate();
      const startDate = `${year}-${formattedMonth}-01`;
      const endDate = `${year}-${formattedMonth}-${String(totalDaysInMonth).padStart(2, '0')}`;

      const dateForLabel = new Date(year, month - 1, 1);
      const monthLabel = dateForLabel.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const dailyRecords = await this.calculateDailyEarnings(startDate, endDate);
      const totalEarned = dailyRecords.reduce((sum, r) => sum + r.totalEarned, 0);

      const now = new Date();
      const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;

      let daysCount = totalDaysInMonth;
      if (isCurrentMonth) {
        daysCount = Math.max(now.getDate(), 1);
      }

      const averageEarnedPerDay = daysCount > 0 ? Math.round(totalEarned / daysCount) : 0;

      return {
        year,
        month,
        monthLabel,
        totalEarned,
        daysCount,
        averageEarnedPerDay,
        isCurrentMonth,
      };
    } catch (error) {
      console.error('Failed to calculate monthly earnings summary:', error);
      return this.getFallbackMonthlySummary(year, month);
    }
  }

  private async getCompletedGoalsInRange(startDate: string, endDate: string): Promise<Goal[]> {
    try {
      const [startTimestamp, endTimestamp] = this.toTimestampRange(startDate, endDate);

      if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
        return [];
      }

      const goals = await this.db.goals
        .where('completedAt')
        .between(startTimestamp, endTimestamp, true, true)
        .toArray();

      return goals.filter((goal) => goal.status === GOAL_STATUS.COMPLETED);
    } catch (error) {
      console.error('Failed to get completed goals in range:', error);
      return [];
    }
  }

  private async getCompletedPomodoroSessionsInRange(startDate: string, endDate: string): Promise<PomodoroSession[]> {
    try {
      const [startTimestamp, endTimestamp] = this.toTimestampRange(startDate, endDate);

      if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
        return [];
      }

      const sessions = await this.db.pomodoroSessions
        .where('startTime')
        .between(startTimestamp, endTimestamp, true, true)
        .toArray();

      return sessions.filter((session) => session.status === PomodoroSessionStatus.COMPLETED);
    } catch (error) {
      console.error('Failed to get completed pomodoro sessions in range:', error);
      return [];
    }
  }

  private getFallbackMonthlySummary(year: number, month: number): MonthlyEarningsSummary {
    const validYear = !year || isNaN(year) || year <= 0 ? new Date().getFullYear() : year;
    const validMonth = !month || isNaN(month) || month < 1 || month > 12 ? new Date().getMonth() + 1 : month;
    const dateForLabel = new Date(validYear, validMonth - 1, 1);
    const monthLabel = dateForLabel.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const totalDaysInMonth = new Date(validYear, validMonth, 0).getDate() || 30;

    return {
      year: validYear,
      month: validMonth,
      monthLabel,
      totalEarned: 0,
      daysCount: totalDaysInMonth,
      averageEarnedPerDay: 0,
      isCurrentMonth: false,
    };
  }

  private formatLocalDate(date: Date): string {
    return date.toLocaleDateString(DATE_LOCALE_CA);
  }

  // Local-time bounds of a YYYY-MM-DD range: the start of its first day to the end of its last.
  private toTimestampRange(startDate: string, endDate: string): [number, number] {
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    return [
      new Date(startYear, startMonth - 1, startDay).getTime(),
      new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999).getTime(),
    ];
  }
}
