import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoalList } from './goal-list';

describe('GoalList', () => {
  let component: GoalList;
  let fixture: ComponentFixture<GoalList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalList],
    }).compileComponents();

    fixture = TestBed.createComponent(GoalList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
