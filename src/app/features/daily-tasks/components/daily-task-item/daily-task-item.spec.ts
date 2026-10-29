import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { DailyTaskItem } from './daily-task-item';
import type { DailyTask } from '../../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../../core/models/daily-task-difficulty.model';
import type { DifficultyReward } from '../../models/difficulty-reward.model';
import { Amount } from '../../../../shared/components/amount/amount';
import { StreakBadge } from '../../../../shared/components/streak-badge/streak-badge';

const easy: DailyTaskDifficulty = { id: 'easy', name: 'Easy', baseReward: 100 };
const medium: DailyTaskDifficulty = { id: 'medium', name: 'Medium', baseReward: 200 };
const hard: DailyTaskDifficulty = { id: 'hard', name: 'Hard', baseReward: 300 };

const task = (overrides: Partial<DailyTask> = {}): DailyTask => ({
  id: 'task-1',
  title: 'Evening Reading',
  difficulties: [easy, medium, hard],
  createdAt: 0,
  sortOrder: 0,
  streak: 0,
  lastCompletedAt: null,
  ...overrides,
});
const offer = (difficulty: DailyTaskDifficulty, reward: number | null): DifficultyReward => ({ difficulty, reward });

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

  const render = (inputs: Record<string, unknown>): void => {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
  };
  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const summary = (): HTMLButtonElement => element().querySelector('button.summary')!;
  const amounts = (): number[] =>
    fixture.debugElement
      .queryAll(By.directive(Amount))
      .map((el) => (el.componentInstance as Amount).value())
      .filter((value): value is number => typeof value === 'number');

  it('should show the title and the streak', () => {
    render({ task: task({ streak: 4 }) });

    expect(element().querySelector('.title')?.textContent.trim()).toBe('Evening Reading');
    expect((fixture.debugElement.query(By.directive(StreakBadge)).componentInstance as StreakBadge).days()).toBe(4);
  });

  it('should not show a streak when there is none', () => {
    render({ task: task({ streak: 0 }) });

    expect(fixture.debugElement.query(By.directive(StreakBadge))).toBeNull();
  });

  it('should show the range of rewards on offer while closed, without the difficulties', () => {
    render({ task: task(), rewards: [offer(medium, 300), offer(easy, 150), offer(hard, 450)] });

    expect(amounts()).toEqual([150, 450]);
    expect(element().querySelectorAll('.pd-difficulty')).toHaveLength(0);
    expect(summary().getAttribute('aria-expanded')).toBe('false');
  });

  it('should show a single reward when every difficulty pays the same', () => {
    render({ task: task({ difficulties: [easy] }), rewards: [offer(easy, 150)] });

    expect(amounts()).toEqual([150]);
    expect(element().querySelector('.range-dash')).toBeNull();
  });

  it('should show a difficulty that pays nothing as --, and leave it out of the range', () => {
    const rewards = [offer(easy, null), offer(medium, 300), offer(hard, 450)];
    render({ task: task(), rewards });

    expect(amounts()).toEqual([300, 450]);

    render({ expanded: true });

    expect(
      [...element().querySelectorAll('.pd-difficulty')].map((button) => button.textContent.replace(/\s+/g, '')),
    ).toEqual(['Easy--₴', 'Medium+300₴', 'Hard+450₴']);
  });

  it('should show no range when nothing is on offer', () => {
    render({ task: task(), rewards: [offer(easy, null)] });

    expect(element().querySelector('.reward')).toBeNull();

    render({ rewards: [] });

    expect(element().querySelector('.reward')).toBeNull();
    expect(element().textContent).not.toContain('∞');
  });

  it('should ask to open when a closed row is tapped, and to close when an open one is', () => {
    const asked: boolean[] = [];
    component.expandedChange.subscribe((expanded) => {
      asked.push(expanded);
    });

    render({ task: task(), expanded: false });
    summary().click();
    render({ expanded: true });
    summary().click();

    expect(asked).toEqual([true, false]);
  });

  it('should offer every difficulty with its reward when open, and complete the one tapped', () => {
    render({ task: task(), rewards: [offer(easy, 150), offer(medium, 300), offer(hard, 450)], expanded: true });
    let completed: DailyTaskDifficulty | null = null;
    component.complete.subscribe((difficulty) => {
      completed = difficulty;
    });

    const buttons = element().querySelectorAll<HTMLButtonElement>('.pd-difficulty');
    expect(summary().getAttribute('aria-expanded')).toBe('true');
    expect([...buttons].map((button) => button.textContent.replace(/\s+/g, ''))).toEqual([
      'Easy+150₴',
      'Medium+300₴',
      'Hard+450₴',
    ]);

    buttons[2].click();

    expect(completed).toEqual(hard);
  });

  it('should offer Edit when open, but not Delete', () => {
    const shown = task();
    render({ task: shown, expanded: true });
    let edited: DailyTask | null = null;
    component.edit.subscribe((t) => {
      edited = t;
    });

    element().querySelector<HTMLButtonElement>('button[aria-label="Edit daily task"]')!.click();

    expect(edited).toBe(shown);
    expect(element().querySelector('button[aria-label="Delete daily task"]')).toBeNull();
    expect(element().textContent).not.toContain('Delete');
  });

  it('should keep Edit out of sight while closed', () => {
    render({ task: task() });

    expect(element().querySelector('button[aria-label="Edit daily task"]')).toBeNull();
  });

  it('should mark a completed task and show what it earned instead of the rewards on offer', () => {
    render({ task: task({ streak: 3 }), completed: true, earned: 330 });

    expect(element().querySelector('[aria-label="Completed today"]')).toBeTruthy();
    expect(amounts()).toEqual([330]);
  });

  it('should leave the earned amount out when it is not known', () => {
    render({ task: task(), completed: true, earned: null });

    expect(amounts()).toEqual([]);
  });

  it('should offer only Edit when a completed task is opened', () => {
    render({ task: task(), completed: true, earned: 100, expanded: true });

    expect(element().querySelectorAll('.pd-difficulty')).toHaveLength(0);
    expect(element().querySelector('button[aria-label="Edit daily task"]')).toBeTruthy();
  });
});
