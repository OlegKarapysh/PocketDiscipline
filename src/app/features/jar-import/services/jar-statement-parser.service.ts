import { Service } from '@angular/core';
import { DATE_LOCALE_CA } from '../../../core/constants/date-locale.const';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { COUNTED, ENVELOPE, GRADED, POMODORO, SCORE, TIMED, TOP_UP } from '../constants/jar-comment-patterns.const';
import { JAR_LABEL_ALIASES } from '../constants/jar-label-aliases.const';
import {
  JAR_DEPOSIT_CATEGORY,
  JAR_STATEMENT_HEADER,
  JAR_WITHDRAWAL_CATEGORY,
} from '../constants/jar-statement-format.const';
import type { JarReward } from '../models/jar-reward.model';
import type { JarRowCategory } from '../models/jar-row-category.type';
import type { JarStatementRow } from '../models/jar-statement-row.model';

const FIELD_COUNT = 8;
const QUOTED_MAX_LENGTH = 40;
const DATE_TIME = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/;
const AMOUNT = /^\d+(?:\.\d{1,2})?$/;
const CATEGORIES: Readonly<Record<string, JarRowCategory>> = {
  [JAR_DEPOSIT_CATEGORY]: 'deposit',
  [JAR_WITHDRAWAL_CATEGORY]: 'withdrawal',
};
// A graded label is a habit, not a one-off, from this many rows on, or as soon as it carries a bonus.
const RECURRING_FROM_ROWS = 3;

@Service()
export class JarStatementParserService {
  /**
   * Reads a monobank jar statement: every row with its identity, its effective day, and, for a
   * deposit, its classified comment. Throws an `Error` whose message names the problem, and the
   * line, when the text is not a jar statement or a row cannot be read.
   */
  parse(text: string): JarStatementRow[] {
    const lines = text.replace(/^\uFEFF/u, '').split(/\r?\n/u);
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

    if (lines[0] !== JAR_STATEMENT_HEADER) {
      throw new Error('This is not a monobank jar statement.');
    }
    if (lines.length === 1) {
      throw new Error('The statement has no rows.');
    }

    const rows: JarStatementRow[] = [];
    const lineById = new Map<string, number>();
    lines.slice(1).forEach((content, index) => {
      const row = this.parseRow(content, index + 2);
      const repeated = lineById.get(row.id);
      if (repeated !== undefined) {
        throw new Error(`Line ${String(row.line)} repeats line ${String(repeated)}.`);
      }
      lineById.set(row.id, row.line);
      rows.push(row);
    });

    return this.demoteOneOffs(rows);
  }

  /** The form labels and titles are compared in: whitespace collapsed, lower case, ё as е. */
  fold(text: string): string {
    return text.replace(/\s+/gu, ' ').trim().toLowerCase().replace(/ё/gu, 'е');
  }

  private parseRow(content: string, line: number): JarStatementRow {
    const unreadable = (what: string) => new Error(`Line ${String(line)} could not be read: ${what}.`);
    // A value from the file, cut so that a garbled file cannot fill the screen.
    const quote = (value: string) =>
      `"${value.length > QUOTED_MAX_LENGTH ? `${value.slice(0, QUOTED_MAX_LENGTH)}…` : value}"`;

    const fields = this.splitFields(content);
    if (fields?.length !== FIELD_COUNT) throw unreadable(`expected ${String(FIELD_COUNT)} fields`);
    const [dateTime, categoryName, amountText, , , comment, balanceText] = fields;

    const parts = DATE_TIME.exec(dateTime)?.slice(1).map(Number);
    if (!parts) throw unreadable(`${quote(dateTime)} is not a date and time`);
    const [day, month, year, hours, minutes] = parts;
    const bankTime = new Date(year, month - 1, day, hours, minutes);
    if (bankTime.getDate() !== day || bankTime.getMonth() !== month - 1 || bankTime.getHours() !== hours) {
      throw unreadable(`${quote(dateTime)} is not a date and time`);
    }

    const category = CATEGORIES[categoryName] as JarRowCategory | undefined;
    if (!category) throw unreadable(`unknown operation ${quote(categoryName)}`);
    if (!AMOUNT.test(amountText)) throw unreadable(`${quote(amountText)} is not an amount`);
    if (!AMOUNT.test(balanceText)) throw unreadable(`${quote(balanceText)} is not a balance`);

    const amount = Number(amountText);
    const reward = category === 'deposit' ? this.classify(comment, amount) : null;
    // A row marked as yesterday's was earned on the day before it was paid: at the end of that day.
    const completedAt = reward?.shifted ? new Date(year, month - 1, day - 1, 23, 59) : bankTime;

    return {
      id: `jar-${this.stamp(parts)}-${String(this.toKopiykas(balanceText))}`,
      line,
      category,
      completedAt: completedAt.getTime(),
      date: completedAt.toLocaleDateString(DATE_LOCALE_CA),
      amount,
      reward,
    };
  }

