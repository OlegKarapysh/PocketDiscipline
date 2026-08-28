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
    // August 2026: 1787702400000 (2026-08-25)
    // July 2026: 1784937600000 (2026-07-25)
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
});
