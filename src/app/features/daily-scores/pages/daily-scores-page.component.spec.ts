import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { Subject, of, throwError } from 'rxjs';
import { DailyScoresPageComponent } from './daily-scores-page.component';
import { DailyScoresService } from '../services/daily-scores.service';
import { DailyScore } from '../models/daily-score.model';

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
      saveTodayScore: vi.fn().mockResolvedValue({ reward: 500, newStreak: 1 }),
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
      score: 10,
      rewardEarned: 500,
      streakAtThisDay: 1,
      createdAt: Date.now(),
    };

    dailyScoresServiceMock.getTodayScore.mockReturnValue(of(mockTodayScore));
    dailyScoresServiceMock.getCurrentMonthScores.mockReturnValue(of([mockTodayScore]));
    dailyScoresServiceMock.getLast7DaysScores.mockReturnValue(of([mockTodayScore]));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.loading()).toBe(false);
    expect(component.hasScoreToday()).toBe(true);
    expect(component.currentScore()).toBe(10);
    expect(component.monthlyScores().length).toBe(1);
    expect(component.weeklyScores().length).toBe(1);
    expect(component.latestScore()).toEqual(mockTodayScore);
  });

  it('should set hasScoreToday to false when no score is recorded for today', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.loading()).toBe(false);
    expect(component.hasScoreToday()).toBe(false);
    expect(component.currentScore()).toBeNull();
  });

  it('should render loading container when loading is true and replace with score components when false', async () => {
    const pendingSubject = new Subject<DailyScore | undefined>();
    dailyScoresServiceMock.getTodayScore.mockReturnValue(pendingSubject);
    dailyScoresServiceMock.getCurrentMonthScores.mockReturnValue(of([]));
    dailyScoresServiceMock.getLast7DaysScores.mockReturnValue(of([]));

    component.loadData();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.loading()).toBe(true);
    expect(fixture.debugElement.query(By.css('.loading-container'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-scores-stats'))).toBeNull();

    pendingSubject.next(undefined);
    pendingSubject.complete();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.loading()).toBe(false);
    expect(fixture.debugElement.query(By.css('.loading-container'))).toBeNull();
    expect(fixture.debugElement.query(By.css('app-scores-stats'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-scores-chart'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-score-input'))).toBeTruthy();
  });

  it('should submit today score and show reward success message when reward > 0', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    await component.onScoreSubmit(10);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dailyScoresServiceMock.saveTodayScore).toHaveBeenCalledWith(10);
    expect(component.successMessage()).toContain('Awesome! You earned 500₴. Current high score streak: 1');
  });

  it('should show encouragement message when score submitted earns no reward', async () => {
    dailyScoresServiceMock.saveTodayScore.mockResolvedValue({
      reward: 0,
      newStreak: 0,
    });

    fixture.detectChanges();
    await fixture.whenStable();

    await component.onScoreSubmit(7);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dailyScoresServiceMock.saveTodayScore).toHaveBeenCalledWith(7);
    expect(component.successMessage()).toBe('Score saved! Aim for a 9 or 10 tomorrow to earn rewards!');
  });

  it('should handle submission failure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // suppress expected error output
    });
    dailyScoresServiceMock.saveTodayScore.mockRejectedValue(new Error('Database error'));

    fixture.detectChanges();
    await fixture.whenStable();

    await component.onScoreSubmit(10);

    expect(component.loading()).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to save score', expect.any(Error));
  });

  it('should handle data loading failure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // suppress expected error output
    });
    dailyScoresServiceMock.getTodayScore.mockReturnValue(throwError(() => new Error('Network error')));

    component.loadData();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.loading()).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
