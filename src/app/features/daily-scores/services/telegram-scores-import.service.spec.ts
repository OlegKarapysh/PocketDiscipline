import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DailyScore } from '../../../core/models/daily-score.model';
import type { User } from '../../../core/models/user.model';
import { DbService } from '../../../database/db.service';
import { TelegramScoresImportService } from './telegram-scores-import.service';
import { TelegramScoresParserService } from './telegram-scores-parser.service';

class FakeScoresTable {
  readonly rows = new Map<string, DailyScore>();

  toArray(): Promise<DailyScore[]> {
    return Promise.resolve([...this.rows.values()]);
  }

  bulkPut(scores: DailyScore[]): Promise<void> {
    for (const score of scores) {
      this.rows.set(score.date, structuredClone(score));
    }
    return Promise.resolve();
  }

  all(): DailyScore[] {
    return [...this.rows.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
}

describe('TelegramScoresImportService', () => {
  let service: TelegramScoresImportService;
  let parser: TelegramScoresParserService;
  let db: {
    users: { rows: User[] };
    dailyScores: FakeScoresTable;
    transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    db = {
      users: { rows: [{ id: 1, name: 'Current', balance: 2500, createdAt: 0, updatedAt: 0 }] },
      dailyScores: new FakeScoresTable(),
      transaction: vi.fn(async (_mode: string, _tables: unknown[], work: () => Promise<unknown>) => {
        const snapshot = new Map(db.dailyScores.rows);
        try {
          return await work();
        } catch (err) {
          db.dailyScores.rows.clear();
          for (const [k, v] of snapshot) db.dailyScores.rows.set(k, v);
          throw err;
        }
      }),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: DbService, useValue: db }],
    });

    service = TestBed.inject(TelegramScoresImportService);
    parser = TestBed.inject(TelegramScoresParserService);
  });

  const exportJson = (entries: [string, string][]) =>
    JSON.stringify({
      messages: entries.map(([date, text], index) => ({
        id: index + 1,
        type: 'message',
        date,
        text,
      })),
    });

  it('previews new and replaced scores, average score, and resulting high-score streak', async () => {
    await db.dailyScores.bulkPut([
      { date: '2026-09-02', score: 6, rewardEarned: 0, streakAtThisDay: 0, createdAt: 100 },
    ]);

    const parsed = parser.parse(
      exportJson([
        ['2026-09-01T22:00:00', '8/10'],
        ['2026-09-02T22:00:00', '9/10'],
        ['2026-09-03T22:00:00', '10/10'],
        ['2026-09-04T22:00:00', '9/10'],
      ]),
    );

    const preview = await service.preview(parsed);

    expect(preview).toMatchObject({
      totalScores: 4,
      newScores: 3,
      replacedScores: 1,
      highScores: 3,
      averageScore: 9,
      resultingStreak: 3,
      duplicateDates: 0,
      skippedMessages: [],
    });
  });

  it('replaces overlapping existing scores, computes streak bonuses, and never modifies user balance', async () => {
    await db.dailyScores.bulkPut([
      { date: '2026-08-31', score: 9, rewardEarned: 100, streakAtThisDay: 1, createdAt: 10 },
      { date: '2026-09-02', score: 5, rewardEarned: 0, streakAtThisDay: 0, createdAt: 20 },
      { date: '2026-09-04', score: 10, rewardEarned: 500, streakAtThisDay: 1, createdAt: 30 },
    ]);

    const parsed = parser.parse(
      exportJson([
        ['2026-09-01T22:00:00', '10/10'],
        ['2026-09-02T22:00:00', '9/10'],
        ['2026-09-03T22:00:00', '10/10'],
      ]),
    );

    const result = await service.import(parsed);

    expect(result).toEqual({
      imported: 3,
      replaced: 1,
      skipped: 0,
      resultingStreak: 5,
    });
    expect(db.users.rows[0].balance).toBe(2500);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.transaction.mock.calls[0][1]).toEqual([db.dailyScores]);

    expect(
      db.dailyScores
        .all()
        .map(({ date, score, rewardEarned, streakAtThisDay }) => [date, score, rewardEarned, streakAtThisDay]),
    ).toEqual([
      ['2026-08-31', 9, 100, 1],
      ['2026-09-01', 10, 550, 2],
      ['2026-09-02', 9, 120, 3],
      ['2026-09-03', 10, 650, 4],
      ['2026-09-04', 10, 500, 5],
    ]);
  });

  it('resets the streak when a score is below 9 or when a calendar day is missing', async () => {
    const parsed = parser.parse(
      exportJson([
        ['2026-09-01T22:00:00', '9/10'],
        ['2026-09-02T22:00:00', '8/10'],
        ['2026-09-03T22:00:00', '10/10'],
        // 2026-09-04 is missing
        ['2026-09-05T22:00:00', '9/10'],
        ['2026-09-06T22:00:00', '10/10'],
      ]),
    );

    const result = await service.import(parsed);

    expect(result.resultingStreak).toBe(2);
    expect(db.dailyScores.all().map((row) => [row.date, row.streakAtThisDay, row.rewardEarned])).toEqual([
      ['2026-09-01', 1, 100],
      ['2026-09-02', 0, 0],
      ['2026-09-03', 1, 500],
      ['2026-09-05', 1, 100],
      ['2026-09-06', 2, 550],
    ]);
  });

  it('caps the streak bonus at +100% after 10 consecutive high-score days and counts duplicates + skipped messages', async () => {
    const entries: [string, string][] = Array.from({ length: 12 }, (_, index) => [
      `2026-09-${String(index + 1).padStart(2, '0')}T22:00:00`,
      index % 2 === 0 ? '9/10' : '10/10',
    ]);
    entries.push(['2026-09-12T20:00:00', '9/10']);
    entries.push(['2026-09-12T21:00:00', 'unpatched note']);

    const parsed = parser.parse(exportJson(entries));
    const result = await service.import(parsed);

    expect(result).toEqual({
      imported: 12,
      replaced: 0,
      skipped: 2,
      resultingStreak: 12,
    });

    const day11 = db.dailyScores.rows.get('2026-09-11');
    const day12 = db.dailyScores.rows.get('2026-09-12');
    expect(day11).toMatchObject({ score: 9, streakAtThisDay: 11, rewardEarned: 200 });
    expect(day12).toMatchObject({ score: 10, streakAtThisDay: 12, rewardEarned: 1000 });
  });

  it('rolls back atomically and leaves existing scores untouched when writing to storage fails', async () => {
    const initialScore: DailyScore = {
      date: '2026-09-01',
      score: 7,
      rewardEarned: 0,
      streakAtThisDay: 0,
      createdAt: 10,
    };
    await db.dailyScores.bulkPut([initialScore]);
    vi.spyOn(db.dailyScores, 'bulkPut').mockRejectedValueOnce(new Error('QuotaExceededError'));

    const parsed = parser.parse(
      exportJson([
        ['2026-09-01T22:00:00', '10/10'],
        ['2026-09-02T22:00:00', '9/10'],
      ]),
    );

    await expect(service.import(parsed)).rejects.toThrow('QuotaExceededError');
    expect(db.dailyScores.all()).toEqual([initialScore]);
    expect(db.users.rows[0].balance).toBe(2500);
  });
});
