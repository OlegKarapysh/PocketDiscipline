import { Service, inject } from '@angular/core';
import { DATE_LOCALE_CA } from '../../../core/constants/date-locale.const';
import { FALLBACK_CATEGORY_ID } from '../../../core/constants/initial-reward-categories.const';
import type { DailyScore } from '../../../core/models/daily-score.model';
import type { DailyTaskCompletion } from '../../../core/models/daily-task-completion.model';
import type { DailyTask } from '../../../core/models/daily-task.model';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import type { Goal } from '../../../core/models/goal.model';
import { GOAL_STATUS } from '../../../core/models/goal.model';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import type { WithdrawalRecord } from '../../../core/models/withdrawal.model';
import { DbService } from '../../../database/db.service';
import { TITLE_MAX_LENGTH } from '../../../shared/constants/text-length.const';
import { JAR_NON_DAILY_LABELS } from '../constants/jar-label-aliases.const';
import type { JarImportAction } from '../models/jar-import-action.type';
import type { JarImportResult } from '../models/jar-import-result.model';
import type { JarImportSuggestion } from '../models/jar-import-suggestion.model';
import type { JarReviewRow } from '../models/jar-review-row.model';
import type { JarStatementRow } from '../models/jar-statement-row.model';
import { JarStatementParserService } from './jar-statement-parser.service';

const STANDARD_DIFFICULTY = 'Standard';
const WITHDRAWAL_TITLE = 'Jar withdrawal';
const ONE_OFF_FALLBACK_TITLE = 'Jar reward';
const POMODORO_MINUTES = 25;
const POMODORO_RATE: Readonly<Record<EngagementType, number>> = {
  [EngagementType.WORK]: 100,
  [EngagementType.STUDY]: 125,
};
// Boundaries between reward tiers prefer round numbers: reps by fifty or ten, times by the minute.
const ROUND_COUNTS = [100, 50, 10, 5, 1];
const ROUND_SECONDS = [600, 300, 60, 30, 10, 5, 1];
const SCORE_STREAK_FROM = 9;
// The review lists the habits first, then everything else in this order.
const GROUP_ORDER = ['task', 'milestone', 'one-off', 'score', 'pomodoro', 'top-up', 'withdrawal'];

type Deposit = JarStatementRow & { reward: NonNullable<JarStatementRow['reward']> };
interface Tier {
  base: number;
  rows: Deposit[];
  median: number;
}
interface DifficultySpec {
  name: string;
  baseReward: number;
  // A reward tier's name is a range that moves with the rows it was seen in, so a tier is matched
  // to an existing difficulty by its reward as well.
  tiered: boolean;
}

@Service()
export class JarImportService {
  private db = inject(DbService);
  private parser = inject(JarStatementParserService);

  /**
   * Groups a read statement into review rows, one per label, each with a suggested action and, for
   * a habit, a suggested task title: an existing task's when one already has that title.
   */
  async suggest(rows: JarStatementRow[]): Promise<JarImportSuggestion> {
    const tasks = await this.db.dailyTasks.toArray();
    const titles = new Map(tasks.map((task) => [this.parser.fold(task.title), task.title]));
    const groups = new Map<string, JarReviewRow>();

    // Oldest first, so a one-off is labelled the way it was first written.
    for (const row of [...rows].sort((a, b) => a.completedAt - b.completedAt)) {
      const draft = this.reviewDraft(row, titles);
      const group = groups.get(draft.key) ?? { ...draft, rowIds: [], paid: 0 };
      groups.set(draft.key, { ...group, rowIds: [...group.rowIds, row.id], paid: group.paid + row.amount });
    }

    const rank = (row: JarReviewRow) => GROUP_ORDER.indexOf(row.key.split(':')[0]);
    const reviewRows = [...groups.values()]
      .map((group) => ({ ...group, paid: Math.round(group.paid) }))
      .sort((a, b) => rank(a) - rank(b) || b.rowIds.length - a.rowIds.length || a.label.localeCompare(b.label));
    return { rows: reviewRows, existingTaskTitles: [...titles.keys()] };
  }

