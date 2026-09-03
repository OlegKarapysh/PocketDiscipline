import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { GoalList } from './goal-list';
import { Goal, GOAL_STATUS } from '../../models/goal.model';
import { GoalItem } from '../goal-item/goal-item';

const TEST_GOAL_TITLE_1 = 'do 50 push-ups on fists';
const TEST_GOAL_TITLE_2 = 'do 100 squats';

describe('GoalList', () => {
  let component: GoalList;
  let fixture: ComponentFixture<GoalList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalList],
    }).compileComponents();

    fixture = TestBed.createComponent(GoalList);
    component = fixture.componentInstance;
  });

  it('should render active goals and empty completed section when none completed', async () => {
    const activeGoals: Goal[] = [
      {
        id: 'g-1',
        title: TEST_GOAL_TITLE_1,
        rewardValue: 2000,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now(),
      },
    ];

    fixture.componentRef.setInput('activeGoals', activeGoals);
    fixture.componentRef.setInput('completedGoals', []);
    fixture.detectChanges();
    await fixture.whenStable();

    const items = fixture.debugElement.queryAll(By.directive(GoalItem));
    expect(items.length).toBe(1);

    const completedSection = fixture.debugElement.query(By.css('.completed-section'));
    expect(completedSection).toBeNull();
  });

  it('should render empty state message when active goals list is empty', async () => {
    fixture.componentRef.setInput('activeGoals', []);
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeTruthy();
    expect(emptyState.nativeElement.textContent).toContain('No active goals right now.');
  });

  it('should group completed goals by month and year', async () => {
    const completedGoals: Goal[] = [
      {
        id: 'g-1',
        title: TEST_GOAL_TITLE_1,
        rewardValue: 2000,
        status: GOAL_STATUS.COMPLETED,
        completedAt: new Date(2026, 7, 25).getTime(), // Month is 0-indexed (7 = August)
        createdAt: 1000,
      },
      {
        id: 'g-2',
        title: TEST_GOAL_TITLE_2,
        rewardValue: 1500,
        status: GOAL_STATUS.COMPLETED,
        completedAt: new Date(2026, 6, 25).getTime(), // Month is 0-indexed (6 = July)
        createdAt: 1000,
      },
    ];

    fixture.componentRef.setInput('activeGoals', []);
    fixture.componentRef.setInput('completedGoals', completedGoals);
    fixture.detectChanges();
    await fixture.whenStable();

    const groups = component.groupedCompletedGoals();
    expect(groups.length).toBe(2);
    expect(groups[0].goals.length).toBe(1);
    expect(groups[1].goals.length).toBe(1);

    const monthHeaders = fixture.debugElement.queryAll(By.css('.month-group h3'));
    expect(monthHeaders.length).toBe(2);
  });

  it('should forward complete, edit, and delete events when active goal item emits', async () => {
    const activeGoals: Goal[] = [
      {
        id: 'g-1',
        title: TEST_GOAL_TITLE_1,
        rewardValue: 2000,
        status: GOAL_STATUS.ACTIVE,
        completedAt: null,
        createdAt: Date.now(),
      },
    ];

    fixture.componentRef.setInput('activeGoals', activeGoals);
    fixture.detectChanges();
    await fixture.whenStable();

    let completedId = '';
    let editedGoal: Goal | null = null;
    let deletedId = '';

    component.complete.subscribe((id) => (completedId = id));
    component.edit.subscribe((g) => (editedGoal = g));
    component.delete.subscribe((id) => (deletedId = id));

    const goalItemEl = fixture.debugElement.query(By.directive(GoalItem));
    const goalItemComponent = goalItemEl.componentInstance as GoalItem;

    goalItemComponent.complete.emit('g-1');
    expect(completedId).toBe('g-1');

    goalItemComponent.edit.emit(activeGoals[0]);
    expect(editedGoal).toEqual(activeGoals[0]);

    goalItemComponent.delete.emit('g-1');
    expect(deletedId).toBe('g-1');
  });

  it('should forward undo event when completed goal item emits', async () => {
    const completedGoals: Goal[] = [
      {
        id: 'g-1',
        title: TEST_GOAL_TITLE_1,
        rewardValue: 2000,
        status: GOAL_STATUS.COMPLETED,
        completedAt: new Date(2026, 7, 25).getTime(),
        createdAt: 1000,
      },
    ];

    fixture.componentRef.setInput('completedGoals', completedGoals);
    fixture.detectChanges();
    await fixture.whenStable();

    let undoneId = '';
    component.undo.subscribe((id) => (undoneId = id));

    const goalItemEl = fixture.debugElement.query(By.directive(GoalItem));
    const goalItemComponent = goalItemEl.componentInstance as GoalItem;

    goalItemComponent.undo.emit('g-1');
    expect(undoneId).toBe('g-1');
  });
});
