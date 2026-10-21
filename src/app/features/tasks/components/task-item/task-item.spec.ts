import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { TaskItem } from './task-item';
import type { DisciplineItem } from '../../../../core/models/discipline-item.model';
import { DisciplineItemType } from '../../../../core/models/discipline-item-type.enum';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';

describe('TaskItem', () => {
  let component: TaskItem;
  let fixture: ComponentFixture<TaskItem>;

  const pendingTask: DisciplineItem = {
    id: 'task-1',
    title: 'Pay internet bill',
    type: DisciplineItemType.ONEOFF,
    rewardValue: 150,
    isCompleted: false,
    lastCompletedAt: null,
    createdAt: 1000,
  };

  const completedTask: DisciplineItem = {
    ...pendingTask,
    isCompleted: true,
    lastCompletedAt: 2000,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskItem],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskItem);
    component = fixture.componentInstance;
  });

  it('should render title, reward amount, and Complete button for a pending task without any type badge', async () => {
    fixture.componentRef.setInput('task', pendingTask);
    fixture.detectChanges();
    await fixture.whenStable();

    const titleEl = fixture.debugElement.query(By.css('.title')).nativeElement as HTMLElement;
    expect(titleEl.textContent.trim()).toBe('Pay internet bill');

    const rewardEl = fixture.debugElement.query(By.css('.reward')).nativeElement as HTMLElement;
    expect(rewardEl.textContent.replace(/\s+/g, ' ')).toContain(`+${MONEY_FORMAT.format(150)}`.replace(/\s+/g, ' '));
    expect(rewardEl.textContent).toContain('₴');

    expect(fixture.debugElement.query(By.css('app-badge'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.done-icon'))).toBeNull();
    expect(fixture.debugElement.query(By.css('button.undo'))).toBeNull();

    let completed: DisciplineItem | null = null;
    component.complete.subscribe((item) => (completed = item));

    const completeBtn = fixture.debugElement.query(By.css('button.complete')).nativeElement as HTMLButtonElement;
    completeBtn.click();

    expect(completed).toEqual(pendingTask);

    let edited: DisciplineItem | null = null;
    component.edit.subscribe((item) => (edited = item));

    const editBtn = fixture.debugElement.query(By.css('button.edit')).nativeElement as HTMLButtonElement;
    editBtn.click();

    expect(edited).toEqual(pendingTask);

    let deleted: DisciplineItem | null = null;
    component.delete.subscribe((item) => (deleted = item));

    const deleteBtn = fixture.debugElement.query(By.css('button.delete')).nativeElement as HTMLButtonElement;
    deleteBtn.click();

    expect(deleted).toEqual(pendingTask);
  });

  it('should render check icon, title, reward amount, and Undo button for a completed task', async () => {
    fixture.componentRef.setInput('task', completedTask);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('.done-icon'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('button.complete'))).toBeNull();
    expect(fixture.debugElement.query(By.css('button.edit'))).toBeNull();
    expect(fixture.debugElement.query(By.css('button.delete'))).toBeNull();

    let undone: DisciplineItem | null = null;
    component.undo.subscribe((item) => (undone = item));

    const undoBtn = fixture.debugElement.query(By.css('button.undo')).nativeElement as HTMLButtonElement;
    undoBtn.click();

    expect(undone).toEqual(completedTask);
  });
});