  /**
   * Writes the statement as the review decided, in one transaction: a failure writes nothing. Rows
   * already present, from an earlier import of this or an overlapping statement, are left alone.
   * The balance is never changed.
   */
  async import(rows: JarStatementRow[], review: JarReviewRow[]): Promise<JarImportResult> {
    const rowById = new Map(rows.map((row) => [row.id, row]));
    const planned = new Map<JarImportAction, JarStatementRow[]>();
    const taskGroups = new Map<string, { title: string; rows: Deposit[] }>();
    const skippedRows: JarStatementRow[] = [];

    for (const group of review) {
      const groupRows = group.rowIds.flatMap((id) => rowById.get(id) ?? []);
      if (group.action === 'task') {
        const key = this.parser.fold(group.taskTitle);
        const deposits = groupRows.filter((row): row is Deposit => row.reward !== null);
        skippedRows.push(...groupRows.filter((row) => row.reward === null));
        const taskGroup = taskGroups.get(key) ?? { title: group.taskTitle.trim(), rows: [] };
        taskGroups.set(key, { ...taskGroup, rows: [...taskGroup.rows, ...deposits] });
      } else if (group.action === 'skip') {
        skippedRows.push(...groupRows);
      } else {
        planned.set(group.action, [...(planned.get(group.action) ?? []), ...groupRows]);
      }
    }
    // Skipped rows are looked up too: one an earlier import wrote is already imported, not skipped.
    const candidates = [
      ...[...taskGroups.values()].flatMap((group) => group.rows),
      ...[...planned.values()].flat(),
      ...skippedRows,
    ];

    const db = this.db;
    const tables = [
      db.dailyTasks,
      db.dailyTaskCompletions,
      db.dailyScores,
      db.pomodoroSessions,
      db.goals,
      db.withdrawals,
    ];
    return db.transaction('rw', tables, async () => {
      const present = await this.findImported(candidates.map((row) => row.id));
      const isNew = (row: JarStatementRow) => !present.has(row.id);

      const tasks = await this.writeTasks([...taskGroups.values()], isNew);
      const scores = await this.writeScores(planned.get('score') ?? [], isNew);
      const sessions = await this.writeSessions(planned.get('pomodoro') ?? [], isNew);
      const goals = await this.writeGoals(planned.get('goal') ?? [], isNew);
      const withdrawals = await this.writeWithdrawals(planned.get('withdrawal') ?? [], isNew);

      return {
        completions: tasks.completions,
        tasks: tasks.tasks,
        scores: scores.written,
        sessions: sessions.written,
        goals: goals.written,
        withdrawals: withdrawals.written,
        alreadyImported: present.size + scores.alreadyImported,
        skipped:
          skippedRows.filter(isNew).length + scores.skipped + sessions.skipped + goals.skipped + withdrawals.skipped,
      };
    });
  }

  private reviewDraft(row: JarStatementRow, titles: Map<string, string>): Omit<JarReviewRow, 'rowIds' | 'paid'> {
    const reward = row.reward;
    if (!reward) {
      return {
        key: 'withdrawal',
        label: 'Withdrawals',
        actions: ['withdrawal', 'skip'],
        action: 'withdrawal',
        taskTitle: '',
      };
    }

    const title = (label: string) => titles.get(label) ?? this.capitalize(label);
    switch (reward.kind) {
      case 'score':
        return { key: 'score', label: 'Daily scores', actions: ['score', 'skip'], action: 'score', taskTitle: '' };
      case 'pomodoro':
        return {
          key: `pomodoro:${String(reward.engagement)}`,
          label: reward.engagement === EngagementType.STUDY ? 'Pomodoro, study' : 'Pomodoro, work',
          actions: ['pomodoro', 'skip'],
          action: 'pomodoro',
          taskTitle: '',
        };
      case 'top-up':
        return { key: 'top-up', label: 'Jar top-ups', actions: ['skip', 'goal'], action: 'skip', taskTitle: '' };
      case 'free':
        return {
          key: `one-off:${reward.label}`,
          label: reward.text,
          actions: ['goal', 'task', 'skip'],
          action: 'goal',
          taskTitle: title(reward.label).slice(0, TITLE_MAX_LENGTH),
        };
      default:
        if (reward.completed) {
          return {
            key: `milestone:${reward.label}`,
            label: `${this.capitalize(reward.label)}, completed`,
            actions: ['goal', 'task', 'skip'],
            action: 'goal',
            taskTitle: title(reward.label),
          };
        }
        return {
          key: `task:${reward.label}`,
          label: this.capitalize(reward.label),
          actions: ['task', 'goal', 'skip'],
          action: JAR_NON_DAILY_LABELS.has(reward.label) ? 'skip' : 'task',
          taskTitle: title(reward.label),
        };
    }
  }

