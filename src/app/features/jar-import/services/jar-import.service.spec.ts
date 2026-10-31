import { TestBed } from '@angular/core/testing';
import { firstValueFrom, from } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { FALLBACK_CATEGORY_ID } from '../../../core/constants/initial-reward-categories.const';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
import type { User } from '../../../core/models/user.model';
import { UserService } from '../../../core/services/user.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import type { JarReviewRow } from '../models/jar-review-row.model';
import { JAR_STATEMENT_FIXTURE, jarStatementOf } from '../testing/jar-statement.fixture';
import { JarImportService } from './jar-import.service';
import { JarStatementParserService } from './jar-statement-parser.service';

const DAY = (day: number) => `2026-09-${String(day).padStart(2, '0')}`;
const USER: User = { id: CURRENT_USER_ID, name: 'Current', balance: 1234, createdAt: 0, updatedAt: 0 };

describe('JarImportService', () => {
  let service: JarImportService;
  let parser: JarStatementParserService;
  let db: DbService;

  beforeEach(async () => {
    db = await openEmptyDb();
    await db.users.add(USER);
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
  const taskTitled = async (title: string) => (await db.dailyTasks.toArray()).find((task) => task.title === title);
  const completionsOf = async (title: string) => {
    const task = await taskTitled(title);
    return task ? db.dailyTaskCompletions.where('taskId').equals(task.id).toArray() : [];
  };
  const difficultiesOf = async (title: string) =>
    Object.fromEntries(((await taskTitled(title))?.difficulties ?? []).map((d) => [d.name, d.baseReward]));
  // Every table the import can write to, as stored.
  const importedTables = async () =>
    JSON.stringify(
      await Promise.all(
        [db.dailyTasks, db.dailyTaskCompletions, db.dailyScores, db.pomodoroSessions, db.goals, db.withdrawals].map(
          (table) => table.toArray(),
        ),
      ),
    );

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
      expect((await db.dailyTasks.toArray()).map((task) => task.title).sort()).toEqual([
        'Sally up',
        'Заметки',
        'Подтягивания',
        'Ревью дня',
        'Тренировка',
        'Холодный душ',
      ]);
      const paid = (await completionsOf('Тренировка')).map((completion) => completion.rewardEarned);
      expect(paid.sort((a, b) => a - b)).toEqual([35, 50, 55, 60, 75, 80, 85, 113, 130]);
    });

    it('makes one difficulty per level of a graded habit, priced by its usual base reward', async () => {
      await importStatement();

      expect(await difficultiesOf('Тренировка')).toEqual({
        Легкая: 50,
        Standard: 100,
        'Очень легкая': 25,
        'Легкая полная': 75,
      });
      expect(await difficultiesOf('Холодный душ')).toEqual({
        Standard: 100,
        Контрастный: 150,
        'Холодная ванна': 200,
        Легкий: 50,
      });
      expect(await difficultiesOf('Заметки')).toEqual({ Standard: 100 });
    });

    it('makes one difficulty per reward tier of a measured exercise, named by its range', async () => {
      await importStatement();

      expect(await difficultiesOf('Подтягивания')).toEqual({ '12–19': 50, '20–29': 100, '30+': 150 });
      expect(await difficultiesOf('Sally up')).toEqual({
        '2:10–2:29': 50,
        '2:30–2:59': 100,
        '3:00–3:29': 150,
        '3:30+': 200,
      });
    });

    it('files a row that was paid off-tier under the tier its measurement falls in', async () => {
      await importStatement();
      const tier = (await taskTitled('Подтягивания'))?.difficulties.find((d) => d.name === '20–29');

      const offTier = (await completionsOf('Подтягивания')).find((completion) => completion.rewardEarned === 340);
      expect(offTier?.difficultyId).toBe(tier?.id);
    });

    it('puts a row marked as yesterday on the previous day, at 23:59', async () => {
      await importStatement();

      const shifted = (await completionsOf('Холодный душ')).filter((completion) => completion.date === DAY(8));
      expect(shifted).toHaveLength(1);
      const at = new Date(shifted[0].completedAt);
      expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([8, 23, 59]);
    });

    it('keeps both rows of a task done twice on one day, and counts the day once in the streak', async () => {
      await importStatement();

      expect((await completionsOf('Тренировка')).filter((completion) => completion.date === DAY(6))).toHaveLength(2);
      expect((await taskTitled('Тренировка'))?.streak).toBe(8);
    });

    it('derives each streak from the consecutive days ending at the latest completion', async () => {
      await importStatement();

      const streaks = Object.fromEntries((await db.dailyTasks.toArray()).map((task) => [task.title, task.streak]));
      expect(streaks).toEqual({
        Тренировка: 8,
        'Холодный душ': 8,
        Подтягивания: 8,
        'Sally up': 8,
        'Ревью дня': 3,
        Заметки: 4,
      });
      const latest = new Date((await taskTitled('Холодный душ'))?.lastCompletedAt ?? 0);
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

      expect((await db.dailyTasks.toArray()).filter((task) => parser.fold(task.title) === 'тренировка')).toHaveLength(
        1,
      );
      expect(await difficultiesOf('тренировка')).toEqual({
        Лёгкая: 40,
        Standard: 100,
        'Очень легкая': 25,
        'Легкая полная': 75,
      });
      // Six imported "легкая" rows, and the app's own completion.
      expect(
        (await completionsOf('тренировка')).filter((completion) => completion.difficultyId === 'easy'),
      ).toHaveLength(7);
      // The app's completion on 31 August joins the imported run of 1–8 September.
      expect((await taskTitled('тренировка'))?.streak).toBe(9);
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

      const created = (await db.dailyTasks.toArray()).filter((task) => task.id !== 'mine');
      expect(created).toHaveLength(6);
      expect(created.map((task) => task.sortOrder).sort((a, b) => a - b)).toEqual([8, 9, 10, 11, 12, 13]);
      expect((await taskTitled('Stretch'))?.sortOrder).toBe(7);
    });

    it('merges groups given the same task title', async () => {
      await importStatement(JAR_STATEMENT_FIXTURE, edited('task:ревью дня', { taskTitle: 'заметки' }));

      expect(await taskTitled('Ревью дня')).toBeUndefined();
      expect(await completionsOf('Заметки')).toHaveLength(7);
    });

    it('writes nothing for a group set to skip, and counts its rows as skipped', async () => {
      const result = await importStatement(JAR_STATEMENT_FIXTURE, edited('task:тренировка', { action: 'skip' }));

      expect(await taskTitled('Тренировка')).toBeUndefined();
      expect(result).toMatchObject({ completions: 32, tasks: 5, skipped: 11 });
    });
  });

  describe('importing again', () => {
    it('adds nothing when the same statement is imported twice', async () => {
      const first = await importStatement();
      const snapshot = await importedTables();

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
      expect(await importedTables()).toBe(snapshot);
    });

    it('counts a row an earlier import wrote as already imported, even when its group is now skipped', async () => {
      await importStatement(JAR_STATEMENT_FIXTURE, edited('top-up', { action: 'goal' }));
      const goals = await db.goals.toArray();

      const result = await importStatement();

      expect(result).toMatchObject({ goals: 0, alreadyImported: 55, skipped: 1 });
      expect(await db.goals.toArray()).toEqual(goals);
    });

    it('adds only the new rows of a newer statement that overlaps an imported one', async () => {
      // The oldest 20 rows: the bank lists the newest first, so they are the last lines of the file.
      const lines = JAR_STATEMENT_FIXTURE.trimEnd().split('\n');
      await importStatement([lines[0], ...lines.slice(-20)].join('\n'));
      const before = await db.dailyTaskCompletions.count();

      const result = await importStatement();

      expect(result.alreadyImported).toBe(20 - 2);
      expect(await db.dailyTaskCompletions.count()).toBe(41);
      expect(result.completions).toBe(41 - before);
      // The tiers seen in the first, shorter statement are reused by base reward, not added again.
      expect(Object.values(await difficultiesOf('Подтягивания')).sort((a, b) => a - b)).toEqual([50, 100, 150]);
    });
  });

  describe('the balance', () => {
    it('is never changed, by deposits or by withdrawals', async () => {
      const balance = async () => (await firstValueFrom(from(TestBed.inject(UserService).user$))).balance;

      const result = await importStatement();

      expect(result).toMatchObject({ completions: 41, withdrawals: 2 });
      expect(await balance()).toBe(1234);
      expect(await db.users.toArray()).toEqual([USER]);
    });
  });

  describe('a failed import', () => {
    it('writes nothing when a write fails partway through', async () => {
      await db.dailyTasks.add({
        id: 'mine',
        title: 'Тренировка',
        createdAt: 0,
        sortOrder: 0,
        difficulties: [{ id: 'easy', name: 'Легкая', baseReward: 50 }],
        streak: 0,
        lastCompletedAt: null,
      });
      await db.dailyScores.add({ date: DAY(5), score: 9, rewardEarned: 100, streakAtThisDay: 1, createdAt: 1 });
      const before = await importedTables();
      // The statement holds withdrawals: refusing them fails the import, whatever it wrote before.
      const refuse = () => {
        throw new Error('disk full');
      };
      db.withdrawals.hook('creating', refuse);

      await expect(importStatement()).rejects.toThrow('disk full');

      db.withdrawals.hook('creating').unsubscribe(refuse);
      expect(await importedTables()).toBe(before);
      expect(await db.users.toArray()).toEqual([USER]);
    });
  });

  describe('scores, focus sessions, one-offs and withdrawals', () => {
    it('imports scores with what was paid and the streak of good days', async () => {
      await importStatement();

      expect(
        (await db.dailyScores.toArray()).map(({ date, score, rewardEarned, streakAtThisDay }) => [
          date,
          score,
          rewardEarned,
          streakAtThisDay,
        ]),
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
      expect(await db.dailyScores.get(DAY(2))).toMatchObject({ rewardEarned: 100, createdAt: 1, streakAtThisDay: 2 });
      expect((await db.dailyScores.get(DAY(3)))?.streakAtThisDay).toBe(3);
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

      const days = await db.dailyScores.bulkGet([5, 6, 7, 8].map(DAY));
      expect(days.map((score) => score?.streakAtThisDay)).toEqual([5, 6, 0, 1]);
      expect(days.map((score) => score?.rewardEarned)).toEqual([100, 550, 0, 100]);
    });

    it('keeps every session of a pomodoro row paid just after midnight on that day', async () => {
      await importStatement(jarStatementOf([['10.09.2026 00:20', '300.00', 'Помидор работа 3']]));

      const sessions = await db.pomodoroSessions.toArray();
      expect(sessions).toHaveLength(3);
      expect(sessions.map((session) => new Date(session.endTime ?? 0).getDate())).toEqual([10, 10, 10]);
      expect(Math.min(...sessions.map((session) => session.startTime))).toBeGreaterThanOrEqual(
        new Date(2026, 8, 10).getTime(),
      );
      expect(sessions.reduce((sum, session) => sum + (session.rewardEarned ?? 0), 0)).toBe(300);
    });

    it('splits a pomodoro row into 25-minute sessions of its kind that share what was paid', async () => {
      await importStatement();

      const sessions = await db.pomodoroSessions.toArray();
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

      const goals = (await db.goals.toArray()).map(({ title, rewardValue, status }) => ({
        title,
        rewardValue,
        status,
      }));
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
        (await db.withdrawals.toArray()).map(({ amount, title, categoryId, date }) => ({
          amount,
          title,
          categoryId,
          date,
        })),
      ).toEqual(
        expect.arrayContaining([
          { amount: 210, title: 'Jar withdrawal', categoryId: FALLBACK_CATEGORY_ID, date: DAY(5) },
          { amount: 21, title: 'Jar withdrawal', categoryId: FALLBACK_CATEGORY_ID, date: DAY(7) },
        ]),
      );
    });
  });
});
