import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import type { Observable } from 'rxjs';
import { EMPTY, Subject, of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { fakeSnackBarRef } from '../../../../shared/testing/snack-bar-ref.fake';
import { TaskList } from './task-list';
import { TaskService } from '../../services/task.service';
import type { DisciplineItem } from '../../../../core/models/discipline-item.model';
import { DisciplineItemType } from '../../../../core/models/discipline-item-type.enum';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { TaskForm } from '../task-form/task-form';
import { TaskItem } from '../task-item/task-item';

describe('TaskList', () => {
  let component: TaskList;
  let fixture: ComponentFixture<TaskList>;
  let taskServiceMock: {
    tasks$: Observable<DisciplineItem[]>;
    addTask: ReturnType<typeof vi.fn>;
    updateTask: ReturnType<typeof vi.fn>;
    deleteTask: ReturnType<typeof vi.fn>;
    completeTask: ReturnType<typeof vi.fn>;
    undoCompleteTask: ReturnType<typeof vi.fn>;
  };
  let confirmServiceMock: { ask: ReturnType<typeof vi.fn> };
  let snackBarMock: { open: ReturnType<typeof vi.fn> };

  const pendingTask: DisciplineItem = {
    id: 't-1',
    title: 'Pay internet bill',
    type: DisciplineItemType.ONEOFF,
    rewardValue: 150,
    isCompleted: false,
    lastCompletedAt: null,
    createdAt: 2000,
  };

  const completedTask: DisciplineItem = {
    id: 't-2',
    title: 'Book dentist appointment',
    type: DisciplineItemType.ONEOFF,
    rewardValue: 80,
    isCompleted: true,
    lastCompletedAt: 3000,
    createdAt: 1000,
  };

  beforeEach(async () => {
    taskServiceMock = {
      tasks$: of([pendingTask, completedTask]),
      addTask: vi.fn().mockResolvedValue(undefined),
      updateTask: vi.fn().mockResolvedValue(undefined),
      deleteTask: vi.fn().mockResolvedValue(undefined),
      completeTask: vi.fn().mockResolvedValue(150),
      undoCompleteTask: vi.fn().mockResolvedValue(true),
    };
    confirmServiceMock = {
      ask: vi.fn().mockReturnValue(of(undefined)),
    };
    snackBarMock = { open: vi.fn(fakeSnackBarRef) };

    await TestBed.configureTestingModule({
      imports: [TaskList],
      providers: [
        { provide: TaskService, useValue: taskServiceMock },
        { provide: ConfirmService, useValue: confirmServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskList);
    component = fixture.componentInstance;
  });

  it('should not show the empty state before the first read of the tasks arrives', async () => {
    const tasks = new Subject<DisciplineItem[]>();
    taskServiceMock.tasks$ = tasks;
    fixture = TestBed.createComponent(TaskList);

    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.debugElement.query(By.directive(EmptyState))).toBeNull();
    expect(fixture.debugElement.query(By.css('.all-done'))).toBeNull();

    tasks.next([]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.debugElement.query(By.directive(EmptyState))).not.toBeNull();
  });

  it('should render empty state without any "Add initial tasks" button when tasks stream is empty', async () => {
    taskServiceMock.tasks$ = of([]);
    fixture = TestBed.createComponent(TaskList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyState = fixture.debugElement.query(By.directive(EmptyState));
    expect(emptyState).toBeTruthy();
    expect((emptyState.nativeElement as HTMLElement).textContent).toContain('No one-off tasks yet');
    expect(emptyState.query(By.css('button'))).toBeNull();
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

  it('should open TaskForm when "Add one-off task" is clicked, create a task, and show a snackbar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const addBtn = fixture.debugElement.query(By.css('button.add')).nativeElement as HTMLButtonElement;
    addBtn.click();
    fixture.detectChanges();

    const formDebug = fixture.debugElement.query(By.directive(TaskForm));
    expect(formDebug).toBeTruthy();

    await component.onTaskCreated({ title: 'Renew passport', rewardValue: 300 });
    fixture.detectChanges();

    expect(taskServiceMock.addTask).toHaveBeenCalledWith('Renew passport', 300);
    expect(component.showForm()).toBe(false);
    expect(snackBarMock.open).toHaveBeenCalledWith('One-off task added', 'Close', expect.any(Object));
  });

  it('should keep the form open and show an error snackbar when adding a task fails', async () => {
    taskServiceMock.addTask.mockRejectedValueOnce(new Error('Add failed'));
    component.openForm();

    await component.onTaskCreated({ title: 'Renew passport', rewardValue: 300 });

    expect(component.showForm()).toBe(true);
    expect(snackBarMock.open).toHaveBeenCalledWith('Add failed', 'Close', expect.any(Object));
  });

  it('should complete a pending task and show earned reward in snackbar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const pendingItem = fixture.debugElement.query(By.directive(TaskItem));
    const completeBtn = pendingItem.query(By.css('button.complete')).nativeElement as HTMLButtonElement;
    completeBtn.click();
    await fixture.whenStable();

    expect(taskServiceMock.completeTask).toHaveBeenCalledWith('t-1');
    expect(snackBarMock.open).toHaveBeenCalledWith(
      `Pay internet bill done · +${MONEY_FORMAT.format(150)} ₴`,
      'Close',
      expect.any(Object),
    );
  });

  it('should show "Everything is done." when all tasks are completed', async () => {
    taskServiceMock.tasks$ = of([completedTask]);
    fixture = TestBed.createComponent(TaskList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    const allDoneEl = fixture.debugElement.query(By.css('.all-done')).nativeElement as HTMLElement;
    expect(allDoneEl.textContent).toContain('Everything is done.');
  });

  it('should toggle the collapsible Completed section and undo a completed task', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('#oneoff-tasks-done'))).toBeNull();

    const doneToggle = fixture.debugElement.query(By.css('button.done-toggle')).nativeElement as HTMLButtonElement;
    expect(doneToggle.textContent).toContain('Completed (1)');
    doneToggle.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const doneContainer = fixture.debugElement.query(By.css('#oneoff-tasks-done'));
    expect(doneContainer).toBeTruthy();

    const undoBtn = doneContainer.query(By.css('button.undo')).nativeElement as HTMLButtonElement;
    undoBtn.click();
    await fixture.whenStable();

    expect(taskServiceMock.undoCompleteTask).toHaveBeenCalledWith('t-2');
    expect(snackBarMock.open).toHaveBeenCalledWith('Completion undone', 'Close', expect.any(Object));
  });

  it('should open in-place edit form for a pending task, save changes, and close the edit form', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const pendingItem = fixture.debugElement.query(By.directive(TaskItem));
    const editBtn = pendingItem.query(By.css('button.edit')).nativeElement as HTMLButtonElement;
    editBtn.click();
    fixture.detectChanges();

    expect(component.editingTaskId()).toBe('t-1');
    const formDebug = fixture.debugElement.query(By.directive(TaskForm));
    expect(formDebug).toBeTruthy();

    await component.onTaskEdited(pendingTask, { title: 'File quarterly taxes', rewardValue: 200 });
    fixture.detectChanges();

    expect(taskServiceMock.updateTask).toHaveBeenCalledWith('t-1', 'File quarterly taxes', 200);
    expect(component.editingTaskId()).toBeNull();
    expect(snackBarMock.open).toHaveBeenCalledWith('One-off task updated', 'Close', expect.any(Object));
  });

  it('should close the in-place edit form without saving when cancelled', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.openEdit(pendingTask);
    fixture.detectChanges();

    const formDebug = fixture.debugElement.query(By.directive(TaskForm));
    const cancelBtn = formDebug.query(By.css('button.cancel')).nativeElement as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    expect(component.editingTaskId()).toBeNull();
    expect(taskServiceMock.updateTask).not.toHaveBeenCalled();
  });

  it('should confirm and delete a pending task when confirmed', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const pendingItem = fixture.debugElement.query(By.directive(TaskItem));
    const deleteBtn = pendingItem.query(By.css('button.delete')).nativeElement as HTMLButtonElement;
    deleteBtn.click();
    await fixture.whenStable();

    expect(confirmServiceMock.ask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete one-off task',
        message: 'Are you sure you want to delete "Pay internet bill"?',
        isDestructive: true,
      }),
    );
    expect(taskServiceMock.deleteTask).toHaveBeenCalledWith('t-1');
    expect(snackBarMock.open).toHaveBeenCalledWith('One-off task deleted', 'Close', expect.any(Object));
  });

  it('should not delete a pending task when the confirmation dialog is cancelled', async () => {
    confirmServiceMock.ask.mockReturnValueOnce(EMPTY);
    fixture.detectChanges();
    await fixture.whenStable();

    const pendingItem = fixture.debugElement.query(By.directive(TaskItem));
    const deleteBtn = pendingItem.query(By.css('button.delete')).nativeElement as HTMLButtonElement;
    deleteBtn.click();
    await fixture.whenStable();

    expect(taskServiceMock.deleteTask).not.toHaveBeenCalled();
  });
});
