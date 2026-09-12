import { Service, inject } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { liveQuery } from 'dexie';
import { DbService } from '../../../core/services/db.service';
import { DailyEarningsRecord } from '../models/daily-earnings-record.model';
import { MonthlyEarningsSummary } from '../models/monthly-earnings-summary.model';
import { PeriodPreset } from '../models/period-preset.type';
import { Goal, GOAL_STATUS } from '../../goals/models/goal.model';
import { PomodoroSession } from '../../pomodoro/models/pomodoro-session.model';
import { PomodoroSessionStatus } from '../../pomodoro/models/pomodoro-session-status.enum';
import { DailyScore } from '../../daily-scores/models/daily-score.model';
import { DailyTaskCompletion } from '../../daily-tasks/models/daily-task-completion.model';

const DATE_LOCALE_US = 'en-US';
const PRESET_OFFSET_7_DAYS = 6;
const PRESET_OFFSET_14_DAYS = 13;
const PRESET_OFFSET_30_DAYS = 29;
const ZERO_AMOUNT = 0;
const PAD_LENGTH_TWO = 2;
const PAD_CHAR_ZERO = '0';
const FIRST_DAY_OF_MONTH = 1;
const MONTH_OFFSET_ONE = 1;
const MONTH_DECEMBER = 12;
const LAST_DAY_OF_PREVIOUS_MONTH = 0;
const MAX_ALLOWED_CHART_DAYS = 90;
const CALENDAR_DAY_STEP = 1;
const END_OF_DAY_HOURS = 23;
const END_OF_DAY_MINUTES = 59;
const END_OF_DAY_SECONDS = 59;
const END_OF_DAY_MILLISECONDS = 999;
const START_OF_DAY_HOURS = 0;
const START_OF_DAY_MINUTES = 0;
const START_OF_DAY_SECONDS = 0;
const START_OF_DAY_MILLISECONDS = 0;

@Service()
export class DashboardEarningsService {
  private readonly db = inject(DbService);

  getPresetDateRange(preset: PeriodPreset): { startDate: string; endDate: string } {
    const today = new Date();
    const endDate = this.formatLocalDate(today);

    let offsetDays = PRESET_OFFSET_7_DAYS;
    if (preset === 'last14') {
      offsetDays = PRESET_OFFSET_14_DAYS;
    } else if (preset === 'last30') {
      offsetDays = PRESET_OFFSET_30_DAYS;
    }

    const startDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offsetDays);
    const startDate = this.formatLocalDate(startDateObj);

