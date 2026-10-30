import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ScoresChart } from './scores-chart';
import { ClockService } from '../../../../core/services/clock.service';
import type { DailyScore } from '../../../../core/models/daily-score.model';

describe('ScoresChart', () => {
  let fixture: ComponentFixture<ScoresChart>;
  const today = signal('2026-09-07');

  const scoreOn = (date: string, score: number, rewardEarned = 0): DailyScore => ({
    date,
    score,
    rewardEarned,
    streakAtThisDay: 0,
    createdAt: Date.now(),
  });

  const host = () => fixture.nativeElement as HTMLElement;
  const groups = () => Array.from(host().querySelectorAll('.chart-bar-group'));
  const ariaLabels = () => groups().map((group) => group.getAttribute('aria-label'));
  const tones = () => groups().map((group) => group.querySelector('.bar-segment')?.getAttribute('data-tone') ?? null);
  const heading = () => host().querySelector('app-section-card h2')?.textContent.trim();
  const legend = () => Array.from(host().querySelectorAll('.legend-item'), (item) => item.textContent.trim());
  const tooltip = () => host().querySelector('.chart-tooltip');
  const tooltipTitle = () => tooltip()?.querySelector('.tooltip-title')?.textContent.trim();
  const tooltipRows = () =>
    Array.from(tooltip()?.querySelectorAll('.tooltip-row') ?? [], (row) => [
      row.querySelector('.row-label')?.textContent.trim(),
      (row.querySelector('.row-text') ?? row.querySelector('app-amount'))?.textContent.trim(),
    ]);

  const render = (inputs: { scores?: DailyScore[]; startDate?: string; endDate?: string }) => {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
  };
  const tap = (index: number) => {
    groups()
      .at(index)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    today.set('2026-09-07');

    await TestBed.configureTestingModule({
      imports: [ScoresChart],
      providers: [{ provide: ClockService, useValue: { today } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ScoresChart);
  });

  it('should chart the last 7 days up to today when no range is given', () => {
    render({ scores: [] });

    expect(groups()).toHaveLength(7);
    expect(ariaLabels()[0]).toBe('2026-09-01: No score');
    expect(ariaLabels().at(-1)).toBe('2026-09-07: No score');
  });

  it('should chart every day of the given range', () => {
    render({ startDate: '2026-09-01', endDate: '2026-09-14', scores: [] });

    expect(groups()).toHaveLength(14);
    expect(ariaLabels()[0]).toBe('2026-09-01: No score');
    expect(ariaLabels().at(-1)).toBe('2026-09-14: No score');
  });

  it('should draw no bars when the range starts after it ends', () => {
    render({ startDate: '2026-09-14', endDate: '2026-09-01' });

    expect(groups()).toHaveLength(0);
  });

  it('should draw a zero bar for every day without a score', () => {
    render({ scores: [] });

    expect(host().querySelectorAll('.zero-bar')).toHaveLength(7);
    expect(host().querySelectorAll('.bar-segment')).toHaveLength(0);
  });

  it('should draw a score of 9 or more in the reward tone, and a lower one in primary', () => {
    render({ scores: [scoreOn('2026-09-05', 8), scoreOn('2026-09-06', 9, 100), scoreOn('2026-09-07', 10, 500)] });

    expect(tones()).toEqual([null, null, null, null, 'primary', 'reward', 'reward']);
    expect(ariaLabels().slice(-3)).toEqual(['2026-09-05: Score 8', '2026-09-06: Score 9', '2026-09-07: Score 10']);
  });

  it('should scale the bars from 0 to 10 in five steps', () => {
    render({ scores: [] });

    const ticks = Array.from(host().querySelectorAll('.axis-label[text-anchor="end"]'), (t) => t.textContent.trim());
    expect(ticks).toEqual(['0', '2', '4', '6', '8', '10']);
  });

  it("should show a day's weekday, score and reward in its tooltip", () => {
    render({ scores: [scoreOn('2026-09-07', 10, 500)] });
    tap(-1);

    expect(tooltipTitle()).toBe('2026-09-07 (Mon)');
    expect(tooltipRows()).toEqual([
      ['Score', '10 / 10'],
      ['Reward', '+500₴'],
    ]);
  });

  it('should leave the reward out of the tooltip when the score earned none', () => {
    render({ scores: [scoreOn('2026-09-07', 7)] });
    tap(-1);

    expect(tooltipRows()).toEqual([['Score', '7 / 10']]);
  });

  it('should say "No score recorded" in the tooltip of an unscored day', () => {
    render({ scores: [] });
    tap(0);

    expect(tooltipTitle()).toBe('2026-09-01 (Tue)');
    expect(tooltipRows()).toEqual([]);
    expect(tooltip()?.querySelector('.tooltip-note')?.textContent.trim()).toBe('No score recorded');
  });

  it('should word the legend for daily scores', () => {
    render({ scores: [] });

    expect(legend()).toEqual(['Score 1–8', 'Score 9–10 (reward)']);
  });

  describe('ranges longer than 90 days', () => {
    // Thursday 1 January to Wednesday 1 April 2026: 91 days.
    const showQuarter = () => {
      render({
        startDate: '2026-01-01',
        endDate: '2026-04-01',
        scores: [
          scoreOn('2026-01-05', 9, 100),
          scoreOn('2026-01-06', 10, 500),
          scoreOn('2026-01-07', 8),
          scoreOn('2026-01-12', 7),
          scoreOn('2026-01-13', 8),
        ],
      });
    };

    it('should still draw one bar per day for exactly 90 days', () => {
      render({ startDate: '2026-01-01', endDate: '2026-03-31' });

      expect(groups()).toHaveLength(90);
      expect(heading()).toBe('Daily scores');
    });

    it('should draw one bar per calendar week, cut to the range, past 90 days', () => {
      showQuarter();

      expect(heading()).toBe('Weekly average scores');
      expect(legend()).toEqual(['Average below 9', 'Average 9–10']);
      expect(groups()).toHaveLength(14);
      expect(ariaLabels()[0]).toBe('2026-01-01 – 2026-01-04: No score');
      expect(ariaLabels().at(-1)).toBe('2026-03-30 – 2026-04-01: No score');
    });

    it('should show the average of the scored days in a week, and add up their rewards', () => {
      showQuarter();

      expect(ariaLabels().slice(1, 3)).toEqual([
        '2026-01-05 – 2026-01-11: Average score 9',
        '2026-01-12 – 2026-01-18: Average score 7.5',
      ]);
      expect(tones().slice(1, 3)).toEqual(['reward', 'primary']);

      tap(1);
      expect(tooltipTitle()).toBe('2026-01-05 – 2026-01-11');
      expect(tooltipRows()).toEqual([
        ['Average score', '9 / 10'],
        ['Days scored', '3 / 7'],
        ['Reward', '+600₴'],
      ]);

      tap(2);
      expect(tooltipRows()).toEqual([
        ['Average score', '7.5 / 10'],
        ['Days scored', '2 / 7'],
      ]);
    });

    it('should draw one bar per calendar month once even weeks would be more than 90 bars', () => {
      // 15 January 2025 to 31 December 2026: about 103 weeks.
      render({ startDate: '2025-01-15', endDate: '2026-12-31' });

      expect(heading()).toBe('Monthly average scores');
      expect(groups()).toHaveLength(24);
      expect(ariaLabels()[0]).toBe('2025-01-15 – 2025-01-31: No score');
      const axisLabels = Array.from(host().querySelectorAll('.chart-bar-group .axis-label'), (l) =>
        l.textContent.trim(),
      );
      expect(axisLabels[0]).toBe("Jan '25");
      expect(axisLabels.at(-1)).toBe("Dec '26");
    });

    it('should round an average down, so one just under 9 is not shown as a reward-level 9', () => {
      // February 2025: nineteen 9s and one 8 average 8.95.
      const february = Array.from({ length: 19 }, (_, i) => scoreOn(`2025-02-${String(i + 1).padStart(2, '0')}`, 9));
      render({ startDate: '2025-01-15', endDate: '2026-12-31', scores: [...february, scoreOn('2025-02-20', 8)] });

      expect(ariaLabels()[1]).toBe('2025-02-01 – 2025-02-28: Average score 8.9');
      expect(tones()[1]).toBe('primary');
      tap(1);
      expect(tooltipRows()).toContainEqual(['Days scored', '20 / 28']);
    });

    it('should draw one bar per calendar year once even months would be more than 90 bars', () => {
      // 1 July 2010 to 31 December 2026: 198 months.
      render({
        startDate: '2010-07-01',
        endDate: '2026-12-31',
        scores: [scoreOn('2011-03-01', 10, 500), scoreOn('2011-12-31', 7)],
      });

      expect(heading()).toBe('Yearly average scores');
      expect(groups()).toHaveLength(17);
      expect(ariaLabels()[0]).toBe('2010-07-01 – 2010-12-31: No score');
      expect(ariaLabels()[1]).toBe('2011-01-01 – 2011-12-31: Average score 8.5');
      tap(1);
      expect(tooltipRows()).toEqual([
        ['Average score', '8.5 / 10'],
        ['Days scored', '2 / 365'],
        ['Reward', '+500₴'],
      ]);
    });
  });
});
