import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { ScoresChart } from './scores-chart';
import { ClockService } from '../../../../core/services/clock.service';
import type { DailyScore } from '../../../../core/models/daily-score.model';

describe('ScoresChart', () => {
  let component: ScoresChart;
  let fixture: ComponentFixture<ScoresChart>;
  const today = signal('2026-09-07');

  beforeEach(async () => {
    today.set('2026-09-07');

    await TestBed.configureTestingModule({
      imports: [ScoresChart],
      providers: [{ provide: ClockService, useValue: { today } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ScoresChart);
    component = fixture.componentInstance;
  });

  it('should generate 7 day data entries by default when startDate and endDate are not provided', async () => {
    fixture.componentRef.setInput('scores', []);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.chartData().length).toBe(7);
    const barGroups = fixture.debugElement.queryAll(By.css('.chart-bar-group'));
    expect(barGroups.length).toBe(7);
  });

  it('should generate day entries for the provided startDate and endDate range', async () => {
    fixture.componentRef.setInput('startDate', '2026-09-01');
    fixture.componentRef.setInput('endDate', '2026-09-14');
    fixture.componentRef.setInput('scores', []);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.chartData().length).toBe(14);
    expect(component.chartData()[0].startDate).toBe('2026-09-01');
    expect(component.chartData()[13].startDate).toBe('2026-09-14');
  });

  it('should return empty chartData when startDate is after endDate', async () => {
    fixture.componentRef.setInput('startDate', '2026-09-14');
    fixture.componentRef.setInput('endDate', '2026-09-01');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.chartData()).toEqual([]);
  });

  it('should correctly map score values to matching dates in the range', async () => {
    const mockScores: DailyScore[] = [
      {
        date: '2026-09-07',
        score: 10,
        rewardEarned: 500,
        streakAtThisDay: 1,
        createdAt: Date.now(),
      },
    ];

    fixture.componentRef.setInput('scores', mockScores);
    fixture.detectChanges();
    await fixture.whenStable();

    const todayEntry = component.chartData().find((d) => d.startDate === '2026-09-07');
    expect(todayEntry).toBeDefined();
    expect(todayEntry?.score).toBe(10);
    expect(todayEntry?.rewardEarned).toBe(500);
  });

  it('should assign null score and render zero-bar for days without a recorded score', async () => {
    fixture.componentRef.setInput('scores', []);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.chartData().every((d) => d.score === null)).toBe(true);
    const zeroBars = fixture.debugElement.queryAll(By.css('.zero-bar'));
    expect(zeroBars.length).toBe(7);
  });

  it('should apply high-score CSS class to bars with scores >= 9', async () => {
    const mockScores: DailyScore[] = [
      {
        date: '2026-09-07',
        score: 10,
        rewardEarned: 500,
        streakAtThisDay: 1,
        createdAt: Date.now(),
      },
    ];

    fixture.componentRef.setInput('scores', mockScores);
    fixture.detectChanges();
    await fixture.whenStable();

    const highScoreBars = fixture.debugElement.queryAll(By.css('.bar.high-score'));
    expect(highScoreBars.length).toBe(1);
  });

  it('should not apply high-score CSS class to scores below 9', async () => {
    const mockScores: DailyScore[] = [
      {
        date: '2026-09-07',
        score: 7,
        rewardEarned: 0,
        streakAtThisDay: 0,
        createdAt: Date.now(),
      },
    ];

    fixture.componentRef.setInput('scores', mockScores);
    fixture.detectChanges();
    await fixture.whenStable();

    const highScoreBars = fixture.debugElement.queryAll(By.css('.bar.high-score'));
    expect(highScoreBars.length).toBe(0);
  });

  it('should thin x-axis labels when range exceeds 16 days', () => {
    fixture.componentRef.setInput('startDate', '2026-09-01');
    fixture.componentRef.setInput('endDate', '2026-09-30');
    fixture.detectChanges();

    const bars = component.chartData();
    expect(bars.length).toBe(30);
    const visibleLabels = bars.filter((b) => b.shouldShowLabel);
    expect(visibleLabels.length).toBeLessThan(30);
    expect(visibleLabels.length).toBeGreaterThan(0);
    expect(bars[0].shouldShowLabel).toBe(true);
    expect(bars[29].shouldShowLabel).toBe(true);
  });

  it('should show and hide tooltip on hover and click', () => {
    const mockScores: DailyScore[] = [
      {
        date: '2026-09-07',
        score: 9,
        rewardEarned: 100,
        streakAtThisDay: 1,
        createdAt: Date.now(),
      },
    ];
    fixture.componentRef.setInput('scores', mockScores);
    fixture.detectChanges();

    const lastDay = component.chartData().at(-1)!;
    component.onBarMouseEnter(lastDay, { clientX: 100, clientY: 200 } as MouseEvent);
    fixture.detectChanges();

    expect(component.hoveredBar()).toEqual(lastDay);
    expect(component.tooltipAnchor()).toEqual({ x: 100, y: 200 });
    const tooltip = (fixture.nativeElement as HTMLElement).querySelector('.chart-tooltip');
    expect(tooltip?.textContent).toContain('9 / 10');

    component.onBarClick(lastDay, { clientX: 100, clientY: 200 } as MouseEvent);
    expect(component.hoveredBar()).toBeNull();
  });

  describe('ranges longer than 90 days', () => {
    const scoreOn = (date: string, score: number, rewardEarned = 0): DailyScore => ({
      date,
      score,
      rewardEarned,
      streakAtThisDay: 0,
      createdAt: Date.now(),
    });

    // Thursday 1 January to Wednesday 1 April 2026: 91 days.
    const showQuarter = () => {
      fixture.componentRef.setInput('startDate', '2026-01-01');
      fixture.componentRef.setInput('endDate', '2026-04-01');
      fixture.componentRef.setInput('scores', [
        scoreOn('2026-01-05', 9, 100),
        scoreOn('2026-01-06', 10, 500),
        scoreOn('2026-01-07', 8),
        scoreOn('2026-01-12', 7),
        scoreOn('2026-01-13', 8),
      ]);
      fixture.detectChanges();
    };

    it('should still draw one bar per day for exactly 90 days', () => {
      fixture.componentRef.setInput('startDate', '2026-01-01');
      fixture.componentRef.setInput('endDate', '2026-03-31');
      fixture.detectChanges();

      expect(component.chartData()).toHaveLength(90);
      expect(component.heading()).toBe('Daily scores');
    });

    it('should draw one bar per calendar week, cut to the range, past 90 days', () => {
      showQuarter();

      const bars = component.chartData();
      expect(component.heading()).toBe('Weekly average scores');
      expect(bars).toHaveLength(14);
      expect(bars[0]).toMatchObject({ startDate: '2026-01-01', dayCount: 4, score: null });
      expect(bars.at(-1)).toMatchObject({ startDate: '2026-03-30', dayCount: 3 });
    });

    it('should show the average of the scored days in a week, and add up their rewards', () => {
      showQuarter();

      const [, firstFullWeek, secondFullWeek] = component.chartData();
      expect(firstFullWeek).toMatchObject({ score: 9, scoredDays: 3, dayCount: 7, rewardEarned: 600 });
      expect(firstFullWeek.isHighScore).toBe(true);
      expect(secondFullWeek).toMatchObject({ score: 7.5, scoredDays: 2, rewardEarned: 0 });
      expect(secondFullWeek.isHighScore).toBe(false);
    });

    it('should name the whole week in the bar label and the tooltip', () => {
      showQuarter();

      const secondBar = fixture.debugElement.queryAll(By.css('.chart-bar-group'))[1];
      expect(secondBar.attributes['aria-label']).toBe('2026-01-05 – 2026-01-11: Average score 9');

      component.onBarMouseEnter(component.chartData()[2], { clientX: 100, clientY: 200 } as MouseEvent);
      fixture.detectChanges();
      const tooltip = (fixture.nativeElement as HTMLElement).querySelector('.chart-tooltip');
      expect(tooltip?.querySelector('.tooltip-date')?.textContent.trim()).toBe('2026-01-12 – 2026-01-18');
      expect(tooltip?.textContent).toContain('7.5 / 10');
      expect(tooltip?.textContent).toContain('2 / 7');
    });

    it('should draw one bar per calendar month once even weeks would be more than 90 bars', () => {
      // 15 January 2025 to 31 December 2026: about 103 weeks.
      fixture.componentRef.setInput('startDate', '2025-01-15');
      fixture.componentRef.setInput('endDate', '2026-12-31');
      fixture.detectChanges();

      const bars = component.chartData();
      expect(component.heading()).toBe('Monthly average scores');
      expect(bars).toHaveLength(24);
      expect(bars[0]).toMatchObject({ startDate: '2025-01-15', dayCount: 17, axisLabel: "Jan '25" });
      expect(bars.at(-1)?.axisLabel).toBe("Dec '26");
    });

    it('should round an average down, so one just under 9 is not shown as a reward-level 9', () => {
      fixture.componentRef.setInput('startDate', '2025-01-15');
      fixture.componentRef.setInput('endDate', '2026-12-31');
      // February 2025: nineteen 9s and one 8 average 8.95.
      const february = Array.from({ length: 19 }, (_, i) => scoreOn(`2025-02-${String(i + 1).padStart(2, '0')}`, 9));
      fixture.componentRef.setInput('scores', [...february, scoreOn('2025-02-20', 8)]);
      fixture.detectChanges();

      const februaryBar = component.chartData()[1];
      expect(februaryBar).toMatchObject({ startDate: '2025-02-01', score: 8.9, scoredDays: 20 });
      expect(februaryBar.isHighScore).toBe(false);
    });

    it('should draw one bar per calendar year once even months would be more than 90 bars', () => {
      // 1 July 2010 to 31 December 2026: 198 months.
      fixture.componentRef.setInput('startDate', '2010-07-01');
      fixture.componentRef.setInput('endDate', '2026-12-31');
      fixture.componentRef.setInput('scores', [scoreOn('2011-03-01', 10, 500), scoreOn('2011-12-31', 7)]);
      fixture.detectChanges();

      const bars = component.chartData();
      expect(component.heading()).toBe('Yearly average scores');
      expect(bars).toHaveLength(17);
      expect(bars[0]).toMatchObject({ startDate: '2010-07-01', dayCount: 184, axisLabel: '2010', score: null });
      expect(bars[1]).toMatchObject({ startDate: '2011-01-01', score: 8.5, scoredDays: 2, rewardEarned: 500 });
    });

    it('should keep the last month label inside a phone-width chart', () => {
      component.width.set(280);
      // 84 months, so the bars are narrow enough that the last label would overhang the right edge.
      fixture.componentRef.setInput('startDate', '2020-01-01');
      fixture.componentRef.setInput('endDate', '2026-12-31');
      fixture.detectChanges();
      expect(component.heading()).toBe('Monthly average scores');

      // "Dec '26" is drawn centred on axisLabelX, so half of its width lies to the right.
      const lastLabelRightEdge = (component.chartData().at(-1)?.axisLabelX ?? 0) + (7 * 6.6) / 2;
      expect(lastLabelRightEdge).toBeLessThanOrEqual(280);
    });
  });
});
