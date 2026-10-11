import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { TasksPage } from './tasks-page';

describe('TasksPage', () => {
  let component: TasksPage;
  let fixture: ComponentFixture<TasksPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksPage],
      providers: [
        provideRouter([{ path: 'tasks', component: TasksPage }]),
        // A tab switch otherwise waits for a CSS transition, which jsdom never runs.
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TasksPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const element = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const tab = (label: string): HTMLElement =>
    [...element().querySelectorAll<HTMLElement>('[role="tab"]')].find((el) => el.textContent.includes(label))!;

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open on the daily tasks', () => {
    expect(element().querySelector('app-daily-task-list')).toBeTruthy();
    expect(element().querySelector('app-task-list')).toBeNull();
  });

  it('should show the one-off tasks on their own tab', async () => {
    tab('One-off').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element().querySelector('app-task-list')).toBeTruthy();
    expect(component.selectedTab()).toBe(1);
  });

  it('should go to the daily tasks when "New task" asks for the form from the other tab', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/tasks', TasksPage);
    page.selectedTab.set(1);
    await harness.fixture.whenStable();

    await harness.navigateByUrl('/tasks?new=1');
    await harness.fixture.whenStable();

    expect(page.selectedTab()).toBe(0);
  });

  it('should render a single page header titled Tasks', () => {
    const headers = element().querySelectorAll('app-page-header');
    expect(headers.length).toBe(1);
    expect(headers[0].querySelector('h1')?.textContent.trim()).toBe('Tasks');
  });
});
