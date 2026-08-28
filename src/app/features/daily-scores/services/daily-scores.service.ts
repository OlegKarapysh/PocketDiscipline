import { Injectable, inject } from '@angular/core';
import { DbService } from '../../../core/services/db.service';
import { DailyScore } from '../models/daily-score.model';
import { Observable, from } from 'rxjs';
import { CURRENT_USER_ID } from '../../../core/services/user.service';

const REWARD_PERFECT = 500;
const REWARD_GOOD = 100;
const NO_REWARD = 0;
const SCORE_PERFECT = 10;
const SCORE_GOOD = 9;
const MAX_STREAK_BONUS = 1.0;
const STREAK_BONUS_STEP = 0.10;
const DAYS_IN_WEEK_OFFSET = 6;
const YESTERDAY_OFFSET = 1;
const INITIAL_STREAK = 0;
const STREAK_INCREMENT = 1;
const DATE_LOCALE_CA = 'en-CA';
const TRANSACTION_READ_WRITE = 'rw';
const MONTH_START_DAY = '01';
const MONTH_END_DAY = '31';
const ERROR_USER_NOT_FOUND = 'User not found when attempting to add reward.';

@Injectable({
  providedIn: 'root'
})
export class DailyScoresService {
  private db = inject(DbService);

  getScore(date: string): Observable<DailyScore | undefined> {
    return from(this.db.dailyScores.get(date));
  }

  getCurrentMonthScores(): Observable<DailyScore[]> {
    const today = new Date();
    const formattedMonth = String(today.getMonth() + 1).padStart(2, '0');
    const startStr = `${today.getFullYear()}-${formattedMonth}-${MONTH_START_DAY}`;
    const endStr = `${today.getFullYear()}-${formattedMonth}-${MONTH_END_DAY}`;

    return from(this.db.dailyScores.where('date').between(startStr, endStr, true, true).toArray());
  }

  getLast7DaysScores(): Observable<DailyScore[]> {
    const today = new Date();
    const endDate = today.toLocaleDateString(DATE_LOCALE_CA);

    const start = new Date();
    start.setDate(today.getDate() - DAYS_IN_WEEK_OFFSET);
    const startDate = start.toLocaleDateString(DATE_LOCALE_CA);

    return from(this.db.dailyScores.where('date').between(startDate, endDate, true, true).toArray());
  }

  getTodayScore(): Observable<DailyScore | undefined> {
    const today = new Date().toLocaleDateString(DATE_LOCALE_CA);
    return this.getScore(today);
  }

  async saveTodayScore(score: number): Promise<{ reward: number, newStreak: number }> {
    const today = new Date();
    const todayStr = today.toLocaleDateString(DATE_LOCALE_CA);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - YESTERDAY_OFFSET);
    const yesterdayStr = yesterday.toLocaleDateString(DATE_LOCALE_CA);

    const yesterdayScore = await this.db.dailyScores.get(yesterdayStr);
    const previousStreak = yesterdayScore ? yesterdayScore.streakAtThisDay : INITIAL_STREAK;

    let baseReward = NO_REWARD;
    let newStreak = INITIAL_STREAK;

    if (score >= SCORE_GOOD) {
      baseReward = score === SCORE_PERFECT ? REWARD_PERFECT : REWARD_GOOD;
      newStreak = previousStreak + STREAK_INCREMENT;
    }

    const bonusMultiplier = Math.min(previousStreak * STREAK_BONUS_STEP, MAX_STREAK_BONUS);
    const rewardEarned = baseReward > NO_REWARD ? Math.round(baseReward * (1 + bonusMultiplier)) : NO_REWARD;

    const newScore: DailyScore = {
      date: todayStr,
      score: score,
      rewardEarned: rewardEarned,
      streakAtThisDay: newStreak,
      createdAt: Date.now()
    };

    await this.db.transaction(TRANSACTION_READ_WRITE, this.db.dailyScores, this.db.users, async () => {
      await this.db.dailyScores.add(newScore);

      if (rewardEarned > NO_REWARD) {
        const user = await this.db.users.get(CURRENT_USER_ID);
        if (user) {
          await this.db.users.update(CURRENT_USER_ID, { balance: user.balance + rewardEarned });
        } else {
          throw new Error(ERROR_USER_NOT_FOUND);
        }
      }
    });

    return { reward: rewardEarned, newStreak };
  }
}
