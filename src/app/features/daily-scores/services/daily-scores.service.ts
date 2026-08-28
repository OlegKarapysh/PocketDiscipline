import { Injectable, inject } from '@angular/core';
import { DbService } from '../../../core/services/db.service';
import { DailyScore } from '../models/daily-score.model';
import { Observable, from } from 'rxjs';

const REWARD_PERFECT = 500;
const REWARD_GOOD = 100;
const SCORE_PERFECT = 10;
const SCORE_GOOD = 9;
const MAX_STREAK_BONUS = 1.0;
const STREAK_BONUS_STEP = 0.10;
const DEFAULT_USER_ID = 1;

@Injectable({
  providedIn: 'root'
})
export class DailyScoresService {
  private db = inject(DbService);

  // Get score for a specific date (YYYY-MM-DD)
  getScore(date: string): Observable<DailyScore | undefined> {
    return from(this.db.dailyScores.get(date));
  }

  // Get scores for the current month
  getCurrentMonthScores(): Observable<DailyScore[]> {
    const today = new Date();
    const startStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    const endStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-31`;
    
    return from(this.db.dailyScores.where('date').between(startStr, endStr, true, true).toArray());
  }

  // Get scores for the last 7 days
  getLast7DaysScores(): Observable<DailyScore[]> {
    const today = new Date();
    const endDate = today.toLocaleDateString('en-CA');
    
    const start = new Date();
    start.setDate(today.getDate() - 6);
    const startDate = start.toLocaleDateString('en-CA');
    
    return from(this.db.dailyScores.where('date').between(startDate, endDate, true, true).toArray());
  }

  // Get today's score
  getTodayScore(): Observable<DailyScore | undefined> {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time
    return this.getScore(today);
  }

  // Save score for today
  async saveTodayScore(score: number): Promise<{ reward: number, newStreak: number }> {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    
    // Find yesterday's score to determine streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');
    
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
      createdAt: Date.now()
    };
    
    await this.db.transaction('rw', this.db.dailyScores, this.db.users, async () => {
      await this.db.dailyScores.add(newScore);
      
      if (rewardEarned > 0) {
        const user = await this.db.users.get(DEFAULT_USER_ID);
        if (user) {
          await this.db.users.update(DEFAULT_USER_ID, { balance: user.balance + rewardEarned });
        } else {
          throw new Error('User not found when attempting to add reward.');
        }
      }
    });

    return { reward: rewardEarned, newStreak };
  }
}
