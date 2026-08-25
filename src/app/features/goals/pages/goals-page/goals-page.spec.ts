import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoalsPage } from './goals-page';

describe('GoalsPage', () => {
  let component: GoalsPage;
  let fixture: ComponentFixture<GoalsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(GoalsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
