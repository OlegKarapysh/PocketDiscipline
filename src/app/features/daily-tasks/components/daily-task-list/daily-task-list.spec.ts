import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Observable } from 'rxjs';
import { signal } from '@angular/core';
import { EMPTY, of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClockService } from '../../../../core/services/clock.service';
import { DailyTaskList } from './daily-task-list';
import { DailyTasksService } from '../../services/daily-tasks.service';
import type { DailyTask } from '../../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../../core/models/daily-task-difficulty.model';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { DailyTaskItem } from '../daily-task-item/daily-task-item';
import { DailyTaskForm } from '../daily-task-form/daily-task-form';
import { ConfirmService } from '../../../../shared/services/confirm.service';

describe('DailyTaskList', () => {
  const easy: DailyTaskDifficulty = { id: 'easy', name: 'Easy', baseReward: 100 };
  let component: DailyTaskList;
  let fixture: ComponentFixture<DailyTaskList>;
  let dailyTasksServiceMock: {
    tasks$: Observable<DailyTask[]>;
    createTask: ReturnType<typeof vi.fn>;
    completeTask: ReturnType<typeof vi.fn>;
    updateTask: ReturnType<typeof vi.fn>;
    deleteTask: ReturnType<typeof vi.fn>;
    resetBrokenStreaks: ReturnType<typeof vi.fn>;
  };
  let snackBarMock: { open: ReturnType<typeof vi.fn> };
  let confirmMock: { ask: ReturnType<typeof vi.fn> };
  const today = signal('2026-09-30');

  const mockTasks: DailyTask[] = [
    {
      id: 'task-1',
      title: 'Stretch Daily',
      difficulties: [easy],
      createdAt: Date.now(),
      streak: 2,
      lastCompletedAt: null,
    },
  ];

  beforeEach(async () => {
    dailyTasksServiceMock = {
      tasks$: of(mockTasks),
      createTask: vi.fn().mockResolvedValue(undefined),
      completeTask: vi.fn().mockResolvedValue(undefined),
      updateTask: vi.fn().mockResolvedValue(undefined),
      deleteTask: vi.fn().mockResolvedValue(undefined),
      resetBrokenStreaks: vi.fn().mockResolvedValue(undefined),
    };
    snackBarMock = { open: vi.fn() };
    confirmMock = { ask: vi.fn().mockReturnValue(of(true)) };
    today.set('2026-09-30');

    await TestBed.configureTestingModule({
      imports: [DailyTaskList],
      providers: [
        { provide: DailyTasksService, useValue: dailyTasksServiceMock },
        { provide: ClockService, useValue: { today } },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: ConfirmService, useValue: confirmMock },
        provideRouter([{ path: 'tasks', component: DailyTaskList }]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyTaskList);
    component = fixture.componentInstance;
  });

  it('should reset broken streaks on start and again when the day changes', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dailyTasksServiceMock.resetBrokenStreaks).toHaveBeenCalledTimes(1);

    today.set('2026-10-01');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dailyTasksServiceMock.resetBrokenStreaks).toHaveBeenCalledTimes(2);
  });

  it('should report a failed daily task query instead of breaking the view', async () => {
    dailyTasksServiceMock.tasks$ = throwError(() => new Error('Database connection lost'));
    fixture = TestBed.createComponent(DailyTaskList);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.tasks()).toBeUndefined();
    expect(snackBarMock.open).toHaveBeenCalledWith('Database connection lost', 'Close', expect.any(Object));
  });

  it('should render daily task items from service stream', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.debugElement.queryAll(By.directive(DailyTaskItem));
    expect(items.length).toBe(1);
  });

  it('should render empty state when task stream is empty', async () => {
    dailyTasksServiceMock.tasks$ = of([]);
    fixture = TestBed.createComponent(DailyTaskList);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.queryAll(By.directive(DailyTaskItem)).length).toBe(0);
    const emptyState = fixture.debugElement.query(By.directive(EmptyState));
    expect((emptyState.nativeElement as HTMLElement).textContent).toContain('No daily tasks yet');
  });

  it('should open form when Add Daily Task button is clicked in header', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const addBtn = fixture.debugElement.query(By.css('.header button.add'));
    expect(addBtn).toBeTruthy();

    (addBtn.nativeElement as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.showForm()).toBe(true);
    const formEl = fixture.debugElement.query(By.directive(DailyTaskForm));
    expect(formEl).toBeTruthy();
  });

  it('should close form when cancelForm event is emitted by DailyTaskForm', async () => {
    component.showForm.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const formEl = fixture.debugElement.query(By.directive(DailyTaskForm));
    const formComp = formEl.componentInstance as DailyTaskForm;

    formComp.cancelForm.emit();
    fixture.detectChanges();

    expect(component.showForm()).toBe(false);
  });

  it('should create the task, then close the form and confirm', async () => {
    component.showForm.set(true);
    await component.onTaskCreated({ title: 'Stretch Daily', difficulties: [easy] });

    expect(dailyTasksServiceMock.createTask).toHaveBeenCalledWith('Stretch Daily', [easy]);
    expect(component.showForm()).toBe(false);
    expect(snackBarMock.open).toHaveBeenCalledWith('Daily task added', 'Close', expect.any(Object));
  });

  it('should keep the form open with the draft and show the error when creating fails', async () => {
    dailyTasksServiceMock.createTask.mockRejectedValueOnce(new Error('Disk is full'));
    component.openForm();
    fixture.detectChanges();
    await fixture.whenStable();

    await saveThroughForm('Stretch Daily');

    expect(dailyTasksServiceMock.createTask).toHaveBeenCalledTimes(1);
    expect(snackBarMock.open).toHaveBeenCalledWith('Disk is full', 'Close', expect.any(Object));
    const form = fixture.debugElement.query(By.directive(DailyTaskForm)).componentInstance as DailyTaskForm;
    expect(form.draft().title).toBe('Stretch Daily');
    expect(component.saving()).toBe(false);
  });

  it('should forward completion to service when child item emits complete event', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const itemEl = fixture.debugElement.query(By.directive(DailyTaskItem));
    const itemComp = itemEl.componentInstance as DailyTaskItem;

    itemComp.complete.emit(easy);
    await fixture.whenStable();

    expect(dailyTasksServiceMock.completeTask).toHaveBeenCalledWith(mockTasks[0], easy);
  });

  it('should open the form when reached with ?new, then drop the param from the URL', async () => {
    const harness = await RouterTestingHarness.create();
    const list = await harness.navigateByUrl('/tasks?new=1', DailyTaskList);
    await harness.fixture.whenStable();

    expect(list.showForm()).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/tasks');
  });

  it('should reopen the form when ?new is requested again after closing it', async () => {
    const harness = await RouterTestingHarness.create();
    const list = await harness.navigateByUrl('/tasks?new=1', DailyTaskList);
    await harness.fixture.whenStable();
    list.closeForm();

    await harness.navigateByUrl('/tasks?new=1');
    await harness.fixture.whenStable();

    expect(list.showForm()).toBe(true);
  });

  it('should keep the form closed when reached without ?new', async () => {
    const harness = await RouterTestingHarness.create();
    const list = await harness.navigateByUrl('/tasks', DailyTaskList);

    expect(list.showForm()).toBe(false);
  });

  it('should show why a completion failed', async () => {
    dailyTasksServiceMock.completeTask.mockRejectedValueOnce(new Error('"Easy" has no valid reward. Edit the task.'));

    await component.onCompleteTask(mockTasks[0], easy);

    expect(snackBarMock.open).toHaveBeenCalledWith(
      '"Easy" has no valid reward. Edit the task.',
      'Close',
      expect.any(Object),
    );
  });

  describe('editing a task', () => {
    const startEditing = async (): Promise<void> => {
      fixture.detectChanges();
      await fixture.whenStable();
      const item = fixture.debugElement.query(By.directive(DailyTaskItem));
      (item.query(By.css('button[aria-label="Edit daily task"]')).nativeElement as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it('should open the form in place of the task, pre-filled with it', async () => {
      await startEditing();

      expect(fixture.debugElement.query(By.directive(DailyTaskItem))).toBeNull();
      const form = fixture.debugElement.query(By.directive(DailyTaskForm)).componentInstance as DailyTaskForm;
      expect(form.draft().title).toBe('Stretch Daily');
      expect(form.draft().difficulties).toEqual([
        expect.objectContaining({ id: 'easy', name: 'Easy', baseReward: 100 }),
      ]);
    });

    it('should save the changes, then close the form and confirm', async () => {
      await startEditing();

      await saveThroughForm('Stretch Twice');

      expect(dailyTasksServiceMock.updateTask).toHaveBeenCalledWith('task-1', 'Stretch Twice', [easy]);
      expect(fixture.debugElement.query(By.directive(DailyTaskForm))).toBeNull();
      expect(snackBarMock.open).toHaveBeenCalledWith('Daily task updated', 'Close', expect.any(Object));
    });

    it('should keep the form open with the changes and show the error when saving fails', async () => {
      dailyTasksServiceMock.updateTask.mockRejectedValueOnce(new Error('Disk is full'));
      await startEditing();

      await saveThroughForm('Stretch Twice');

      expect(snackBarMock.open).toHaveBeenCalledWith('Disk is full', 'Close', expect.any(Object));
      const form = fixture.debugElement.query(By.directive(DailyTaskForm)).componentInstance as DailyTaskForm;
      expect(form.draft().title).toBe('Stretch Twice');
    });

    it('should show the task again when editing is cancelled', async () => {
      await startEditing();

      (fixture.debugElement.query(By.directive(DailyTaskForm)).componentInstance as DailyTaskForm).cancelForm.emit();
      fixture.detectChanges();

      expect(dailyTasksServiceMock.updateTask).not.toHaveBeenCalled();
      expect(fixture.debugElement.query(By.directive(DailyTaskItem))).toBeTruthy();
    });
  });

  describe('deleting a task', () => {
    const clickDelete = async (): Promise<void> => {
      fixture.detectChanges();
      await fixture.whenStable();
      const item = fixture.debugElement.query(By.directive(DailyTaskItem));
      (item.query(By.css('button[aria-label="Delete daily task"]')).nativeElement as HTMLElement).click();
      await fixture.whenStable();
    };

    it('should ask first, naming the task, as a destructive action', async () => {
      confirmMock.ask.mockReturnValue(EMPTY);

      await clickDelete();

      expect(confirmMock.ask).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('"Stretch Daily"') as unknown,
          isDestructive: true,
        }),
      );
      expect(dailyTasksServiceMock.deleteTask).not.toHaveBeenCalled();
    });

    it('should delete the task once confirmed, and confirm', async () => {
      await clickDelete();

      expect(dailyTasksServiceMock.deleteTask).toHaveBeenCalledWith('task-1');
      expect(snackBarMock.open).toHaveBeenCalledWith('Daily task deleted', 'Close', expect.any(Object));
    });

    it('should show the error when deleting fails', async () => {
      dailyTasksServiceMock.deleteTask.mockRejectedValueOnce(new Error('Disk is full'));

      await clickDelete();

      expect(snackBarMock.open).toHaveBeenCalledWith('Disk is full', 'Close', expect.any(Object));
    });
  });

  // Types a title into the open form and presses its Save button, as the user does.
  async function saveThroughForm(title: string): Promise<void> {
    const input = fixture.debugElement.query(By.css('app-daily-task-form input')).nativeElement as HTMLInputElement;
    input.value = title;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    (fixture.debugElement.query(By.css('app-daily-task-form .save')).nativeElement as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  }
});
