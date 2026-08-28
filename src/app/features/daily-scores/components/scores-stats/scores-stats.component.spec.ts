import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { ScoresStatsComponent } from './scores-stats.component';
import { DailyScore } from '../../models/daily-score.model';

const TEST_SCORE_TEN = 10;
const TEST_SCORE_NINE = 9;
const TEST_SCORE_EIGHT = 8;
const EXPECTED_AVERAGE_ROUNDED = 8.7;
const STREAK_FIVE = 5;
const ZERO_VALUE = 0;
const DATE_LOCALE_CA = 'en-CA';

describe('ScoresStatsComponent', () => {
  let component: ScoresStatsComponent;
  let fixture: ComponentFixture<ScoresStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoresStatsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScoresStatsComponent);
    component = fixture.componentInstance;
  });

  it('should display default 0 average and 0 streak when no data is provided', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.monthlyAverage).toBe(ZERO_VALUE);
    expect(component.currentStreak).toBe(ZERO_VALUE);
    const noDataEl = fixture.debugElement.query(By.css('.stat-value.no-data'));
    expect(noDataEl.nativeElement.textContent.trim()).toBe('-');
  });

  it('should correctly calculate monthly average rounded to 1 decimal place', async () => {
    const mockMonthlyScores: DailyScore[] = [
      { date: '2026-08-01', score: TEST_SCORE_TEN, rewardEarned: 500, streakAtThisDay: 1, createdAt: 1 },
      { date: '2026-08-02', score: TEST_SCORE_EIGHT, rewardEarned: 0, streakAtThisDay: 0, createdAt: 2 },
      { date: '2026-08-03', score: TEST_SCORE_EIGHT, rewardEarned: 0, streakAtThisDay: 0, createdAt: 3 },
    ];

    component.monthlyScores = mockMonthlyScores;
    component.ngOnChanges();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.monthlyAverage).toBe(EXPECTED_AVERAGE_ROUNDED);
    const statValues = fixture.debugElement.queryAll(By.css('.stat-value'));
    expect(statValues[0].nativeElement.textContent.trim()).toBe('8.7');
  });

  it('should display current streak when latest score is from today', async () => {
    const todayStr = new Date().toLocaleDateString(DATE_LOCALE_CA);
    const mockLatestScore: DailyScore = {
      date: todayStr,
      score: TEST_SCORE_TEN,
      rewardEarned: 500,
      streakAtThisDay: STREAK_FIVE,
      createdAt: Date.now(),
    };

    component.latestScore = mockLatestScore;
    component.ngOnChanges();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.currentStreak).toBe(STREAK_FIVE);
    const streakEl = fixture.debugElement.query(By.css('.stat-value.streak'));
    expect(streakEl.nativeElement.textContent.trim()).toBe('5');
  });

  it('should display current streak when latest score is from yesterday', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString(DATE_LOCALE_CA);

    const mockLatestScore: DailyScore = {
      date: yesterdayStr,
      score: TEST_SCORE_NINE,
      rewardEarned: 100,
      streakAtThisDay: STREAK_FIVE,
      createdAt: Date.now(),
    };

    component.latestScore = mockLatestScore;
    component.ngOnChanges();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.currentStreak).toBe(STREAK_FIVE);
  });

  it('should reset streak to 0 if latest score is older than yesterday', async () => {
    const olderDate = '2026-08-01';
    const mockLatestScore: DailyScore = {
      date: olderDate,
      score: TEST_SCORE_TEN,
      rewardEarned: 500,
      streakAtThisDay: STREAK_FIVE,
      createdAt: Date.now(),
    };

    component.latestScore = mockLatestScore;
    component.ngOnChanges();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.currentStreak).toBe(ZERO_VALUE);
  });
});
