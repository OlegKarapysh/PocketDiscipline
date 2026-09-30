import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskList } from './task-list';
import { TaskService } from '../../../../core/services/task.service';
import { ClockService } from '../../../../core/services/clock.service';
import type { DisciplineItem } from '../../../../core/models/discipline-item.model';
import { DisciplineItemType } from '../../../../core/models/discipline-item-type.enum';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';

describe('TaskList', () => {
  let component: TaskList;
  let fixture: ComponentFixture<TaskList>;
  let taskServiceMock: {
    tasks$: Observable<DisciplineItem[]>;
    completeTask: ReturnType<typeof vi.fn>;
    addTask: ReturnType<typeof vi.fn>;
    performDailyReset: ReturnType<typeof vi.fn>;
  };
  let snackBarMock: { open: ReturnType<typeof vi.fn> };
  const today = signal('2026-09-30');

  const mockTasks: DisciplineItem[] = [
    {
      id: 't-1',
      title: 'Drink 2L Water',
      type: DisciplineItemType.HABIT,
      rewardValue: 1500,
      isCompleted: false,
      lastCompletedAt: null,
      createdAt: Date.now(),
    },
  ];

  beforeEach(async () => {
    taskServiceMock = {
      tasks$: of(mockTasks),
      completeTask: vi.fn().mockResolvedValue(undefined),
      addTask: vi.fn().mockResolvedValue(undefined),
      performDailyReset: vi.fn().mockResolvedValue(undefined),
    };
    snackBarMock = { open: vi.fn() };
    today.set('2026-09-30');

    await TestBed.configureTestingModule({
      imports: [TaskList],
      providers: [
        { provide: TaskService, useValue: taskServiceMock },
        { provide: ClockService, useValue: { today } },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskList);
    component = fixture.componentInstance;
  });

  it('should render tasks from service stream', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const titleEl = fixture.debugElement.query(By.css('.task-title')).nativeElement as HTMLElement;
    expect(titleEl.textContent.trim()).toBe('Drink 2L Water');

    const chipEl = fixture.debugElement.query(By.css('.reward-chip')).nativeElement as HTMLElement;
    expect(chipEl.textContent.replace(/\s+/g, ' ')).toContain(`+${MONEY_FORMAT.format(1500)}`.replace(/\s+/g, ' '));
    expect(chipEl.textContent).toContain('₴');
  });

  it('should run the daily habit reset on start and again when the day changes', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(taskServiceMock.performDailyReset).toHaveBeenCalledTimes(1);

    today.set('2026-10-01');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(taskServiceMock.performDailyReset).toHaveBeenCalledTimes(2);
  });

  it('should report a failed task query instead of breaking the view', async () => {
    taskServiceMock.tasks$ = throwError(() => new Error('Database connection lost'));
    fixture = TestBed.createComponent(TaskList);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.tasks()).toBeUndefined();
    expect(snackBarMock.open).toHaveBeenCalledWith('Database connection lost', 'Close', expect.any(Object));
  });

  it('should complete task when completeTask is invoked for uncompleted task', async () => {
    await component.completeTask(mockTasks[0]);
    expect(taskServiceMock.completeTask).toHaveBeenCalledWith('t-1');
  });

  it('should complete task when checkbox is clicked in template', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const checkboxEl = fixture.debugElement.query(By.css('mat-checkbox'));
    expect(checkboxEl).toBeTruthy();

    const checkboxNativeEl = checkboxEl.nativeElement as HTMLElement;
    const input = checkboxNativeEl.querySelector('input')!;
    input.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(taskServiceMock.completeTask).toHaveBeenCalledWith('t-1');
  });

  it('should not call completeTask if task is already completed', async () => {
    const completedTask: DisciplineItem = {
      ...mockTasks[0],
      isCompleted: true,
    };
    await component.completeTask(completedTask);
    expect(taskServiceMock.completeTask).not.toHaveBeenCalled();
  });

  it('should render empty state when task stream is empty and trigger addDummyTask on button click', async () => {
    taskServiceMock.tasks$ = of([]);
    fixture = TestBed.createComponent(TaskList);
    component = fixture.componentInstance;
    const addDummySpy = vi.spyOn(component, 'addDummyTask');
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyState = fixture.debugElement.query(By.directive(EmptyState));
    expect(emptyState).toBeTruthy();

    const addBtn = emptyState.query(By.css('button'));
    expect(addBtn).toBeTruthy();

    const addBtnEl = addBtn.nativeElement as HTMLElement;
    addBtnEl.click();
    await addDummySpy.mock.results[0].value;
    fixture.detectChanges();

    expect(taskServiceMock.addTask).toHaveBeenCalledTimes(3);
  });

  it('should sequentially add dummy tasks when addDummyTask is called directly', async () => {
    await component.addDummyTask();
    expect(taskServiceMock.addTask).toHaveBeenCalledTimes(3);
    expect(taskServiceMock.addTask).toHaveBeenNthCalledWith(1, 'Drink 2L Water', DisciplineItemType.HABIT, 10);
    expect(taskServiceMock.addTask).toHaveBeenNthCalledWith(2, 'Read 10 pages', DisciplineItemType.HABIT, 20);
    expect(taskServiceMock.addTask).toHaveBeenNthCalledWith(3, 'Pay internet bill', DisciplineItemType.ONEOFF, 5);
  });

  it('should handle errors gracefully when completeTask fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
    taskServiceMock.completeTask.mockRejectedValue(new Error('Complete failed'));

    await component.completeTask(mockTasks[0]);

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('should handle errors gracefully when addDummyTask fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
    taskServiceMock.addTask.mockRejectedValue(new Error('Add failed'));

    await component.addDummyTask();

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    consoleSpy.mockRestore();
  });
});
