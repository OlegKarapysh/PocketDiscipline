import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { JAR_STATEMENT_HEADER } from '../constants/jar-statement-format.const';
import type { JarReward } from '../models/jar-reward.model';
import { JAR_STATEMENT_FIXTURE, jarStatementOf } from '../testing/jar-statement.fixture';
import { JarStatementParserService } from './jar-statement-parser.service';

describe('JarStatementParserService', () => {
  let parser: JarStatementParserService;

  beforeEach(() => {
    parser = TestBed.inject(JarStatementParserService);
  });

  const readOne = (comment: string, amount = '100.00', dateTime = '10.09.2026 12:00') =>
    parser.parse(jarStatementOf([[dateTime, amount, comment]]))[0];
  const rewardOf = (comment: string, amount?: string): JarReward => {
    const reward = readOne(comment, amount).reward;
    if (!reward) throw new Error('expected a deposit');
    return reward;
  };

  describe('the file', () => {
    it('rejects a file whose header is not the jar header', () => {
      const text = JAR_STATEMENT_FIXTURE.replace('Коментар до платежу', 'Коментар');
      expect(() => parser.parse(text)).toThrow('This is not a monobank jar statement.');
    });

    it('rejects an empty file and a header with no rows', () => {
      expect(() => parser.parse('')).toThrow('This is not a monobank jar statement.');
      expect(() => parser.parse(`${JAR_STATEMENT_HEADER}\n`)).toThrow('The statement has no rows.');
    });

    it('names the line of a row it cannot read', () => {
      const broken = (row: string) => `${JAR_STATEMENT_HEADER}\n${row}\n`;
      expect(() => parser.parse(broken('10.09.2026 12:00,Разові поповнення,100.00,UAH'))).toThrow(/^Line 2 /);
      expect(() => parser.parse(broken('31.02.2026 12:00,Разові поповнення,100.00,UAH,"","Йога",100.00,UAH'))).toThrow(
        /^Line 2 .*not a date/,
      );
      expect(() => parser.parse(broken('10.09.2026 12:00,Переказ,100.00,UAH,"","Йога",100.00,UAH'))).toThrow(
        /^Line 2 .*unknown operation/,
      );
      expect(() => parser.parse(broken('10.09.2026 12:00,Разові поповнення,1e3,UAH,"","Йога",100.00,UAH'))).toThrow(
        /^Line 2 .*not an amount/,
      );
    });

    it('cuts a long value it quotes', () => {
      const row = `${'x'.repeat(500)},Разові поповнення,100.00,UAH,"","Йога",100.00,UAH`;
      expect(() =>
        parser.parse(`${JAR_STATEMENT_HEADER}
${row}
`),
      ).toThrow(`"${'x'.repeat(40)}…" is not a date`);
    });

    it('rejects a row that repeats another one', () => {
      const row = '10.09.2026 12:00,Разові поповнення,100.00,UAH,"","Йога",100.00,UAH';
      expect(() => parser.parse(`${JAR_STATEMENT_HEADER}\n${row}\n${row}\n`)).toThrow('Line 3 repeats line 2.');
    });

    it('accepts Windows line endings and a byte order mark', () => {
      const text = '\uFEFF' + JAR_STATEMENT_FIXTURE.replaceAll('\n', '\r\n');
      expect(parser.parse(text)).toHaveLength(56);
    });

    it('reads the date and time as local time', () => {
      const row = readOne('Йога', '100.00', '10.09.2026 07:05');
      const at = new Date(row.completedAt);

      expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), at.getMinutes()]).toEqual([
        2026, 8, 10, 7, 5,
      ]);
      expect(row.date).toBe('2026-09-10');
    });

    it('identifies a row by its time and closing balance in kopiykas', () => {
      // The builder starts the jar at 5 000 ₴, so one 100 ₴ deposit closes it at 5 100.00.
      expect(readOne('Йога', '100.00', '10.09.2026 07:05').id).toBe('jar-202609100705-510000');
    });

    it('reads a withdrawal, kopiykas included, with no reward', () => {
      const [row] = parser.parse(jarStatementOf([['10.09.2026 12:00', '21.40', null]]));
      expect(row).toMatchObject({ category: 'withdrawal', amount: 21.4, reward: null });
    });

    it('classifies every row of the synthetic statement', () => {
      const rows = parser.parse(JAR_STATEMENT_FIXTURE);
      const kinds: Record<string, number> = {};
      for (const row of rows) {
        if (row.reward) kinds[row.reward.kind] = (kinds[row.reward.kind] ?? 0) + 1;
      }

      expect(rows).toHaveLength(56);
      expect(rows.filter((row) => row.category === 'withdrawal')).toHaveLength(2);
      expect(kinds).toEqual({ graded: 24, free: 2, counted: 10, timed: 9, pomodoro: 4, score: 4, 'top-up': 1 });
      expect(rows.filter((row) => row.reward?.shifted)).toHaveLength(4);
    });
  });

  describe('the day-shift marker', () => {
    it.each([
      '(yesterday) Йога',
      '(Yesterday)  Йога (+20%)',
      '(вчера) Йога',
      'Йога (вчера)',
      'Йога (yesterday)',
      'Йога (+20%) (yesterday)',
      'Йога (+20% yesterday)',
      'Йога (+20% yessterday)',
    ])('moves "%s" to 23:59 of the day before', (comment) => {
      const row = readOne(comment, '100.00', '10.09.2026 07:05');
      const at = new Date(row.completedAt);

      expect(row.reward?.shifted).toBe(true);
      expect(row.reward?.label).toBe('йога');
      expect(row.date).toBe('2026-09-09');
      expect([at.getDate(), at.getHours(), at.getMinutes()]).toEqual([9, 23, 59]);
    });

    it('moves the first of a month to the last day of the one before', () => {
      expect(readOne('(вчера) Йога', '100.00', '01.03.2026 08:00').date).toBe('2026-02-28');
    });

    it('leaves a row without a marker on its bank day', () => {
      const row = readOne('Йога (+20%)', '120.00', '10.09.2026 07:05');
      expect(row.reward?.shifted).toBe(false);
      expect(row.date).toBe('2026-09-10');
    });
  });

  describe('the streak bonus', () => {
    it.each([
      ['Холодный душ (+100%)', 100],
      ['Холодный душ (100%)', 100],
      ['Холодный душ (+100%', 100],
      ['душ(+100%)', 100],
      ['Холодный душ (+30%)', 30],
      ['Холодный душ', 0],
    ])('reads "%s" as %i%%', (comment, bonus) => {
      const reward = rewardOf(comment, '200.00');
      expect(reward.bonus).toBe(bonus);
      expect(reward.label).toBe('холодный душ');
    });

    it('takes the bonus out of the base reward and rounds it', () => {
      expect(rewardOf('Легкая полная тренировка (+50%)', '113.00').baseReward).toBe(75);
      expect(rewardOf('Холодный душ (+100%)', '200.00').baseReward).toBe(100);
    });
  });

  describe('the body', () => {
    it('folds whitespace, case and ё', () => {
      const reward = rewardOf('  лёгкая   ТРЕНИРОВКА  (+20%)', '60.00');
      expect(reward).toMatchObject({ kind: 'graded', label: 'тренировка', level: 'легкая', text: 'лёгкая ТРЕНИРОВКА' });
    });

    it.each(['Sally up 3:50 (COMPLETED!)', 'Sally up 3:50 (completed)', 'Sally up 3:50 completed'])(
      'marks "%s" as completed',
      (comment) => {
        expect(rewardOf(comment, '3000.00')).toMatchObject({ kind: 'timed', completed: true, measure: 230 });
      },
    );

    it('reads scores', () => {
      expect(rewardOf('10/10')).toMatchObject({ kind: 'score', score: 10 });
      expect(rewardOf('9/10 (+30%)', '130.00')).toMatchObject({ kind: 'score', score: 9, bonus: 30 });
    });

    it.each([
      ['Помидор работа 2', EngagementType.WORK, 2],
      ['Помилор учеба', EngagementType.STUDY, null],
      ['помидор учёба 3', EngagementType.STUDY, 3],
      ['Помидор', EngagementType.WORK, null],
    ])('reads "%s" as a pomodoro', (comment, engagement, sessions) => {
      expect(rewardOf(comment)).toMatchObject({ kind: 'pomodoro', engagement, sessions });
    });

    it('reads a time as seconds and a count as reps', () => {
      expect(rewardOf('Sally up 3:05')).toMatchObject({ kind: 'timed', label: 'sally up', measure: 185 });
      expect(rewardOf('Подтягивания 25')).toMatchObject({ kind: 'counted', label: 'подтягивания', measure: 25 });
    });

    it('reads a top-up', () => {
      expect(rewardOf('Поповнення рахунку банки').kind).toBe('top-up');
    });

    it('keeps anything else as free text', () => {
      expect(rewardOf('Челлендж: 15 подтягиваний (выполнено 28 мая)', '500.00')).toMatchObject({
        kind: 'free',
        text: 'Челлендж: 15 подтягиваний (выполнено 28 мая)',
      });
    });
  });

  describe('labels', () => {
    // Oldest first, in the order given: the statement itself lists the newest first.
    const labelsOf = (comments: string[]) =>
      parser
        .parse(jarStatementOf(comments.map((comment, i) => [`1${String(i)}.09.2026 12:00`, '100.00', comment])))
        .map((row) => row.reward)
        .reverse();

    it('applies the aliases', () => {
      expect(labelsOf(['речью дня (+10%)', 'Холодный (+10%)', 'душ (+10%)', 'Заметка 3', 'Заметки 2'])).toEqual([
        expect.objectContaining({ label: 'ревью дня' }),
        expect.objectContaining({ label: 'холодный душ', level: null }),
        expect.objectContaining({ label: 'холодный душ', level: null }),
        expect.objectContaining({ label: 'заметки', measure: 3 }),
        expect.objectContaining({ label: 'заметки', measure: 2 }),
      ]);
      expect(rewardOf('Холодная ванна (+30%)', '260.00')).toMatchObject({
        label: 'холодный душ',
        level: 'холодная ванна',
      });
      expect(rewardOf('Первая заметка (+30%)', '130.00').label).toBe('заметки');
    });

    it('treats a graded label used once or twice without a bonus as a one-off', () => {
      const kinds = labelsOf(['Заказал витамины', 'Гитара', 'Гитара']).map((reward) => reward?.kind);
      expect(kinds).toEqual(['free', 'free', 'free']);
    });

    it('treats a graded label with a bonus, or used three times, as a habit', () => {
      expect(labelsOf(['Гитара (+10%)']).map((reward) => reward?.kind)).toEqual(['graded']);
      expect(labelsOf(['Гитара', 'Гитара', 'легкая гитара']).map((reward) => reward?.kind)).toEqual([
        'graded',
        'graded',
        'graded',
      ]);
    });

    it('counts the spellings of one habit together', () => {
      expect(labelsOf(['речью дня', 'Ревью дня', 'Ревью дня']).map((reward) => reward?.kind)).toEqual([
        'graded',
        'graded',
        'graded',
      ]);
    });
  });
});
