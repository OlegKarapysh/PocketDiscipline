import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should contain the balance widget', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-balance-widget')).toBeTruthy();
  });

  it('should not contain the task lists', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-task-list')).toBeFalsy();
    expect(compiled.querySelector('app-daily-task-list')).toBeFalsy();
  });
});
