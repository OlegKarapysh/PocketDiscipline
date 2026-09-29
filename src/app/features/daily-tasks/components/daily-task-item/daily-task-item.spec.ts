import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { DailyTaskItem } from './daily-task-item';
import type { DailyTask } from '../../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../../core/models/daily-task-difficulty.model';
import { Amount } from '../../../../shared/components/amount/amount';
import { StreakBadge } from '../../../../shared/components/streak-badge/streak-badge';

const easy: DailyTaskDifficulty = { id: 'easy', name: 'Easy', baseReward: 100 };
const hard: DailyTaskDifficulty = { id: 'hard', name: 'Hard', baseReward: 300 };
const ONE_DAY_MS = 86_400_000;

describe('DailyTaskItem', () => {
  let component: DailyTaskItem;
  let fixture: ComponentFixture<DailyTaskItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyTaskItem],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyTaskItem);
    component = fixture.componentInstance;
  });

  it('should render task title and streak badge when streak > 0', async () => {
    const mockTask: DailyTask = {
      id: 'task-1',
      title: 'Evening Reading',
      difficulties: [easy, hard],
      createdAt: Date.now(),
      streak: 4,
      lastCompletedAt: null,
    };

    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
    await fixture.whenStable();

    const titleEl = fixture.debugElement.query(By.css('.title'));
    const streak = fixture.debugElement.query(By.directive(StreakBadge)).componentInstance as StreakBadge;

    expect((titleEl.nativeElement as HTMLElement).textContent.trim()).toBe('Evening Reading');
    expect(streak.days()).toBe(4);
  });

  it('should not render a streak badge when streak is 0', async () => {
    const mockTask: DailyTask = {
      id: 'task-1',
      title: 'Evening Reading',
      difficulties: [easy],
      createdAt: Date.now(),
      streak: 0,
      lastCompletedAt: null,
    };

    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.directive(StreakBadge))).toBeNull();
  });

  it('should compute isCompletedToday as false and render difficulty action buttons when uncompleted', async () => {
    const mockTask: DailyTask = {
      id: 'task-1',
      title: 'Evening Reading',
      difficulties: [easy, hard],
      createdAt: Date.now(),
      streak: 0,
      lastCompletedAt: null,
    };

    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isCompletedToday()).toBe(false);

    const buttons = fixture.debugElement.queryAll(By.css('.actions button'));
    expect(buttons.length).toBe(2);

    const rewards = fixture.debugElement.queryAll(By.directive(Amount)).map((el) => el.componentInstance as Amount);
    expect(rewards.map((amount) => amount.value())).toEqual([easy.baseReward, hard.baseReward]);
    expect(rewards.every((amount) => amount.showSign())).toBe(true);
  });

  it('should emit complete event when a difficulty button is clicked', async () => {
    const mockTask: DailyTask = {
      id: 'task-1',
      title: 'Evening Reading',
      difficulties: [easy, hard],
      createdAt: Date.now(),
      streak: 0,
      lastCompletedAt: null,
    };

    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
    await fixture.whenStable();

    let emittedDifficulty: DailyTaskDifficulty | null = null;
    component.complete.subscribe((diff) => {
      emittedDifficulty = diff;
    });

    const buttons = fixture.debugElement.queryAll(By.css('.actions button'));
    (buttons[1].nativeElement as HTMLElement).click(); // Hard difficulty

    expect(emittedDifficulty).toEqual(hard);
  });

  it('should compute isCompletedToday as true and mark the task as completed when completed today', async () => {
    const mockTask: DailyTask = {
      id: 'task-1',
      title: 'Evening Reading',
      difficulties: [easy],
      createdAt: Date.now(),
      streak: 1,
      lastCompletedAt: Date.now(),
    };

    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isCompletedToday()).toBe(true);

    const doneIcon = fixture.debugElement.query(By.css('[aria-label="Completed today"]'));
    expect(doneIcon).toBeTruthy();
    expect((doneIcon.nativeElement as HTMLElement).getAttribute('aria-hidden')).toBe('false');

    const actions = fixture.debugElement.query(By.css('.actions'));
    expect(actions).toBeNull();
  });

  it('should compute isCompletedToday as false when lastCompletedAt was yesterday', async () => {
    const yesterday = Date.now() - ONE_DAY_MS;
    const mockTask: DailyTask = {
      id: 'task-1',
      title: 'Evening Reading',
      difficulties: [easy],
      createdAt: Date.now() - 5 * ONE_DAY_MS,
      streak: 1,
      lastCompletedAt: yesterday,
    };

    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isCompletedToday()).toBe(false);
  });
});
