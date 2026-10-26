import { Service, inject } from '@angular/core';
import { DbService } from '../../../database/db.service';
import type { DailyScore } from '../../../core/models/daily-score.model';
import type { Observable } from 'rxjs';
import { from, of } from 'rxjs';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
import { DATE_LOCALE_CA } from '../../../core/constants/date-locale.const';
import { getPresetDateRange } from '../../../shared/components/period-filter/preset-date-range';
import {
  MAX_STREAK_BONUS,
  REWARD_GOOD,
  REWARD_PERFECT,
  SCORE_GOOD,
  SCORE_PERFECT,
  STREAK_BONUS_STEP,
} from '../constants/daily-score-reward.const';

@Service()
export class DailyScoresService {
  private db = inject(DbService);

  getScore(date: string): Observable<DailyScore | undefined> {
    return from(this.db.dailyScores.get(date));
  }

  getCurrentMonthScores(): Observable<DailyScore[]> {
    const today = new Date();
    const formattedMonth = String(today.getMonth() + 1).padStart(2, '0');
    const startStr = `${today.getFullYear()}-${formattedMonth}-01`;
    const endStr = `${today.getFullYear()}-${formattedMonth}-31`;

    return from(this.db.dailyScores.where('date').between(startStr, endStr, true, true).toArray());
  }

  getScoresInRange(startDate: string, endDate: string): Observable<DailyScore[]> {
    if (!startDate || !endDate || startDate > endDate) {
      return of([]);
    }

    return from(this.db.dailyScores.where('date').between(startDate, endDate, true, true).toArray());
  }

  getLast7DaysScores(): Observable<DailyScore[]> {
    const { startDate, endDate } = getPresetDateRange('last7');
    return this.getScoresInRange(startDate, endDate);
  }

  getTodayScore(): Observable<DailyScore | undefined> {
    const today = new Date().toLocaleDateString(DATE_LOCALE_CA);
    return this.getScore(today);
  }

  async saveTodayScore(score: number): Promise<{ reward: number; newStreak: number }> {
    try {
      const today = new Date();
      const todayStr = today.toLocaleDateString(DATE_LOCALE_CA);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString(DATE_LOCALE_CA);

      const yesterdayScore = await this.db.dailyScores.get(yesterdayStr);
      const previousStreak = yesterdayScore ? yesterdayScore.streakAtThisDay : 0;

      let baseReward = 0;
      let newStreak = 0;

      if (score >= SCORE_GOOD) {
        baseReward = score === SCORE_PERFECT ? REWARD_PERFECT : REWARD_GOOD;
        newStreak = previousStreak + 1;
      }

      const bonusMultiplier = Math.min(previousStreak * STREAK_BONUS_STEP, MAX_STREAK_BONUS);
      const rewardEarned = baseReward > 0 ? Math.round(baseReward * (1 + bonusMultiplier)) : 0;

      const newScore: DailyScore = {
        date: todayStr,
        score: score,
        rewardEarned: rewardEarned,
        streakAtThisDay: newStreak,
        createdAt: Date.now(),
      };

      await this.db.transaction('rw', this.db.dailyScores, this.db.users, async () => {
        await this.db.dailyScores.add(newScore);

        if (rewardEarned > 0) {
          const user = await this.db.users.get(CURRENT_USER_ID);
          if (user) {
            await this.db.users.update(CURRENT_USER_ID, { balance: user.balance + rewardEarned });
          } else {
            throw new Error('User not found when attempting to add reward.');
          }
        }
      });

      return { reward: rewardEarned, newStreak };
    } catch (error) {
      console.error('Failed to save daily score:', error);
      throw error;
    }
  }
}
