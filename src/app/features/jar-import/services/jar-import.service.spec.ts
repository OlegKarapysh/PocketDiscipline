import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FALLBACK_CATEGORY_ID } from '../../../core/constants/initial-reward-categories.const';
import type { DailyScore } from '../../../core/models/daily-score.model';
import type { DailyTaskCompletion } from '../../../core/models/daily-task-completion.model';
import type { DailyTask } from '../../../core/models/daily-task.model';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import type { Goal } from '../../../core/models/goal.model';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import type { User } from '../../../core/models/user.model';
import type { WithdrawalRecord } from '../../../core/models/withdrawal.model';
import { DbService } from '../../../database/db.service';
import type { JarReviewRow } from '../models/jar-review-row.model';
import { JAR_STATEMENT_FIXTURE, jarStatementOf } from '../testing/jar-statement.fixture';
import { JarImportService } from './jar-import.service';
import { JarStatementParserService } from './jar-statement-parser.service';

// The slice of a Dexie table the import uses, over a Map. It has no transactions: atomicity is
// IndexedDB's, and is covered by the e2e suite.
class FakeTable<T extends object, K = string> {
  readonly rows = new Map<K, T>();

  constructor(private readonly keyOf: (row: T) => K) {}

  toArray(): Promise<T[]> {
    return Promise.resolve([...this.rows.values()]);
  }

  bulkGet(keys: K[]): Promise<(T | undefined)[]> {
    return Promise.resolve(keys.map((key) => this.rows.get(key)));
  }

  bulkPut(rows: T[]): Promise<void> {
    for (const row of rows) this.rows.set(this.keyOf(row), structuredClone(row));
    return Promise.resolve();
  }

  update(key: K, changes: Partial<T>): Promise<number> {
    const row = this.rows.get(key);
    if (row) this.rows.set(key, { ...row, ...changes });
    return Promise.resolve(row ? 1 : 0);
  }

  where(index: keyof T) {
    return {
      equals: (value: unknown) => ({
        toArray: () => Promise.resolve([...this.rows.values()].filter((row) => row[index] === value)),
      }),
    };
  }

  all(): T[] {
    return [...this.rows.values()];
  }
}

const byId = (row: { id: string }) => row.id;
const DAY = (day: number) => `2026-09-${String(day).padStart(2, '0')}`;

