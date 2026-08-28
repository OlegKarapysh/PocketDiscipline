import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { ScoresChartComponent } from './scores-chart.component';
import { DailyScore } from '../../models/daily-score.model';

const SEVEN_DAYS_COUNT = 7;
const TEST_SCORE_TEN = 10;
const TEST_SCORE_SEVEN = 7;
const DATE_LOCALE_CA = 'en-CA';

describe('ScoresChartComponent', () => {
  let component: ScoresChartComponent;
  let fixture: ComponentFixture<ScoresChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoresChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScoresChartComponent);
    component = fixture.componentInstance;
  });

  it('should generate 7 day data entries when initialized or changed', async () => {
    component.scores = [];
    component.ngOnChanges();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.chartData.length).toBe(SEVEN_DAYS_COUNT);
    const barWrappers = fixture.debugElement.queryAll(By.css('.bar-wrapper'));
    expect(barWrappers.length).toBe(SEVEN_DAYS_COUNT);
  });

  it('should correctly map score values to matching dates in the last 7 days', async () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString(DATE_LOCALE_CA);

    const mockScores: DailyScore[] = [
      {
        date: todayStr,
        score: TEST_SCORE_TEN,
        rewardEarned: 500,
        streakAtThisDay: 1,
        createdAt: Date.now(),
      },
    ];

    component.scores = mockScores;
    component.ngOnChanges();
    fixture.detectChanges();
    await fixture.whenStable();

    const todayEntry = component.chartData.find((d) => d.date === todayStr);
    expect(todayEntry).toBeDefined();
    expect(todayEntry?.score).toBe(TEST_SCORE_TEN);
  });

  it('should assign null score for days without a recorded score', async () => {
    component.scores = [];
    component.ngOnChanges();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.chartData.every((d) => d.score === null)).toBe(true);
  });

  it('should apply high-score CSS class to bars with scores >= 9', async () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString(DATE_LOCALE_CA);

    const mockScores: DailyScore[] = [
      {
        date: todayStr,
        score: TEST_SCORE_TEN,
        rewardEarned: 500,
        streakAtThisDay: 1,
        createdAt: Date.now(),
      },
    ];

    component.scores = mockScores;
    component.ngOnChanges();
    fixture.detectChanges();
    await fixture.whenStable();

    const highScoreBars = fixture.debugElement.queryAll(By.css('.bar.high-score'));
    expect(highScoreBars.length).toBe(1);
  });

  it('should not apply high-score CSS class to scores below 9', async () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString(DATE_LOCALE_CA);

    const mockScores: DailyScore[] = [
      {
        date: todayStr,
        score: TEST_SCORE_SEVEN,
        rewardEarned: 0,
        streakAtThisDay: 0,
        createdAt: Date.now(),
      },
    ];

    component.scores = mockScores;
    component.ngOnChanges();
    fixture.detectChanges();
    await fixture.whenStable();

    const highScoreBars = fixture.debugElement.queryAll(By.css('.bar.high-score'));
    expect(highScoreBars.length).toBe(0);
  });
});
