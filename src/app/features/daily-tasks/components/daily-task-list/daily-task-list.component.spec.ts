import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { DailyTaskListComponent } from './daily-task-list.component';
import { DailyTasksService } from '../../services/daily-tasks.service';
import { DailyTask, DailyTaskDifficulty } from '../../models/daily-task.model';
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
      createTask: vi.fn(),
      completeTask: vi.fn(),
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
    expect(emptyState.nativeElement.textContent).toContain('No daily tasks configured yet.');
  });

  it('should toggle form visibility and create task upon onTaskCreated', () => {
    component.showForm = true;
    component.onTaskCreated({ title: TEST_TASK_TITLE, difficulties: [EASY_DIFFICULTY] });

    expect(dailyTasksServiceMock.createTask).toHaveBeenCalledWith(TEST_TASK_TITLE, [EASY_DIFFICULTY]);
    expect(component.showForm).toBe(false);
  });

  it('should call service completeTask when onCompleteTask is invoked', async () => {
    await component.onCompleteTask(mockTasks[0], EASY_DIFFICULTY);

    expect(dailyTasksServiceMock.completeTask).toHaveBeenCalledWith(mockTasks[0], EASY_DIFFICULTY);
  });

  it('should show DailyTaskFormComponent when showForm is true', async () => {
    component.showForm = true;
    fixture.detectChanges();
    await fixture.whenStable();

    const formEl = fixture.debugElement.query(By.directive(DailyTaskFormComponent));
    expect(formEl).toBeTruthy();
  });
});
