import { Service, inject } from '@angular/core';
import { DATE_LOCALE_CA } from '../../../core/constants/date-locale.const';
import type { DailyScore } from '../../../core/models/daily-score.model';
import { DbService } from '../../../database/db.service';
import {
  MAX_STREAK_BONUS,
  REWARD_GOOD,
  REWARD_PERFECT,
  SCORE_GOOD,
  SCORE_PERFECT,
  STREAK_BONUS_STEP,
} from '../constants/daily-score-reward.const';
import type { TelegramExportParseResult } from '../models/telegram-export-parse-result.model';
import type { TelegramImportPreview } from '../models/telegram-import-preview.model';
import type { TelegramImportResult } from '../models/telegram-import-result.model';

@Service()
export class TelegramScoresImportService {
  private readonly db = inject(DbService);

  async preview(parsed: TelegramExportParseResult): Promise<TelegramImportPreview> {
    const existing = await this.db.dailyScores.toArray();
    const plan = this.planImport(parsed, existing);
    const totalScores = parsed.scores.length;
    const sum = parsed.scores.reduce((acc, row) => acc + row.score, 0);
    const highScores = parsed.scores.filter((row) => row.score >= SCORE_GOOD).length;
    const times = parsed.scores.map((row) => row.createdAt);

    return {
      totalScores,
      newScores: totalScores - plan.replaced,
      replacedScores: plan.replaced,
      highScores,
      averageScore: Math.round((sum / totalScores) * 10) / 10,
      resultingStreak: plan.resultingStreak,
      startDate: Math.min(...times),
      endDate: Math.max(...times),
      duplicateDates: parsed.duplicateDates,
      skippedMessages: parsed.skippedMessages,
    };
  }

  async import(parsed: TelegramExportParseResult): Promise<TelegramImportResult> {
    return this.db.transaction('rw', [this.db.dailyScores], async () => {
      const existing = await this.db.dailyScores.toArray();
      const plan = this.planImport(parsed, existing);

      await this.db.dailyScores.bulkPut(plan.rowsToWrite);

      return {
        imported: parsed.scores.length,
        replaced: plan.replaced,
        skipped: parsed.skippedMessages.length + parsed.duplicateDates,
        resultingStreak: plan.resultingStreak,
      };
    });
  }

  private planImport(
    parsed: TelegramExportParseResult,
    existing: DailyScore[],
  ): { rowsToWrite: DailyScore[]; replaced: number; resultingStreak: number } {
    const merged = new Map(existing.map((score) => [score.date, score]));
    const importedDates = new Set<string>();
    let replaced = 0;

    for (const row of parsed.scores) {
      if (merged.has(row.date)) replaced++;
      importedDates.add(row.date);
      merged.set(row.date, {
        date: row.date,
        score: row.score,
        rewardEarned: 0,
        streakAtThisDay: 0,
        createdAt: row.createdAt,
      });
    }

    const rowsToWrite: DailyScore[] = [];
    for (const date of [...merged.keys()].sort()) {
      const day = merged.get(date);
      if (!day) continue;

      const before = this.dayBefore(date);
      const previousStreak = merged.get(before)?.streakAtThisDay ?? 0;
      const streakAtThisDay = day.score >= SCORE_GOOD ? previousStreak + 1 : 0;

      if (importedDates.has(date)) {
        const rewardEarned = this.rewardFor(day.score, previousStreak);
        const updated: DailyScore = { ...day, rewardEarned, streakAtThisDay };
        merged.set(date, updated);
        rowsToWrite.push(updated);
      } else if (streakAtThisDay !== day.streakAtThisDay) {
        const updated: DailyScore = { ...day, streakAtThisDay };
        merged.set(date, updated);
        rowsToWrite.push(updated);
      }
    }

    return {
      rowsToWrite,
      replaced,
      resultingStreak: this.activeStreak(merged),
    };
  }

  private rewardFor(score: number, previousStreak: number): number {
    if (score < SCORE_GOOD) return 0;
    const baseReward = score === SCORE_PERFECT ? REWARD_PERFECT : REWARD_GOOD;
    const bonusMultiplier = Math.min(previousStreak * STREAK_BONUS_STEP, MAX_STREAK_BONUS);
    return Math.round(baseReward * (1 + bonusMultiplier));
  }

  private activeStreak(scores: Map<string, DailyScore>): number {
    const dates = [...scores.keys()].sort();
    const latestDate = dates[dates.length - 1];
    if (!latestDate) return 0;

    return scores.get(latestDate)?.streakAtThisDay ?? 0;
  }

  private dayBefore(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day - 1).toLocaleDateString(DATE_LOCALE_CA);
  }
}
