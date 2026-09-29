import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { GoalItem } from './goal-item';
import type { Goal } from '../../../../core/models/goal.model';
import { GOAL_STATUS } from '../../../../core/models/goal.model';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';

describe('GoalItem', () => {
  let component: GoalItem;
  let fixture: ComponentFixture<GoalItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalItem],
    }).compileComponents();

    fixture = TestBed.createComponent(GoalItem);
    component = fixture.componentInstance;
  });

  it('should render active goal details and action buttons', async () => {
    const activeGoal: Goal = {
      id: 'g-1',
      title: 'do 50 push-ups on fists',
      rewardValue: 2000,
      status: GOAL_STATUS.ACTIVE,
      completedAt: null,
      createdAt: Date.now(),
    };

    fixture.componentRef.setInput('goal', activeGoal);
    fixture.detectChanges();
    await fixture.whenStable();

    const titleEl = fixture.debugElement.query(By.css('mat-card-title'));
    const subtitleEl = fixture.debugElement.query(By.css('mat-card-subtitle'));
    expect((titleEl.nativeElement as HTMLElement).textContent.trim()).toBe('do 50 push-ups on fists');
    expect((subtitleEl.nativeElement as HTMLElement).textContent).toContain(MONEY_FORMAT.format(2000));
    expect((subtitleEl.nativeElement as HTMLElement).textContent).toContain('₴');

    const editBtn = fixture.debugElement.query(By.css('button[aria-label="Edit"]'));
    const deleteBtn = fixture.debugElement.query(By.css('button[aria-label="Delete"]'));
    const completeBtn = fixture.debugElement.query(By.css('button.complete'));

    expect(editBtn).toBeTruthy();
    expect(deleteBtn).toBeTruthy();
    expect(completeBtn).toBeTruthy();
  });

  it('should emit complete, edit, and delete events for active goal', async () => {
    const activeGoal: Goal = {
      id: 'g-1',
      title: 'do 50 push-ups on fists',
      rewardValue: 2000,
      status: GOAL_STATUS.ACTIVE,
      completedAt: null,
      createdAt: Date.now(),
    };

    fixture.componentRef.setInput('goal', activeGoal);
    fixture.detectChanges();
    await fixture.whenStable();

    let completedId = '';
    let editedGoal: Goal | null = null;
    let deletedId = '';

    component.complete.subscribe((id) => (completedId = id));
    component.edit.subscribe((g) => (editedGoal = g));
    component.delete.subscribe((id) => (deletedId = id));

    const editBtn = fixture.debugElement.query(By.css('button[aria-label="Edit"]'));
    (editBtn.nativeElement as HTMLButtonElement).click();
    expect(editedGoal).toEqual(activeGoal);

    const deleteBtn = fixture.debugElement.query(By.css('button[aria-label="Delete"]'));
    (deleteBtn.nativeElement as HTMLButtonElement).click();
    expect(deletedId).toBe('g-1');

    const completeBtn = fixture.debugElement.query(By.css('button.complete'));
    (completeBtn.nativeElement as HTMLButtonElement).click();
    expect(completedId).toBe('g-1');
  });

  it('should render completed goal with undo button and emit undo event on click', async () => {
    const completedGoal: Goal = {
      id: 'g-1',
      title: 'do 50 push-ups on fists',
      rewardValue: 2000,
      status: GOAL_STATUS.COMPLETED,
      completedAt: Date.now(),
      createdAt: Date.now(),
    };

    fixture.componentRef.setInput('goal', completedGoal);
    fixture.detectChanges();
    await fixture.whenStable();

    let undoneId = '';
    component.undo.subscribe((id) => (undoneId = id));

    const undoBtn = fixture.debugElement.query(By.css('button[mat-stroked-button]'));
    expect(undoBtn).toBeTruthy();
    expect((undoBtn.nativeElement as HTMLElement).textContent).toContain('Undo');

    (undoBtn.nativeElement as HTMLButtonElement).click();
    expect(undoneId).toBe('g-1');
  });
});
