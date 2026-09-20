import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { DailyTaskListComponent } from './daily-task-list.component';
import { DailyTasksService } from '../../services/daily-tasks.service';
import type { DailyTask } from '../../models/daily-task.model';
import type { DailyTaskDifficulty } from '../../models/daily-task-difficulty.model';
import { DailyTaskItemComponent } from '../daily-task-item/daily-task-item.component';
import { DailyTaskFormComponent } from '../daily-task-form/daily-task-form.component';

const TEST_TASK_TITLE = 'Stretch Daily';
const EASY_DIFFICULTY: DailyTaskDifficulty = { id: 'easy', name: 'Easy', baseReward: 100 };

describe('DailyTaskListComponent', () => {
  let component: DailyTaskListComponent;
  let fixture: ComponentFixture<DailyTaskListComponent>;
  let dailyTasksServiceMock: {
    tasks$: Observable<DailyTask[]>;
    createTask: ReturnType<typeof vi.fn>;
    completeTask: ReturnType<typeof vi.fn>;
    resetBrokenStreaks: ReturnType<typeof vi.fn>;
  };

  const mockTasks: DailyTask[] = [
    {
      id: 'task-1',
      title: TEST_TASK_TITLE,
      difficulties: [EASY_DIFFICULTY],
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
      resetBrokenStreaks: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [DailyTaskListComponent],
      providers: [
        { provide: DailyTasksService, useValue: dailyTasksServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyTaskListComponent);
    component = fixture.componentInstance;
  });

  it('should call resetBrokenStreaks on initialization', () => {
    fixture.detectChanges();
    expect(dailyTasksServiceMock.resetBrokenStreaks).toHaveBeenCalled();
  });

  it('should render daily task items from service stream', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.debugElement.queryAll(By.directive(DailyTaskItemComponent));
    expect(items.length).toBe(1);
  });

  it('should render empty state when task stream is empty', async () => {
    component.tasks$ = of([]);
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeTruthy();
    expect((emptyState.nativeElement as HTMLElement).textContent).toContain('No daily tasks configured yet.');
  });

  it('should open form when Add Daily Task button is clicked in header', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const addBtn = fixture.debugElement.query(By.css('.header button[mat-fab]'));
    expect(addBtn).toBeTruthy();

    (addBtn.nativeElement as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.showForm()).toBe(true);
    const formEl = fixture.debugElement.query(By.directive(DailyTaskFormComponent));
    expect(formEl).toBeTruthy();
  });

  it('should close form when cancelForm event is emitted by DailyTaskFormComponent', async () => {
    component.showForm.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const formEl = fixture.debugElement.query(By.directive(DailyTaskFormComponent));
    const formComp = formEl.componentInstance as DailyTaskFormComponent;

    formComp.cancelForm.emit();
    fixture.detectChanges();

    expect(component.showForm()).toBe(false);
  });

  it('should toggle form visibility and create task upon onTaskCreated', async () => {
    component.showForm.set(true);
    await component.onTaskCreated({ title: TEST_TASK_TITLE, difficulties: [EASY_DIFFICULTY] });

    expect(dailyTasksServiceMock.createTask).toHaveBeenCalledWith(TEST_TASK_TITLE, [EASY_DIFFICULTY]);
    expect(component.showForm()).toBe(false);
  });

  it('should handle error gracefully when createTask fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
    dailyTasksServiceMock.createTask.mockRejectedValueOnce(new Error('Create error'));

    component.showForm.set(true);
    await component.onTaskCreated({ title: TEST_TASK_TITLE, difficulties: [EASY_DIFFICULTY] });

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(component.showForm()).toBe(false);
    consoleSpy.mockRestore();
  });

  it('should forward completion to service when child item emits complete event', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const itemEl = fixture.debugElement.query(By.directive(DailyTaskItemComponent));
    const itemComp = itemEl.componentInstance as DailyTaskItemComponent;

    itemComp.complete.emit(EASY_DIFFICULTY);
    await fixture.whenStable();

    expect(dailyTasksServiceMock.completeTask).toHaveBeenCalledWith(mockTasks[0], EASY_DIFFICULTY);
  });

  it('should handle error gracefully when completeTask fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
    dailyTasksServiceMock.completeTask.mockRejectedValueOnce(new Error('Complete error'));

    await component.onCompleteTask(mockTasks[0], EASY_DIFFICULTY);

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    consoleSpy.mockRestore();
  });
});
