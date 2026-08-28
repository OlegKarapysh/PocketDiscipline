import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { DailyScoresPageComponent } from './daily-scores-page.component';
import { DailyScoresService } from '../services/daily-scores.service';
import { DailyScore } from '../models/daily-score.model';

const TEST_SCORE_TEN = 10;
const TEST_SCORE_SEVEN = 7;
const TEST_REWARD_500 = 500;
const TEST_STREAK_ONE = 1;
const TEST_NO_REWARD = 0;
const TEST_NO_STREAK = 0;

describe('DailyScoresPageComponent', () => {
  let component: DailyScoresPageComponent;
  let fixture: ComponentFixture<DailyScoresPageComponent>;
  let dailyScoresServiceMock: {
    getTodayScore: ReturnType<typeof vi.fn>;
    getCurrentMonthScores: ReturnType<typeof vi.fn>;
    getLast7DaysScores: ReturnType<typeof vi.fn>;
    saveTodayScore: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    dailyScoresServiceMock = {
      getTodayScore: vi.fn().mockReturnValue(of(undefined)),
      getCurrentMonthScores: vi.fn().mockReturnValue(of([])),
      getLast7DaysScores: vi.fn().mockReturnValue(of([])),
      saveTodayScore: vi.fn().mockResolvedValue({ reward: TEST_REWARD_500, newStreak: TEST_STREAK_ONE }),
    };

    await TestBed.configureTestingModule({
      imports: [DailyScoresPageComponent],
      providers: [
        { provide: DailyScoresService, useValue: dailyScoresServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyScoresPageComponent);
    component = fixture.componentInstance;
  });

  it('should load today score, monthly scores, and weekly scores on init', async () => {
    const mockTodayScore: DailyScore = {
      date: '2026-08-28',
      score: TEST_SCORE_TEN,
      rewardEarned: TEST_REWARD_500,
      streakAtThisDay: TEST_STREAK_ONE,
      createdAt: Date.now(),
    };

    dailyScoresServiceMock.getTodayScore.mockReturnValue(of(mockTodayScore));
    dailyScoresServiceMock.getCurrentMonthScores.mockReturnValue(of([mockTodayScore]));
    dailyScoresServiceMock.getLast7DaysScores.mockReturnValue(of([mockTodayScore]));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.loading).toBe(false);
    expect(component.hasScoreToday).toBe(true);
    expect(component.currentScore).toBe(TEST_SCORE_TEN);
    expect(component.monthlyScores.length).toBe(1);
    expect(component.weeklyScores.length).toBe(1);
    expect(component.latestScore).toEqual(mockTodayScore);
  });

  it('should set hasScoreToday to false when no score is recorded for today', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.loading).toBe(false);
    expect(component.hasScoreToday).toBe(false);
    expect(component.currentScore).toBeNull();
  });

  it('should submit today score and show reward success message when reward > 0', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onScoreSubmit(TEST_SCORE_TEN);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dailyScoresServiceMock.saveTodayScore).toHaveBeenCalledWith(TEST_SCORE_TEN);
    expect(component.successMessage).toContain('Awesome! You earned 500₴. Current high score streak: 1');
  });

  it('should show encouragement message when score submitted earns no reward', async () => {
    dailyScoresServiceMock.saveTodayScore.mockResolvedValue({
      reward: TEST_NO_REWARD,
      newStreak: TEST_NO_STREAK,
    });

    fixture.detectChanges();
    await fixture.whenStable();

    await component.onScoreSubmit(TEST_SCORE_SEVEN);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dailyScoresServiceMock.saveTodayScore).toHaveBeenCalledWith(TEST_SCORE_SEVEN);
    expect(component.successMessage).toBe('Score saved! Aim for a 9 or 10 tomorrow to earn rewards!');
  });

  it('should handle submission failure gracefully', async () => {
    dailyScoresServiceMock.saveTodayScore.mockRejectedValue(new Error('Database error'));

    fixture.detectChanges();
    await fixture.whenStable();

    await component.onScoreSubmit(TEST_SCORE_TEN);

    expect(component.loading).toBe(false);
  });
});
