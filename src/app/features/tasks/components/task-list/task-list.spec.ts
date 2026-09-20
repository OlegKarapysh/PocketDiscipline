import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import type { Observable} from 'rxjs';
import { of } from 'rxjs';
import { TaskList } from './task-list';
import { TaskService } from '../../../../core/services/task.service';
import type { DisciplineItem } from '../../../../core/models/discipline-item.model';
import { DisciplineItemType } from '../../../../core/models/discipline-item-type.enum';

const TEST_TASK_ID = 't-1';
const TEST_TASK_TITLE = 'Drink 2L Water';
const TEST_REWARD = 10;

describe('TaskList', () => {
  let component: TaskList;
  let fixture: ComponentFixture<TaskList>;
  let taskServiceMock: {
    tasks$: Observable<DisciplineItem[]>;
    completeTask: ReturnType<typeof vi.fn>;
    addTask: ReturnType<typeof vi.fn>;
  };

  const mockTasks: DisciplineItem[] = [
    {
      id: TEST_TASK_ID,
      title: TEST_TASK_TITLE,
      type: DisciplineItemType.HABIT,
      rewardValue: TEST_REWARD,
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
    };

    await TestBed.configureTestingModule({
      imports: [TaskList],
      providers: [
        { provide: TaskService, useValue: taskServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskList);
    component = fixture.componentInstance;
  });

  it('should render tasks from service stream', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const titleEl = fixture.debugElement.query(By.css('.task-title')).nativeElement as HTMLElement;
    expect(titleEl.textContent.trim()).toBe(TEST_TASK_TITLE);

    const chipEl = fixture.debugElement.query(By.css('.reward-chip')).nativeElement as HTMLElement;
    expect(chipEl.textContent).toContain('+10 ₴');
  });

  it('should complete task when completeTask is invoked for uncompleted task', async () => {
    await component.completeTask(mockTasks[0]);
    expect(taskServiceMock.completeTask).toHaveBeenCalledWith(TEST_TASK_ID);
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

    expect(taskServiceMock.completeTask).toHaveBeenCalledWith(TEST_TASK_ID);
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
    const addDummySpy = vi.spyOn(component, 'addDummyTask');
    component.tasks$ = of([]);
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeTruthy();

    const addBtn = fixture.debugElement.query(By.css('.empty-state button'));
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
    expect(taskServiceMock.addTask).toHaveBeenNthCalledWith(
      1,
      'Drink 2L Water',
      DisciplineItemType.HABIT,
      10
    );
    expect(taskServiceMock.addTask).toHaveBeenNthCalledWith(
      2,
      'Read 10 pages',
      DisciplineItemType.HABIT,
      20
    );
    expect(taskServiceMock.addTask).toHaveBeenNthCalledWith(
      3,
      'Pay internet bill',
      DisciplineItemType.ONEOFF,
      5
    );
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
