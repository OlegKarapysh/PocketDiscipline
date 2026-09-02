import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { DbService } from '../../../core/services/db.service';
import { DailyEarningsRecord } from '../models/daily-earnings-record.model';
import { MonthlyEarningsSummary } from '../models/monthly-earnings-summary.model';
import { PeriodPreset } from '../models/period-preset.type';
import { GOAL_STATUS } from '../../goals/models/goal.model';

const DATE_LOCALE_CA = 'en-CA';
const DATE_LOCALE_US = 'en-US';
const MILLISECONDS_PER_DAY = 86_400_000;
const PRESET_OFFSET_7_DAYS = 6;
const PRESET_OFFSET_14_DAYS = 13;
const PRESET_OFFSET_30_DAYS = 29;
const POMODORO_STATUS_COMPLETED = 'completed';
const ZERO_AMOUNT = 0;
const PAD_LENGTH_TWO = 2;
const PAD_CHAR_ZERO = '0';
const FIRST_DAY_OF_MONTH = 1;
const MONTH_OFFSET_ONE = 1;
const DAYS_THRESHOLD_INCLUSIVE = 1;

@Injectable({
  providedIn: 'root'
})
export class DashboardEarningsService {
  private db = inject(DbService);

  getPresetDateRange(preset: PeriodPreset): { startDate: string; endDate: string } {
    const today = new Date();
    const endDate = today.toLocaleDateString(DATE_LOCALE_CA);

    let offsetDays = PRESET_OFFSET_7_DAYS;
    if (preset === 'last14') {
      offsetDays = PRESET_OFFSET_14_DAYS;
    } else if (preset === 'last30') {
      offsetDays = PRESET_OFFSET_30_DAYS;
    }

    const startDateObj = new Date(today.getTime() - offsetDays * MILLISECONDS_PER_DAY);
    const startDate = startDateObj.toLocaleDateString(DATE_LOCALE_CA);

    return { startDate, endDate };
  }

  getDailyEarnings(startDate: string, endDate: string): Observable<DailyEarningsRecord[]> {
    return from(this.calculateDailyEarnings(startDate, endDate));
  }

  getMonthlyEarningsSummary(year: number, month: number): Observable<MonthlyEarningsSummary> {
    return from(this.calculateMonthlyEarningsSummary(year, month));
  }

  async calculateDailyEarnings(startDate: string, endDate: string): Promise<DailyEarningsRecord[]> {
    const [allCompletedGoals, scoresInRange, allCompletedSessions, taskCompletionsInRange] = await Promise.all([
      this.db.goals.where('status').equals(GOAL_STATUS.COMPLETED).toArray(),
      this.db.dailyScores.where('date').between(startDate, endDate, true, true).toArray(),
      this.db.pomodoroSessions.where('status').equals(POMODORO_STATUS_COMPLETED).toArray(),
      this.db.dailyTaskCompletions.where('date').between(startDate, endDate, true, true).toArray(),
    ]);

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const dayDifference = Math.round((end.getTime() - start.getTime()) / MILLISECONDS_PER_DAY) + DAYS_THRESHOLD_INCLUSIVE;

    const dateMap = new Map<string, DailyEarningsRecord>();
    for (let i = 0; i < dayDifference; i++) {
      const current = new Date(start.getTime() + i * MILLISECONDS_PER_DAY);
      const dateStr = current.toLocaleDateString(DATE_LOCALE_CA);
      dateMap.set(dateStr, {
        date: dateStr,
        totalEarned: ZERO_AMOUNT,
        goalsEarned: ZERO_AMOUNT,
        dailyTasksEarned: ZERO_AMOUNT,
        pomodoroEarned: ZERO_AMOUNT,
        dailyScoresEarned: ZERO_AMOUNT,
      });
    }

    for (const goal of allCompletedGoals) {
      if (goal.completedAt) {
        const dateStr = new Date(goal.completedAt).toLocaleDateString(DATE_LOCALE_CA);
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

    for (const session of allCompletedSessions) {
      const sessionTimestamp = session.endTime || session.startTime;
      const dateStr = new Date(sessionTimestamp).toLocaleDateString(DATE_LOCALE_CA);
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
  }

  async calculateMonthlyEarningsSummary(year: number, month: number): Promise<MonthlyEarningsSummary> {
    const formattedMonth = String(month).padStart(PAD_LENGTH_TWO, PAD_CHAR_ZERO);
    const totalDaysInMonth = new Date(year, month, ZERO_AMOUNT).getDate();
    const startDate = `${year}-${formattedMonth}-01`;
    const endDate = `${year}-${formattedMonth}-${String(totalDaysInMonth).padStart(PAD_LENGTH_TWO, PAD_CHAR_ZERO)}`;

    const dateForLabel = new Date(year, month - MONTH_OFFSET_ONE, FIRST_DAY_OF_MONTH);
    const monthLabel = dateForLabel.toLocaleDateString(DATE_LOCALE_US, { month: 'long', year: 'numeric' });

    const [allCompletedGoals, scoresInRange, allCompletedSessions, taskCompletionsInRange] = await Promise.all([
      this.db.goals.where('status').equals(GOAL_STATUS.COMPLETED).toArray(),
      this.db.dailyScores.where('date').between(startDate, endDate, true, true).toArray(),
      this.db.pomodoroSessions.where('status').equals(POMODORO_STATUS_COMPLETED).toArray(),
      this.db.dailyTaskCompletions.where('date').between(startDate, endDate, true, true).toArray(),
    ]);

    let totalEarned = ZERO_AMOUNT;

    for (const goal of allCompletedGoals) {
      if (goal.completedAt) {
        const dateStr = new Date(goal.completedAt).toLocaleDateString(DATE_LOCALE_CA);
        if (dateStr >= startDate && dateStr <= endDate) {
          totalEarned += goal.rewardValue;
        }
      }
    }

    for (const score of scoresInRange) {
      totalEarned += score.rewardEarned;
    }

    for (const session of allCompletedSessions) {
      const sessionTimestamp = session.endTime || session.startTime;
      const dateStr = new Date(sessionTimestamp).toLocaleDateString(DATE_LOCALE_CA);
      if (dateStr >= startDate && dateStr <= endDate && session.rewardEarned) {
        totalEarned += session.rewardEarned;
      }
    }

    for (const taskComp of taskCompletionsInRange) {
      totalEarned += taskComp.rewardEarned;
    }

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
  }
}
