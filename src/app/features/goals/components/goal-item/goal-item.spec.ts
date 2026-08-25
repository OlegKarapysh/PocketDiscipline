import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoalItem } from './goal-item';

describe('GoalItem', () => {
  let component: GoalItem;
  let fixture: ComponentFixture<GoalItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalItem],
    }).compileComponents();

    fixture = TestBed.createComponent(GoalItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
