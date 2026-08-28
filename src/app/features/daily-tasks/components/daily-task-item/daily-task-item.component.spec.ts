import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { DailyTaskItemComponent } from './daily-task-item.component';
import { DailyTask, DailyTaskDifficulty } from '../../models/daily-task.model';

const TEST_TASK_TITLE = 'Evening Reading';
const EASY_DIFFICULTY: DailyTaskDifficulty = { id: 'easy', name: 'Easy', baseReward: 100 };
const HARD_DIFFICULTY: DailyTaskDifficulty = { id: 'hard', name: 'Hard', baseReward: 300 };
const STREAK_FOUR = 4;
const ONE_DAY_MS = 86_400_000;

describe('DailyTaskItemComponent', () => {
  let component: DailyTaskItemComponent;
  let fixture: ComponentFixture<DailyTaskItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyTaskItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyTaskItemComponent);
    component = fixture.componentInstance;
  });

  it('should render task title and streak badge when streak > 0', async () => {
    const mockTask: DailyTask = {
      id: 'task-1',
      title: TEST_TASK_TITLE,
      difficulties: [EASY_DIFFICULTY, HARD_DIFFICULTY],
      createdAt: Date.now(),
      streak: STREAK_FOUR,
      lastCompletedAt: null,
    };

    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
    await fixture.whenStable();

    const titleEl = fixture.debugElement.query(By.css('mat-card-title'));
    const streakEl = fixture.debugElement.query(By.css('.streak-badge'));

    expect(titleEl.nativeElement.textContent.trim()).toBe(TEST_TASK_TITLE);
    expect(streakEl.nativeElement.textContent).toContain('4 Day Streak');
  });

  it('should compute isCompletedToday as false and render difficulty action buttons when uncompleted', async () => {
    const mockTask: DailyTask = {
      id: 'task-1',
      title: TEST_TASK_TITLE,
      difficulties: [EASY_DIFFICULTY, HARD_DIFFICULTY],
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
  });

  it('should emit complete event when a difficulty button is clicked', async () => {
    const mockTask: DailyTask = {
      id: 'task-1',
      title: TEST_TASK_TITLE,
      difficulties: [EASY_DIFFICULTY, HARD_DIFFICULTY],
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
    buttons[1].nativeElement.click(); // Hard difficulty

    expect(emittedDifficulty).toEqual(HARD_DIFFICULTY);
  });

  it('should compute isCompletedToday as true and show completed message when completed today', async () => {
    const mockTask: DailyTask = {
      id: 'task-1',
      title: TEST_TASK_TITLE,
      difficulties: [EASY_DIFFICULTY],
      createdAt: Date.now(),
      streak: 1,
      lastCompletedAt: Date.now(),
    };

    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isCompletedToday()).toBe(true);

    const completedMsg = fixture.debugElement.query(By.css('.completed-msg'));
    expect(completedMsg).toBeTruthy();
    expect(completedMsg.nativeElement.textContent).toContain('Completed for today!');

    const actions = fixture.debugElement.query(By.css('.actions'));
    expect(actions).toBeNull();
  });

  it('should compute isCompletedToday as false when lastCompletedAt was yesterday', async () => {
    const yesterday = Date.now() - ONE_DAY_MS;
    const mockTask: DailyTask = {
      id: 'task-1',
      title: TEST_TASK_TITLE,
      difficulties: [EASY_DIFFICULTY],
      createdAt: Date.now() - (5 * ONE_DAY_MS),
      streak: 1,
      lastCompletedAt: yesterday,
    };

    fixture.componentRef.setInput('task', mockTask);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isCompletedToday()).toBe(false);
  });
});