  // Fields are comma-separated; a quoted field runs to the next quote. The export never puts a quote
  // inside a field, so there is no escaping to undo.
  private splitFields(content: string): string[] | null {
    const fields: string[] = [];
    let start = 0;
    while (start <= content.length) {
      if (content[start] === '"') {
        const close = content.indexOf('"', start + 1);
        if (close < 0 || (close + 1 < content.length && content[close + 1] !== ',')) return null;
        fields.push(content.slice(start + 1, close));
        start = close + 2;
      } else {
        const comma = content.indexOf(',', start);
        const end = comma < 0 ? content.length : comma;
        fields.push(content.slice(start, end));
        start = end + 1;
      }
    }
    return fields;
  }

  private stamp([day, month, year, hours, minutes]: number[]): string {
    return [year, month, day, hours, minutes].map((part) => String(part).padStart(2, '0')).join('');
  }

  // From the text, so 1234.56 is exactly 123456 and never 123455.99999.
  private toKopiykas(text: string): number {
    const [hryvnias, kopiykas = ''] = text.split('.');
    return Number(hryvnias) * 100 + Number(kopiykas.padEnd(2, '0'));
  }

  private classify(comment: string, amount: number): JarReward {
    // ENVELOPE matches any text: every one of its parts is optional.
    const envelope = ENVELOPE.exec(comment)?.groups ?? {};
    const text = (envelope['body'] ?? '').replace(/\s+/gu, ' ').trim();
    const body = this.fold(text);
    const bonus = envelope['bonus'] ? Number(envelope['bonus']) : 0;

    const reward: JarReward = {
      kind: 'free',
      text,
      label: body,
      level: null,
      measure: null,
      score: null,
      engagement: null,
      sessions: null,
      bonus,
      baseReward: Math.round(amount / (1 + bonus / 100)),
      shifted: Boolean(envelope['shiftBefore'] || envelope['shiftInBonus'] || envelope['shiftAfter']),
      completed: Boolean(envelope['doneParen'] || envelope['doneWord']),
    };

    let match: Record<string, string | undefined> | undefined;
    if ((match = SCORE.exec(body)?.groups)) {
      return { ...reward, kind: 'score', score: Number(match['score']) };
    }
    if ((match = POMODORO.exec(body)?.groups)) {
      return {
        ...reward,
        kind: 'pomodoro',
        engagement: match['kind']?.startsWith('уч') ? EngagementType.STUDY : EngagementType.WORK,
        sessions: match['sessions'] ? Number(match['sessions']) : null,
      };
    }
    if ((match = TIMED.exec(body)?.groups)) {
      const measure = Number(match['minutes']) * 60 + Number(match['seconds']);
      return { ...reward, ...this.alias(match['label'] ?? '', null), kind: 'timed', measure };
    }
    if ((match = COUNTED.exec(body)?.groups)) {
      return { ...reward, ...this.alias(match['label'] ?? '', null), kind: 'counted', measure: Number(match['count']) };
    }
    if (TOP_UP.test(body)) {
      return { ...reward, kind: 'top-up' };
    }
    if ((match = GRADED.exec(body)?.groups)) {
      return { ...reward, ...this.alias(match['habit'] ?? '', match['level'] ?? null), kind: 'graded' };
    }
    return reward;
  }

  private alias(rawLabel: string, rawLevel: string | null): Pick<JarReward, 'label' | 'level'> {
    const label = this.fold(rawLabel);
    const level = rawLevel === null ? null : this.fold(rawLevel);
    const alias = JAR_LABEL_ALIASES[label] as { label: string; level?: string } | undefined;
    return alias ? { label: alias.label, level: level ?? alias.level ?? null } : { label, level };
  }

  // A graded label used once or twice and never with a bonus was a one-off reward, not a habit: it
  // becomes free text. Counted over the aliased label, so spellings of one habit count together.
  private demoteOneOffs(rows: JarStatementRow[]): JarStatementRow[] {
    const rewards = rows.flatMap((row) => (row.reward ? [row.reward] : []));
    const habitual = ['graded', 'timed', 'counted'];
    const uses = new Map<string, { count: number; bonus: boolean }>();
    for (const reward of rewards.filter((r) => habitual.includes(r.kind))) {
      const use = uses.get(reward.label) ?? { count: 0, bonus: false };
      uses.set(reward.label, { count: use.count + 1, bonus: use.bonus || reward.bonus > 0 });
    }

    return rows.map((row) => {
      const reward = row.reward;
      if (reward?.kind !== 'graded') return row;
      const use = uses.get(reward.label);
      if (use && (use.bonus || use.count >= RECURRING_FROM_ROWS)) return row;
      return { ...row, reward: { ...reward, kind: 'free', label: this.fold(reward.text), level: null } };
    });
  }
}
