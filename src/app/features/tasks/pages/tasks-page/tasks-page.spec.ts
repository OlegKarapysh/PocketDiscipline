import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TasksPage } from './tasks-page';

describe('TasksPage', () => {
  let component: TasksPage;
  let fixture: ComponentFixture<TasksPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksPage],
      providers: [provideRouter([])],
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

  it('should render a single page header titled Tasks', () => {
    const headers = (fixture.nativeElement as HTMLElement).querySelectorAll('app-page-header');
    expect(headers.length).toBe(1);
    expect(headers[0].querySelector('h1')?.textContent.trim()).toBe('Tasks');
  });
});