  // The ids of the rows already written by an earlier import, in any of the tables a row can land in.
  private async findImported(ids: string[]): Promise<Set<string>> {
    const db = this.db;
    const found = await Promise.all(
      [db.dailyTaskCompletions, db.pomodoroSessions, db.goals, db.withdrawals].map((table) => table.bulkGet(ids)),
    );
    return new Set(found.flatMap((rows) => rows.flatMap((row) => (row ? [row.id] : []))));
  }

  private async writeTasks(
    groups: { title: string; rows: Deposit[] }[],
    isNew: (row: JarStatementRow) => boolean,
  ): Promise<{ completions: number; tasks: number }> {
    const existing = await this.db.dailyTasks.toArray();
    const byTitle = new Map(existing.map((task) => [this.parser.fold(task.title), task]));
    const completions: DailyTaskCompletion[] = [];
    const touched: DailyTask[] = [];

    for (const group of groups) {
      const fresh = group.rows.filter(isNew);
      if (fresh.length === 0) continue;

      const specs = this.difficultiesOf(group.rows);
      const task: DailyTask = byTitle.get(this.parser.fold(group.title)) ?? {
        id: crypto.randomUUID(),
        title: group.title,
        createdAt: Math.min(...fresh.map((row) => row.completedAt)),
        difficulties: [],
        streak: 0,
        lastCompletedAt: null,
      };
      // The task keeps its difficulties; the ones the new rows need and it lacks are added, cheapest first.
      const difficulties = [...task.difficulties];
      const find = (spec: DifficultySpec) =>
        difficulties.find((d) => this.parser.fold(d.name) === this.parser.fold(spec.name)) ??
        (spec.tiered ? difficulties.find((d) => d.baseReward === spec.baseReward) : undefined);
      const needed = [...new Set(fresh.flatMap((row) => specs.get(row.id) ?? []))];
      for (const spec of needed.sort((a, b) => a.baseReward - b.baseReward)) {
        if (!find(spec)) difficulties.push({ id: crypto.randomUUID(), name: spec.name, baseReward: spec.baseReward });
      }
      const difficultyIdOf = (row: Deposit) => {
        const spec = specs.get(row.id);
        return (spec && find(spec)?.id) ?? difficulties[0].id;
      };

      for (const row of fresh) {
        completions.push({
          id: row.id,
          taskId: task.id,
          date: row.date,
          difficultyId: difficultyIdOf(row),
          rewardEarned: Math.round(row.amount),
          completedAt: row.completedAt,
        });
      }
      touched.push({ ...task, difficulties });
    }

    await this.db.dailyTasks.bulkPut(touched);
    await this.db.dailyTaskCompletions.bulkPut(completions);
    for (const task of touched) {
      await this.db.dailyTasks.update(task.id, await this.streakOf(task.id));
    }
    return { completions: completions.length, tasks: touched.length };
  }