    return { startDate, endDate };
  }

  getDailyEarnings(startDate: string, endDate: string): Observable<DailyEarningsRecord[]> {
    return from(liveQuery(async () => await this.calculateDailyEarnings(startDate, endDate))).pipe(
      catchError(error => {
        console.error('DashboardEarningsService.getDailyEarnings stream error:', error);
        return of([]);
      })
    );
  }

  getMonthlyEarningsSummary(year: number, month: number): Observable<MonthlyEarningsSummary> {
    return from(liveQuery(async () => await this.calculateMonthlyEarningsSummary(year, month))).pipe(
      catchError(error => {
        console.error('DashboardEarningsService.getMonthlyEarningsSummary stream error:', error);
        return of(this.getFallbackMonthlySummary(year, month));
      })
    );
  }

  async calculateDailyEarnings(startDate: string, endDate: string): Promise<DailyEarningsRecord[]> {
    try {
      if (!startDate || !endDate || startDate > endDate) {
        return [];
      }

      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

      const current = new Date(startYear, startMonth - MONTH_OFFSET_ONE, startDay);
      const end = new Date(endYear, endMonth - MONTH_OFFSET_ONE, endDay);

      if (isNaN(current.getTime()) || isNaN(end.getTime())) {
        return [];
      }

      const [completedGoalsInRange, scoresInRange, completedSessionsInRange, taskCompletionsInRange] = await Promise.all([
        this.getCompletedGoalsInRange(startDate, endDate).catch(error => {
          console.error('Failed to get completed goals in range:', error);
          return [] as Goal[];
        }),
        this.db.dailyScores
          .where('date')
          .between(startDate, endDate, true, true)
          .toArray()
          .catch(error => {
            console.error('Failed to get daily scores in range:', error);
            return [] as DailyScore[];
          }),
        this.getCompletedPomodoroSessionsInRange(startDate, endDate).catch(error => {
          console.error('Failed to get completed pomodoro sessions in range:', error);
          return [] as PomodoroSession[];
        }),
        this.db.dailyTaskCompletions
          .where('date')
          .between(startDate, endDate, true, true)
          .toArray()
          .catch(error => {
            console.error('Failed to get daily task completions in range:', error);
            return [] as DailyTaskCompletion[];
          }),
      ]);

      const dateMap = new Map<string, DailyEarningsRecord>();
      let dayCount = ZERO_AMOUNT;

      while (current <= end && dayCount < MAX_ALLOWED_CHART_DAYS) {
        const dateStr = this.formatLocalDate(current);
        dateMap.set(dateStr, {
          date: dateStr,
          totalEarned: ZERO_AMOUNT,
          goalsEarned: ZERO_AMOUNT,
          dailyTasksEarned: ZERO_AMOUNT,
          pomodoroEarned: ZERO_AMOUNT,
          dailyScoresEarned: ZERO_AMOUNT,
        });
        current.setDate(current.getDate() + CALENDAR_DAY_STEP);
        dayCount += CALENDAR_DAY_STEP;
      }

      for (const goal of completedGoalsInRange ?? []) {
        if (goal.completedAt) {
          const dateStr = this.formatLocalDate(new Date(goal.completedAt));
          const record = dateMap.get(dateStr);
          if (record) {
            record.goalsEarned += goal.rewardValue;
            record.totalEarned += goal.rewardValue;
          }
        }
      }

      for (const score of scoresInRange ?? []) {
        const record = dateMap.get(score.date);
        if (record) {
          record.dailyScoresEarned += score.rewardEarned;
          record.totalEarned += score.rewardEarned;
        }
      }

      for (const session of completedSessionsInRange ?? []) {
        const sessionTimestamp = session.endTime ?? session.startTime;
        const dateStr = this.formatLocalDate(new Date(sessionTimestamp));
        const record = dateMap.get(dateStr);
        if (record && session.rewardEarned) {
          record.pomodoroEarned += session.rewardEarned;
          record.totalEarned += session.rewardEarned;
        }
      }

      for (const taskComp of taskCompletionsInRange ?? []) {
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
      if (!year || !month || month < MONTH_OFFSET_ONE || month > MONTH_DECEMBER) {
        return this.getFallbackMonthlySummary(year, month);
      }

      const formattedMonth = String(month).padStart(PAD_LENGTH_TWO, PAD_CHAR_ZERO);
      const totalDaysInMonth = new Date(year, month, LAST_DAY_OF_PREVIOUS_MONTH).getDate();
      const startDate = `${year}-${formattedMonth}-01`;
      const endDate = `${year}-${formattedMonth}-${String(totalDaysInMonth).padStart(PAD_LENGTH_TWO, PAD_CHAR_ZERO)}`;

      const dateForLabel = new Date(year, month - MONTH_OFFSET_ONE, FIRST_DAY_OF_MONTH);
      const monthLabel = dateForLabel.toLocaleDateString(DATE_LOCALE_US, { month: 'long', year: 'numeric' });

      const dailyRecords = await this.calculateDailyEarnings(startDate, endDate);
      const totalEarned = (dailyRecords ?? []).reduce((sum, r) => sum + (r.totalEarned ?? ZERO_AMOUNT), ZERO_AMOUNT);

      const now = new Date();
      const isCurrentMonth = now.getFullYear() === year && now.getMonth() + MONTH_OFFSET_ONE === month;

      let daysCount = totalDaysInMonth;
      if (isCurrentMonth) {
        daysCount = Math.max(now.getDate(), FIRST_DAY_OF_MONTH);
      }

      const averageEarnedPerDay = daysCount > ZERO_AMOUNT ? Math.round(totalEarned / daysCount) : ZERO_AMOUNT;

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
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

      const startTimestamp = new Date(
        startYear,
        startMonth - MONTH_OFFSET_ONE,
        startDay,
        START_OF_DAY_HOURS,
        START_OF_DAY_MINUTES,
        START_OF_DAY_SECONDS,
        START_OF_DAY_MILLISECONDS
      ).getTime();

      const endTimestamp = new Date(
        endYear,
        endMonth - MONTH_OFFSET_ONE,
        endDay,
        END_OF_DAY_HOURS,
        END_OF_DAY_MINUTES,
        END_OF_DAY_SECONDS,
        END_OF_DAY_MILLISECONDS
      ).getTime();

      if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
        return [];
      }

      const goals = await this.db.goals
        .where('completedAt')
        .between(startTimestamp, endTimestamp, true, true)
        .toArray();

      return (goals ?? []).filter(goal => goal?.status === GOAL_STATUS.COMPLETED);
    } catch (error) {
      console.error('Failed to get completed goals in range:', error);
      return [];
    }
  }

  private async getCompletedPomodoroSessionsInRange(startDate: string, endDate: string): Promise<PomodoroSession[]> {
    try {
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

      const startTimestamp = new Date(
        startYear,
        startMonth - MONTH_OFFSET_ONE,
        startDay,
        START_OF_DAY_HOURS,
        START_OF_DAY_MINUTES,
        START_OF_DAY_SECONDS,
        START_OF_DAY_MILLISECONDS
      ).getTime();

      const endTimestamp = new Date(
        endYear,
        endMonth - MONTH_OFFSET_ONE,
        endDay,
        END_OF_DAY_HOURS,
        END_OF_DAY_MINUTES,
        END_OF_DAY_SECONDS,
        END_OF_DAY_MILLISECONDS
      ).getTime();

      if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
        return [];
      }

      const sessions = await this.db.pomodoroSessions
        .where('startTime')
        .between(startTimestamp, endTimestamp, true, true)
        .toArray();

      return (sessions ?? []).filter(session => session?.status === PomodoroSessionStatus.COMPLETED);
    } catch (error) {
      console.error('Failed to get completed pomodoro sessions in range:', error);
      return [];
    }
  }

  private getFallbackMonthlySummary(year: number, month: number): MonthlyEarningsSummary {
    const validYear = !year || isNaN(year) || year <= ZERO_AMOUNT ? new Date().getFullYear() : year;
    const validMonth =
      !month || isNaN(month) || month < MONTH_OFFSET_ONE || month > MONTH_DECEMBER
        ? new Date().getMonth() + MONTH_OFFSET_ONE
        : month;
    const dateForLabel = new Date(validYear, validMonth - MONTH_OFFSET_ONE, FIRST_DAY_OF_MONTH);
    const monthLabel = dateForLabel.toLocaleDateString(DATE_LOCALE_US, { month: 'long', year: 'numeric' });
    const totalDaysInMonth = new Date(validYear, validMonth, LAST_DAY_OF_PREVIOUS_MONTH).getDate() || 30;

    return {
      year: validYear,
      month: validMonth,
      monthLabel,
      totalEarned: ZERO_AMOUNT,
      daysCount: totalDaysInMonth,
      averageEarnedPerDay: ZERO_AMOUNT,
      isCurrentMonth: false,
    };
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + MONTH_OFFSET_ONE).padStart(PAD_LENGTH_TWO, PAD_CHAR_ZERO);
    const day = String(date.getDate()).padStart(PAD_LENGTH_TWO, PAD_CHAR_ZERO);
    return `${year}-${month}-${day}`;
  }
}
