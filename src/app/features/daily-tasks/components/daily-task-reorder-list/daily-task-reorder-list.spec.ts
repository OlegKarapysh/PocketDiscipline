import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { DailyTaskReorderList } from './daily-task-reorder-list';
import type { DailyTask } from '../../../../core/models/daily-task.model';

const task = (id: string, title: string, sortOrder: number): DailyTask => ({
  id,
  title,
  difficulties: [{ id: 'easy', name: 'Easy', baseReward: 100 }],
  createdAt: 0,
  sortOrder,
  streak: 0,
  lastCompletedAt: null,
});

const tasks = [task('run', 'Run', 0), task('read', 'Read', 1), task('swim', 'Swim', 2)];

describe('DailyTaskReorderList', () => {
  let component: DailyTaskReorderList;
  let fixture: ComponentFixture<DailyTaskReorderList>;
  let emitted: string[][];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyTaskReorderList],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyTaskReorderList);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tasks', tasks);
    emitted = [];
    component.reorder.subscribe((ids) => {
      emitted.push(ids);
    });
    fixture.detectChanges();
  });

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const titles = (): string[] => [...element().querySelectorAll('.title')].map((el) => el.textContent.trim());
  const button = (label: string): HTMLButtonElement => element().querySelector(`button[aria-label="${label}"]`)!;

  it('should list the tasks in their order', () => {
    expect(titles()).toEqual(['Run', 'Read', 'Swim']);
  });

  it('should move a task down, show it moved and report the new order', () => {
    button('Move down: Run').click();
    fixture.detectChanges();

    expect(titles()).toEqual(['Read', 'Run', 'Swim']);
    expect(emitted).toEqual([['read', 'run', 'swim']]);
  });

  it('should move a task up', () => {
    button('Move up: Swim').click();
    fixture.detectChanges();

    expect(emitted).toEqual([['run', 'swim', 'read']]);
  });

  it('should not move the first task up or the last one down', () => {
    expect(button('Move up: Run').disabled).toBe(true);
    expect(button('Move down: Swim').disabled).toBe(true);
    expect(button('Move down: Run').disabled).toBe(false);
  });

  it('should report the order a drag leaves', () => {
    component.drop({ previousIndex: 0, currentIndex: 2 } as CdkDragDrop<DailyTask[]>);

    expect(emitted).toEqual([['read', 'swim', 'run']]);
  });

  it('should report nothing when a task is dropped where it was', () => {
    component.drop({ previousIndex: 1, currentIndex: 1 } as CdkDragDrop<DailyTask[]>);

    expect(emitted).toEqual([]);
  });

  it('should follow the tasks once the saved order arrives', () => {
    button('Move down: Run').click();
    fixture.componentRef.setInput('tasks', [tasks[2], tasks[0], tasks[1]]);
    fixture.detectChanges();

    expect(titles()).toEqual(['Swim', 'Run', 'Read']);
  });
});