  // From every completion the task has, imported or not: a gap the import fills joins two streaks.
  private async streakOf(taskId: string): Promise<Pick<DailyTask, 'streak' | 'lastCompletedAt'>> {
    const completions = await this.db.dailyTaskCompletions.where('taskId').equals(taskId).toArray();
    const days = new Set(completions.map((completion) => completion.date));
    const latest = completions.reduce((max, completion) => Math.max(max, completion.completedAt), 0);

    let streak = 0;
    for (let day = new Date(latest); days.has(day.toLocaleDateString(DATE_LOCALE_CA)); day.setDate(day.getDate() - 1)) {
      streak++;
    }
    return { streak, lastCompletedAt: latest };
  }

  // Each row's difficulty: by level for a graded habit, by reward tier for a measured exercise.
  private difficultiesOf(rows: Deposit[]): Map<string, DifficultySpec> {
    const measured = rows.filter((row) => row.reward.measure !== null);
    return measured.length * 2 > rows.length ? this.tieredDifficulties(rows) : this.levelDifficulties(rows);
  }

  private levelDifficulties(rows: Deposit[]): Map<string, DifficultySpec> {
    const byLevel = new Map<string, Deposit[]>();
    for (const row of rows) {
      const level = row.reward.level ?? '';
      byLevel.set(level, [...(byLevel.get(level) ?? []), row]);
    }

    const specs = new Map<string, DifficultySpec>();
    for (const [level, levelRows] of byLevel) {
      const spec = {
        name: level ? this.capitalize(level) : STANDARD_DIFFICULTY,
        baseReward: Math.max(1, this.mostFrequent(levelRows.map((row) => row.reward.baseReward))),
        tiered: false,
      };
      for (const row of levelRows) specs.set(row.id, spec);
    }
    return specs;
  }

  private tieredDifficulties(rows: Deposit[]): Map<string, DifficultySpec> {
    const timed = rows.filter((row) => row.reward.kind === 'timed').length * 2 > rows.length;
    const measure = (row: Deposit) => row.reward.measure ?? 0;
    const tiers = this.findTiers(rows.filter((row) => row.reward.measure !== null && !row.reward.completed));
    if (tiers.length === 0) return this.levelDifficulties(rows);
    const bounds = this.findBounds(tiers, timed);

    const format = (value: number) =>
      timed ? `${String(Math.floor(value / 60))}:${String(value % 60).padStart(2, '0')}` : String(value);
    const range = (from: number, to: number) => (from === to ? format(from) : `${format(from)}–${format(to)}`);
    const specs = tiers.map((tier, i): DifficultySpec => {
      const measures = tier.rows.map(measure);
      const from = i === 0 ? Math.min(...measures) : bounds[i - 1];
      let name: string;
      if (tiers.length === 1) name = range(from, Math.max(...measures));
      else if (i === tiers.length - 1) name = `${format(from)}+`;
      else name = from < bounds[i] ? range(from, bounds[i] - 1) : `Under ${format(bounds[i])}`;
      return { name, baseReward: Math.max(1, tier.base), tiered: true };
    });

    return new Map(
      rows.map((row) => {
        const i =
          row.reward.measure === null
            ? this.nearestTier(tiers, row.reward.baseReward)
            : bounds.filter((bound) => bound <= measure(row)).length;
        return [row.id, specs[i]];
      }),
    );
  }

  // Reward tiers, lowest first. Bases within 1 ₴ of each other are one tier (the bonus was rounded
  // when it was paid). A tier needs two rows, and a higher tier must be a longer or bigger effort:
  // that keeps one-off prices and mistyped bonuses from becoming difficulties of their own.
  private findTiers(rows: Deposit[]): Tier[] {
    const counts = new Map<number, number>();
    for (const row of rows) counts.set(row.reward.baseReward, (counts.get(row.reward.baseReward) ?? 0) + 1);

    const clusters: { base: number; bases: number[] }[] = [];
    for (const [base] of [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])) {
      const cluster = clusters.find((c) => Math.abs(c.base - base) <= 1);
      if (cluster) cluster.bases.push(base);
      else clusters.push({ base, bases: [base] });
    }

