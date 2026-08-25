import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TasksPage } from './tasks-page';

describe('TasksPage', () => {
  let component: TasksPage;
  let fixture: ComponentFixture<TasksPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksPage],
    }).compileComponents();

    fixture = TestBed.createComponent(TasksPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should contain both task lists', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-daily-task-list')).toBeTruthy();
    expect(compiled.querySelector('app-task-list')).toBeTruthy();
  });
});
