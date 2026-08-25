import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoalItem } from './goal-item';
import { ComponentRef } from '@angular/core';

describe('GoalItem', () => {
  let component: GoalItem;
  let fixture: ComponentFixture<GoalItem>;
  let componentRef: ComponentRef<GoalItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalItem],
    }).compileComponents();

    fixture = TestBed.createComponent(GoalItem);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('goal', {
      id: '1', title: 'Test', rewardValue: 100, status: 'ACTIVE', completedAt: null, createdAt: Date.now()
    });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