    const candidates = clusters
      .map(({ base, bases }) => {
        const tierRows = rows.filter((row) => bases.includes(row.reward.baseReward));
        return { base, rows: tierRows, median: this.median(tierRows.map((row) => row.reward.measure ?? 0)) };
      })
      .sort((a, b) => b.rows.length - a.rows.length || a.base - b.base);

    const accepted: Tier[] = [];
    for (const tier of candidates) {
      if (tier.rows.length < 2) continue;
      const monotone = accepted.every((a) => a.median !== tier.median && a.base < tier.base === a.median < tier.median);
      if (monotone) accepted.push(tier);
    }
    if (accepted.length === 0 && candidates.length > 0) accepted.push(candidates[0]);
    return accepted.sort((a, b) => a.base - b.base);
  }

  // Where each tier ends: the measurement that misfiles the fewest rows of two neighbouring tiers,
  // the roundest of those, rising from one boundary to the next.
  private findBounds(tiers: Tier[], timed: boolean): number[] {
    const roundness = timed ? ROUND_SECONDS : ROUND_COUNTS;
    const bounds: number[] = [];
    for (let i = 0; i + 1 < tiers.length; i++) {
      const lower = tiers[i].rows.map((row) => row.reward.measure ?? 0);
      const upper = tiers[i + 1].rows.map((row) => row.reward.measure ?? 0);
      const from = i === 0 ? Math.min(...lower) + 1 : bounds[i - 1] + 1;
      const to = Math.max(from, ...upper);

      let best = { bound: from, misfiled: Infinity, roundness: Infinity };
      for (let bound = from; bound <= to; bound++) {
        const misfiled = lower.filter((m) => m >= bound).length + upper.filter((m) => m < bound).length;
        const round = roundness.findIndex((unit) => bound % unit === 0);
        if (misfiled < best.misfiled || (misfiled === best.misfiled && round < best.roundness)) {
          best = { bound, misfiled, roundness: round };
        }
      }
      bounds.push(best.bound);
    }
    return bounds;
  }

  private nearestTier(tiers: Tier[], base: number): number {
    let nearest = 0;
    tiers.forEach((tier, i) => {
      if (Math.abs(tier.base - base) < Math.abs(tiers[nearest].base - base)) nearest = i;
    });
    return nearest;
  }

  private async writeScores(
    rows: JarStatementRow[],
    isNew: (row: JarStatementRow) => boolean,
  ): Promise<{ written: number; alreadyImported: number; skipped: number }> {
    const fresh = rows.filter(isNew);
    const scored = fresh.filter((row) => typeof row.reward?.score === 'number');
    const known = new Map((await this.db.dailyScores.toArray()).map((score) => [score.date, score]));
    const written = new Set<string>();
    let alreadyImported = 0;

    for (const row of scored.sort((a, b) => a.completedAt - b.completedAt)) {
      const score = row.reward?.score ?? 0;
      const kept = known.get(row.date);
      if (kept) {
        // An imported score was written with its row's time; any other score that day is the app's own.
        if (kept.createdAt === row.completedAt && kept.score === score) alreadyImported++;
        continue;
      }

      known.set(row.date, {
        date: row.date,
        score,
        rewardEarned: Math.round(row.amount),
        streakAtThisDay: 0,
        createdAt: row.completedAt,
      });
      written.add(row.date);
    }

    // Oldest first, each day from the one before it. An app score is recounted only while it follows
    // a day this import wrote or changed, so the run ends where the good days break; what it earned stays.
    const settled = new Set<string>();
    const changed: DailyScore[] = [];
    for (const date of [...known.keys()].sort()) {
      const day = known.get(date);
      const before = this.dayBefore(date);
      if (!day || (!written.has(date) && !settled.has(before))) continue;

      const streakAtThisDay = day.score >= SCORE_STREAK_FROM ? (known.get(before)?.streakAtThisDay ?? 0) + 1 : 0;
      if (written.has(date) || streakAtThisDay !== day.streakAtThisDay) {
        const recounted = { ...day, streakAtThisDay };
        known.set(date, recounted);
        changed.push(recounted);
        settled.add(date);
      }
    }

    await this.db.dailyScores.bulkPut(changed);
    return { written: written.size, alreadyImported, skipped: fresh.length - written.size - alreadyImported };
  }

  private dayBefore(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day - 1).toLocaleDateString(DATE_LOCALE_CA);
  }

  private async writeSessions(
    rows: JarStatementRow[],
    isNew: (row: JarStatementRow) => boolean,
  ): Promise<{ written: number; skipped: number }> {
    const fresh = rows.filter(isNew);
    const pomodoros = fresh.filter((row) => row.reward?.kind === 'pomodoro');
    const sessions: PomodoroSession[] = [];

    for (const row of pomodoros) {
      const engagement = row.reward?.engagement ?? EngagementType.WORK;
      const paid = Math.round(row.amount);
      const count = row.reward?.sessions ?? Math.max(1, Math.round(paid / POMODORO_RATE[engagement]));
      const each = Math.floor(paid / count);
      const length = POMODORO_MINUTES * 60_000;

      // Back to back, the last one ending when the row was completed, unless that would start the
      // first before midnight: the dashboard credits a session on the day it ends, and every one of
      // them belongs to the row's day. The last takes the remainder.
      const dayStart = new Date(row.completedAt).setHours(0, 0, 0, 0);
      const firstEnd = Math.max(row.completedAt - (count - 1) * length, dayStart + length);
      for (let i = 0; i < count; i++) {
        const endTime = firstEnd + i * length;
        sessions.push({
          id: i === 0 ? row.id : `${row.id}-${String(i + 1)}`,
          durationMinutes: POMODORO_MINUTES,
          engagementType: engagement,
          startTime: endTime - length,
          endTime,
          status: PomodoroSessionStatus.COMPLETED,
          rewardEarned: i === count - 1 ? paid - each * (count - 1) : each,
        });
      }
    }

    await this.db.pomodoroSessions.bulkPut(sessions);
    return { written: sessions.length, skipped: fresh.length - pomodoros.length };
  }

  private async writeGoals(
    rows: JarStatementRow[],
    isNew: (row: JarStatementRow) => boolean,
  ): Promise<{ written: number; skipped: number }> {
    const fresh = rows.filter(isNew);
    const goals: Goal[] = fresh.flatMap((row) =>
      row.reward
        ? [
            {
              id: row.id,
              title: (row.reward.text || ONE_OFF_FALLBACK_TITLE).slice(0, TITLE_MAX_LENGTH),
              rewardValue: Math.round(row.amount),
              status: GOAL_STATUS.COMPLETED,
              completedAt: row.completedAt,
              createdAt: row.completedAt,
            },
          ]
        : [],
    );

    await this.db.goals.bulkPut(goals);
    return { written: goals.length, skipped: fresh.length - goals.length };
  }

  private async writeWithdrawals(
    rows: JarStatementRow[],
    isNew: (row: JarStatementRow) => boolean,
  ): Promise<{ written: number; skipped: number }> {
    const fresh = rows.filter(isNew);
    const withdrawals: WithdrawalRecord[] = fresh
      .filter((row) => row.category === 'withdrawal')
      .map((row) => ({
        id: row.id,
        // The app holds whole hryvnias: 21.40 is 21.
        amount: Math.round(row.amount),
        title: WITHDRAWAL_TITLE,
        categoryId: FALLBACK_CATEGORY_ID,
        date: row.date,
        timestamp: row.completedAt,
        rewardId: null,
      }));

    await this.db.withdrawals.bulkPut(withdrawals);
    return { written: withdrawals.length, skipped: fresh.length - withdrawals.length };
  }

  private mostFrequent(values: number[]): number {
    const counts = new Map<number, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  private capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
