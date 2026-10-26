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
    expect(component.chartData()[0].date).toBe('2026-09-01');
    expect(component.chartData()[13].date).toBe('2026-09-14');
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

    const todayEntry = component.chartData().find((d) => d.date === '2026-09-07');
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

    expect(component.hoveredDay()).toEqual(lastDay);
    expect(component.tooltipPosition()).toEqual({ x: 110, y: 215 });
    const tooltip = (fixture.nativeElement as HTMLElement).querySelector('.chart-tooltip');
    expect(tooltip?.textContent).toContain('9 / 10');

    component.onBarClick(lastDay, { clientX: 100, clientY: 200 } as MouseEvent);
    expect(component.hoveredDay()).toBeNull();
  });
});
