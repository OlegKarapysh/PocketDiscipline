import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { TaskListComponent } from './task-list';
import { TaskService } from '../../../../core/services/task.service';
import { DisciplineItem, DISCIPLINE_ITEM_TYPE } from '../../../../core/models/data-models';

const TEST_TASK_ID = 't-1';
const TEST_TASK_TITLE = 'Drink 2L Water';
const TEST_REWARD = 10;

describe('TaskListComponent', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskServiceMock: {
    tasks$: Observable<DisciplineItem[]>;
    completeTask: ReturnType<typeof vi.fn>;
    addTask: ReturnType<typeof vi.fn>;
  };

  const mockTasks: DisciplineItem[] = [
    {
      id: TEST_TASK_ID,
      title: TEST_TASK_TITLE,
      type: DISCIPLINE_ITEM_TYPE.HABIT,
      rewardValue: TEST_REWARD,
      isCompleted: false,
      lastCompletedAt: null,
      createdAt: Date.now(),
    },
  ];

  beforeEach(async () => {
    taskServiceMock = {
      tasks$: of(mockTasks),
      completeTask: vi.fn(),
      addTask: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TaskListComponent],
      providers: [
        { provide: TaskService, useValue: taskServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
  });

  it('should render tasks from service stream', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const titleEl = fixture.debugElement.query(By.css('.task-title'));
    expect(titleEl.nativeElement.textContent.trim()).toBe(TEST_TASK_TITLE);

    const chipEl = fixture.debugElement.query(By.css('.reward-chip'));
    expect(chipEl.nativeElement.textContent).toContain('+10 ₴');
  });

  it('should complete task when completeTask is invoked for uncompleted task', () => {
    component.completeTask(mockTasks[0]);
    expect(taskServiceMock.completeTask).toHaveBeenCalledWith(TEST_TASK_ID);
  });

  it('should not call completeTask if task is already completed', () => {
    const completedTask: DisciplineItem = {
      ...mockTasks[0],
      isCompleted: true,
    };
    component.completeTask(completedTask);
    expect(taskServiceMock.completeTask).not.toHaveBeenCalled();
  });

  it('should render empty state when task stream is empty and allow adding dummy tasks', async () => {
    component.tasks$ = of([]);
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeTruthy();

    component.addDummyTask();
    expect(taskServiceMock.addTask).toHaveBeenCalledTimes(3);
  });
});
