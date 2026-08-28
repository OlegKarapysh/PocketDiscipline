import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { GoalItem } from './goal-item';
import { Goal, GOAL_STATUS } from '../../models/goal.model';

const TEST_GOAL_ID = 'g-1';
const TEST_GOAL_TITLE = 'do 50 push-ups on fists';
const TEST_REWARD_VALUE = 2000;

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
      id: TEST_GOAL_ID,
      title: TEST_GOAL_TITLE,
      rewardValue: TEST_REWARD_VALUE,
      status: GOAL_STATUS.ACTIVE,
      completedAt: null,
      createdAt: Date.now(),
    };

    fixture.componentRef.setInput('goal', activeGoal);
    fixture.detectChanges();
    await fixture.whenStable();

    const titleEl = fixture.debugElement.query(By.css('mat-card-title'));
    const subtitleEl = fixture.debugElement.query(By.css('mat-card-subtitle'));
    expect(titleEl.nativeElement.textContent.trim()).toBe(TEST_GOAL_TITLE);
    expect(subtitleEl.nativeElement.textContent).toContain('2000 ₴');

    const editBtn = fixture.debugElement.query(By.css('button[aria-label="Edit"]'));
    const deleteBtn = fixture.debugElement.query(By.css('button[aria-label="Delete"]'));
    const completeBtn = fixture.debugElement.query(By.css('button[color="primary"]:not([aria-label="Edit"])'));

    expect(editBtn).toBeTruthy();
    expect(deleteBtn).toBeTruthy();
    expect(completeBtn).toBeTruthy();
  });

  it('should emit complete, edit, and delete events for active goal', async () => {
    const activeGoal: Goal = {
      id: TEST_GOAL_ID,
      title: TEST_GOAL_TITLE,
      rewardValue: TEST_REWARD_VALUE,
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
    editBtn.nativeElement.click();
    expect(editedGoal).toEqual(activeGoal);

    const deleteBtn = fixture.debugElement.query(By.css('button[aria-label="Delete"]'));
    deleteBtn.nativeElement.click();
    expect(deletedId).toBe(TEST_GOAL_ID);

    const completeBtn = fixture.debugElement.query(By.css('button[color="primary"]:not([aria-label="Edit"])'));
    completeBtn.nativeElement.click();
    expect(completedId).toBe(TEST_GOAL_ID);
  });

  it('should render completed goal with undo button and emit undo event on click', async () => {
    const completedGoal: Goal = {
      id: TEST_GOAL_ID,
      title: TEST_GOAL_TITLE,
      rewardValue: TEST_REWARD_VALUE,
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
    expect(undoBtn.nativeElement.textContent).toContain('Undo');

    undoBtn.nativeElement.click();
    expect(undoneId).toBe(TEST_GOAL_ID);
  });
});