describe('JarImportService', () => {
  let service: JarImportService;
  let parser: JarStatementParserService;
  let db: {
    users: FakeTable<User, number>;
    dailyTasks: FakeTable<DailyTask>;
    dailyTaskCompletions: FakeTable<DailyTaskCompletion>;
    dailyScores: FakeTable<DailyScore>;
    pomodoroSessions: FakeTable<PomodoroSession>;
    goals: FakeTable<Goal>;
    withdrawals: FakeTable<WithdrawalRecord>;
    transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    db = {
      users: new FakeTable<User, number>((user) => user.id),
      dailyTasks: new FakeTable<DailyTask>(byId),
      dailyTaskCompletions: new FakeTable<DailyTaskCompletion>(byId),
      dailyScores: new FakeTable<DailyScore>((score) => score.date),
      pomodoroSessions: new FakeTable<PomodoroSession>(byId),
      goals: new FakeTable<Goal>(byId),
      withdrawals: new FakeTable<WithdrawalRecord>(byId),
      transaction: vi.fn((_mode: string, _tables: unknown[], work: () => Promise<unknown>) => work()),
    };
    void db.users.bulkPut([{ id: 1, name: 'Current', balance: 1234, createdAt: 0, updatedAt: 0 }]);

    TestBed.configureTestingModule({ providers: [{ provide: DbService, useValue: db }] });
    service = TestBed.inject(JarImportService);
    parser = TestBed.inject(JarStatementParserService);
  });

  // Reads a statement, takes the suggestions, lets the test edit them, and imports.
  async function importStatement(text = JAR_STATEMENT_FIXTURE, edit = (rows: JarReviewRow[]) => rows) {
    const rows = parser.parse(text);
    const suggestion = await service.suggest(rows);
    return service.import(rows, edit(suggestion.rows));
  }

  const edited = (key: string, change: Partial<JarReviewRow>) => (rows: JarReviewRow[]) =>
    rows.map((row) => (row.key === key ? { ...row, ...change } : row));
  const taskTitled = (title: string) => db.dailyTasks.all().find((task) => task.title === title);
  const completionsOf = (title: string) =>
    db.dailyTaskCompletions.all().filter((completion) => completion.taskId === taskTitled(title)?.id);
  const difficultiesOf = (title: string) =>
    Object.fromEntries((taskTitled(title)?.difficulties ?? []).map((d) => [d.name, d.baseReward]));

  describe('suggestions', () => {
    it('suggests an action for every group of the statement', async () => {
      const { rows } = await service.suggest(parser.parse(JAR_STATEMENT_FIXTURE));
      const actions = Object.fromEntries(rows.map((row) => [row.key, row.action]));

      expect(actions).toEqual({
        'task:тренировка': 'task',
        'task:холодный душ': 'task',
        'task:подтягивания': 'task',
        'task:sally up': 'task',
        'task:ревью дня': 'task',
        'task:заметки': 'task',
        'task:подсчет итогов месяца': 'skip',
        'milestone:sally up': 'goal',
        'one-off:челлендж: 15 подтягиваний (выполнено 28 мая)': 'goal',
        'one-off:заказал витамины': 'goal',
        score: 'score',
        'pomodoro:work': 'pomodoro',
        'pomodoro:study': 'pomodoro',
        'top-up': 'skip',
        withdrawal: 'withdrawal',
      });
      expect(rows.reduce((sum, row) => sum + row.rowIds.length, 0)).toBe(56);
      expect(rows.find((row) => row.key === 'task:тренировка')).toMatchObject({ taskTitle: 'Тренировка', paid: 683 });
    });

    it('suggests the title of an existing task with the same folded title', async () => {
      await db.dailyTasks.bulkPut([
        {
          id: 'mine',
          title: 'ХОЛОДНЫЙ  Душ',
          createdAt: 0,
          sortOrder: 0,
          difficulties: [],
          streak: 0,
          lastCompletedAt: null,
        },
      ]);

      const suggestion = await service.suggest(parser.parse(JAR_STATEMENT_FIXTURE));

      expect(suggestion.rows.find((row) => row.key === 'task:холодный душ')?.taskTitle).toBe('ХОЛОДНЫЙ  Душ');
      expect(suggestion.existingTaskTitles).toEqual(['холодный душ']);
    });
  });

  describe('daily tasks', () => {
    it('imports every habit row as a completion that earned what was paid', async () => {
      const result = await importStatement();

      expect(result).toMatchObject({ completions: 41, tasks: 6 });
      expect(
        db.dailyTasks
          .all()
          .map((task) => task.title)
          .sort(),
      ).toEqual(['Sally up', 'Заметки', 'Подтягивания', 'Ревью дня', 'Тренировка', 'Холодный душ']);
      const paid = completionsOf('Тренировка').map((completion) => completion.rewardEarned);
      expect(paid.sort((a, b) => a - b)).toEqual([35, 50, 55, 60, 75, 80, 85, 113, 130]);
    });

    it('makes one difficulty per level of a graded habit, priced by its usual base reward', async () => {
      await importStatement();

      expect(difficultiesOf('Тренировка')).toEqual({
        Легкая: 50,
        Standard: 100,
        'Очень легкая': 25,
        'Легкая полная': 75,
      });
      expect(difficultiesOf('Холодный душ')).toEqual({
        Standard: 100,
        Контрастный: 150,
        'Холодная ванна': 200,
        Легкий: 50,
      });
      expect(difficultiesOf('Заметки')).toEqual({ Standard: 100 });
    });

    it('makes one difficulty per reward tier of a measured exercise, named by its range', async () => {
      await importStatement();

      expect(difficultiesOf('Подтягивания')).toEqual({ '12–19': 50, '20–29': 100, '30+': 150 });
      expect(difficultiesOf('Sally up')).toEqual({ '2:10–2:29': 50, '2:30–2:59': 100, '3:00–3:29': 150, '3:30+': 200 });
    });

    it('files a row that was paid off-tier under the tier its measurement falls in', async () => {
      await importStatement();
      const tier = taskTitled('Подтягивания')?.difficulties.find((d) => d.name === '20–29');

      const offTier = completionsOf('Подтягивания').find((completion) => completion.rewardEarned === 340);
      expect(offTier?.difficultyId).toBe(tier?.id);
    });

    it('puts a row marked as yesterday on the previous day, at 23:59', async () => {
      await importStatement();

      const shifted = completionsOf('Холодный душ').filter((completion) => completion.date === DAY(8));
      expect(shifted).toHaveLength(1);
      const at = new Date(shifted[0].completedAt);
      expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([8, 23, 59]);
    });

    it('keeps both rows of a task done twice on one day, and counts the day once in the streak', async () => {
      await importStatement();

      expect(completionsOf('Тренировка').filter((completion) => completion.date === DAY(6))).toHaveLength(2);
      expect(taskTitled('Тренировка')?.streak).toBe(8);
    });

    it('derives each streak from the consecutive days ending at the latest completion', async () => {
      await importStatement();

      const streaks = Object.fromEntries(db.dailyTasks.all().map((task) => [task.title, task.streak]));
      expect(streaks).toEqual({
        Тренировка: 8,
        'Холодный душ': 8,
        Подтягивания: 8,
        'Sally up': 8,
        'Ревью дня': 3,
        Заметки: 4,
      });
      const latest = new Date(taskTitled('Холодный душ')?.lastCompletedAt ?? 0);
      expect([latest.getDate(), latest.getHours(), latest.getMinutes()]).toEqual([8, 23, 59]);
    });

    it('reuses an existing task, keeps its difficulties and adds only the missing ones', async () => {
      const lastAugust = new Date(2026, 7, 31, 9, 0).getTime();
      await db.dailyTasks.bulkPut([
        {
          id: 'mine',
          title: 'тренировка',
          createdAt: 0,
          sortOrder: 0,
          difficulties: [{ id: 'easy', name: 'Лёгкая', baseReward: 40 }],
          streak: 1,
          lastCompletedAt: lastAugust,
        },
      ]);
      await db.dailyTaskCompletions.bulkPut([
        {
          id: 'app',
          taskId: 'mine',
          date: '2026-08-31',
          difficultyId: 'easy',
          rewardEarned: 40,
          completedAt: lastAugust,
        },
      ]);

      await importStatement();

      expect(db.dailyTasks.all().filter((task) => parser.fold(task.title) === 'тренировка')).toHaveLength(1);
      expect(difficultiesOf('тренировка')).toEqual({
        Лёгкая: 40,
        Standard: 100,
        'Очень легкая': 25,
        'Легкая полная': 75,
      });
      // Six imported "легкая" rows, and the app's own completion.
      expect(completionsOf('тренировка').filter((completion) => completion.difficultyId === 'easy')).toHaveLength(7);
      // The app's completion on 31 August joins the imported run of 1–8 September.
      expect(taskTitled('тренировка')?.streak).toBe(9);
    });

    it('puts the tasks it creates after the existing ones, each in a place of its own', async () => {
      await db.dailyTasks.bulkPut([
        {
          id: 'mine',
          title: 'Stretch',
          createdAt: 0,
          sortOrder: 7,
          difficulties: [{ id: 'easy', name: 'Easy', baseReward: 40 }],
          streak: 0,
          lastCompletedAt: null,
        },
      ]);

      await importStatement();

      const created = db.dailyTasks.all().filter((task) => task.id !== 'mine');
      expect(created).toHaveLength(6);
      expect(created.map((task) => task.sortOrder).sort((a, b) => a - b)).toEqual([8, 9, 10, 11, 12, 13]);
      expect(taskTitled('Stretch')?.sortOrder).toBe(7);
    });

    it('merges groups given the same task title', async () => {
      await importStatement(JAR_STATEMENT_FIXTURE, edited('task:ревью дня', { taskTitle: 'заметки' }));

      expect(taskTitled('Ревью дня')).toBeUndefined();
      expect(completionsOf('Заметки')).toHaveLength(7);
    });

    it('writes nothing for a group set to skip, and counts its rows as skipped', async () => {
      const result = await importStatement(JAR_STATEMENT_FIXTURE, edited('task:тренировка', { action: 'skip' }));

      expect(taskTitled('Тренировка')).toBeUndefined();
      expect(result).toMatchObject({ completions: 32, tasks: 5, skipped: 11 });
    });
  });

  describe('importing again', () => {
    it('adds nothing when the same statement is imported twice', async () => {
      const tables = () =>
        JSON.stringify(Object.values(db).flatMap((table) => (table instanceof FakeTable ? [table.all()] : [])));
      const first = await importStatement();
      const snapshot = tables();

      const second = await importStatement();

      expect(first).toEqual({
        completions: 41,
        tasks: 6,
        scores: 4,
        sessions: 7,
        goals: 3,
        withdrawals: 2,
        alreadyImported: 0,
        skipped: 2,
      });
      expect(second).toEqual({
        completions: 0,
        tasks: 0,
        scores: 0,
        sessions: 0,
        goals: 0,
        withdrawals: 0,
        alreadyImported: 54,
        skipped: 2,
      });
      expect(tables()).toBe(snapshot);
    });

    it('counts a row an earlier import wrote as already imported, even when its group is now skipped', async () => {
      await importStatement(JAR_STATEMENT_FIXTURE, edited('top-up', { action: 'goal' }));
      const goals = JSON.stringify(db.goals.all());

      const result = await importStatement();

      expect(result).toMatchObject({ goals: 0, alreadyImported: 55, skipped: 1 });
      expect(JSON.stringify(db.goals.all())).toBe(goals);
    });

    it('adds only the new rows of a newer statement that overlaps an imported one', async () => {
      // The oldest 20 rows: the bank lists the newest first, so they are the last lines of the file.
      const lines = JAR_STATEMENT_FIXTURE.trimEnd().split('\n');
      await importStatement([lines[0], ...lines.slice(-20)].join('\n'));
      const before = db.dailyTaskCompletions.rows.size;

      const result = await importStatement();

      expect(result.alreadyImported).toBe(20 - 2);
      expect(db.dailyTaskCompletions.rows.size).toBe(41);
      expect(result.completions).toBe(41 - before);
      // The tiers seen in the first, shorter statement are reused by base reward, not added again.
      expect(Object.values(difficultiesOf('Подтягивания')).sort((a, b) => a - b)).toEqual([50, 100, 150]);
    });
  });

  describe('the balance', () => {
    it('is never changed, and the users table is not part of the import', async () => {
      await importStatement();

      expect(db.users.all()[0].balance).toBe(1234);
      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(db.transaction.mock.calls[0][1]).not.toContain(db.users);
    });
  });

  describe('scores, focus sessions, one-offs and withdrawals', () => {
    it('imports scores with what was paid and the streak of good days', async () => {
      await importStatement();

      expect(
        db.dailyScores
          .all()
          .map(({ date, score, rewardEarned, streakAtThisDay }) => [date, score, rewardEarned, streakAtThisDay]),
      ).toEqual(
        expect.arrayContaining([
          [DAY(1), 10, 500, 1],
          [DAY(2), 9, 110, 2],
          [DAY(3), 10, 600, 3],
          [DAY(4), 9, 130, 4],
        ]),
      );
    });

    it("keeps the app's own score on a day that has one, and reports the jar's as skipped", async () => {
      await db.dailyScores.bulkPut([{ date: DAY(2), score: 9, rewardEarned: 100, streakAtThisDay: 7, createdAt: 1 }]);

      const result = await importStatement();

      // Kept, and its streak recounted from the imported day before it.
      expect(db.dailyScores.rows.get(DAY(2))).toMatchObject({ rewardEarned: 100, createdAt: 1, streakAtThisDay: 2 });
      expect(db.dailyScores.rows.get(DAY(3))?.streakAtThisDay).toBe(3);
      expect(result).toMatchObject({ scores: 3, skipped: 3 });
    });

    it("recounts the streak of the app's own scores that follow the imported ones, until the run breaks", async () => {
      await db.dailyScores.bulkPut([
        { date: DAY(5), score: 9, rewardEarned: 100, streakAtThisDay: 1, createdAt: 1 },
        { date: DAY(6), score: 10, rewardEarned: 550, streakAtThisDay: 2, createdAt: 2 },
        { date: DAY(7), score: 6, rewardEarned: 0, streakAtThisDay: 0, createdAt: 3 },
        { date: DAY(8), score: 9, rewardEarned: 100, streakAtThisDay: 1, createdAt: 4 },
      ]);

      await importStatement();

      const days = [5, 6, 7, 8].map((day) => db.dailyScores.rows.get(DAY(day)));
      expect(days.map((score) => score?.streakAtThisDay)).toEqual([5, 6, 0, 1]);
      expect(days.map((score) => score?.rewardEarned)).toEqual([100, 550, 0, 100]);
    });

    it('keeps every session of a pomodoro row paid just after midnight on that day', async () => {
      await importStatement(jarStatementOf([['10.09.2026 00:20', '300.00', 'Помидор работа 3']]));

      const sessions = db.pomodoroSessions.all();
      expect(sessions).toHaveLength(3);
      expect(sessions.map((session) => new Date(session.endTime ?? 0).getDate())).toEqual([10, 10, 10]);
      expect(Math.min(...sessions.map((session) => session.startTime))).toBeGreaterThanOrEqual(
        new Date(2026, 8, 10).getTime(),
      );
      expect(sessions.reduce((sum, session) => sum + (session.rewardEarned ?? 0), 0)).toBe(300);
    });

    it('splits a pomodoro row into 25-minute sessions of its kind that share what was paid', async () => {
      await importStatement();

      const sessions = db.pomodoroSessions.all();
      const study = sessions.filter((session) => session.engagementType === EngagementType.STUDY);
      expect(sessions).toHaveLength(7);
      expect(study.map((session) => session.rewardEarned)).toEqual([125, 125, 125, 125]);
      expect(
        sessions.every(
          (session) => session.durationMinutes === 25 && session.status === PomodoroSessionStatus.COMPLETED,
        ),
      ).toBe(true);

      const twoSessions = sessions.filter((session) => new Date(session.startTime).getDate() === 1);
      expect(twoSessions.map((session) => session.rewardEarned)).toEqual([100, 100]);
      expect(Math.max(...twoSessions.map((session) => session.endTime ?? 0))).toBe(
        new Date(2026, 8, 1, 10, 0).getTime(),
      );
      expect(Math.min(...twoSessions.map((session) => session.startTime))).toBe(new Date(2026, 8, 1, 9, 10).getTime());
    });

    it('records one-offs and milestones as completed goals', async () => {
      await importStatement();

      const goals = db.goals.all().map(({ title, rewardValue, status }) => ({ title, rewardValue, status }));
      expect(goals).toEqual(
        expect.arrayContaining([
          { title: 'Заказал витамины', rewardValue: 100, status: 'COMPLETED' },
          { title: 'Sally up 3:50', rewardValue: 3000, status: 'COMPLETED' },
          { title: 'Челлендж: 15 подтягиваний (выполнено 28 мая)', rewardValue: 500, status: 'COMPLETED' },
        ]),
      );
      expect(goals).toHaveLength(3);
    });

    it('writes withdrawals to the ledger in whole hryvnias', async () => {
      await importStatement();

      expect(
        db.withdrawals.all().map(({ amount, title, categoryId, date }) => ({ amount, title, categoryId, date })),
      ).toEqual(
        expect.arrayContaining([
          { amount: 210, title: 'Jar withdrawal', categoryId: FALLBACK_CATEGORY_ID, date: DAY(5) },
          { amount: 21, title: 'Jar withdrawal', categoryId: FALLBACK_CATEGORY_ID, date: DAY(7) },
        ]),
      );
    });
  });
});
