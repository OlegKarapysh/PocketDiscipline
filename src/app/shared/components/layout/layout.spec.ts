import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { LayoutComponent } from './layout';

describe('Layout', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;
  let router: Router;
  let breakpointSubject: BehaviorSubject<BreakpointState>;

  beforeEach(async () => {
    breakpointSubject = new BehaviorSubject<BreakpointState>({ matches: false, breakpoints: {} });

    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        provideRouter([
          { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
          { path: 'dashboard', children: [] },
          { path: 'tasks', children: [] },
          { path: 'goals', children: [] },
          { path: 'pomodoro', children: [] },
          { path: 'daily-scores', children: [] },
          { path: 'settings', children: [] },
        ]),
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () => breakpointSubject.asObservable(),
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should contain navigation links for all features', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('a[mat-list-item]')).map(
      a => a.getAttribute('href') || a.getAttribute('ng-reflect-router-link') || a.getAttribute('routerLink')
    );
    expect(links).toContain('/dashboard');
    expect(links).toContain('/tasks');
    expect(links).toContain('/goals');
    expect(links).toContain('/pomodoro');
    expect(links).toContain('/daily-scores');
    expect(links).toContain('/settings');
  });

  it('should not render top toolbar or static Pocket Discipline text on wide screens (desktop mode)', () => {
    breakpointSubject.next({ matches: false, breakpoints: {} });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const topToolbar = compiled.querySelector('mat-sidenav-content mat-toolbar');
    expect(topToolbar).toBeNull();
    expect(compiled.textContent).not.toContain('Pocket Discipline');
  });

  it('should render top toolbar with current tab name on mobile (handset mode)', async () => {
    breakpointSubject.next({ matches: true, breakpoints: {} });
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const topToolbar = compiled.querySelector('mat-sidenav-content mat-toolbar');
    expect(topToolbar).not.toBeNull();
    expect(topToolbar?.querySelector('.tab-title')?.textContent?.trim()).toBe('Dashboard');
    expect(compiled.textContent).not.toContain('Pocket Discipline');
  });

  it('should dynamically update the tab title on mobile when navigating across tabs', async () => {
    breakpointSubject.next({ matches: true, breakpoints: {} });

    await router.navigateByUrl('/tasks');
    fixture.detectChanges();
    let titleEl = fixture.nativeElement.querySelector('mat-sidenav-content mat-toolbar .tab-title');
    expect(titleEl?.textContent?.trim()).toBe('Tasks');

    await router.navigateByUrl('/goals');
    fixture.detectChanges();
    titleEl = fixture.nativeElement.querySelector('mat-sidenav-content mat-toolbar .tab-title');
    expect(titleEl?.textContent?.trim()).toBe('Goals');

    await router.navigateByUrl('/pomodoro');
    fixture.detectChanges();
    titleEl = fixture.nativeElement.querySelector('mat-sidenav-content mat-toolbar .tab-title');
    expect(titleEl?.textContent?.trim()).toBe('Pomodoro');

    await router.navigateByUrl('/daily-scores');
    fixture.detectChanges();
    titleEl = fixture.nativeElement.querySelector('mat-sidenav-content mat-toolbar .tab-title');
    expect(titleEl?.textContent?.trim()).toBe('Daily Scores');

    await router.navigateByUrl('/settings');
    fixture.detectChanges();
    titleEl = fixture.nativeElement.querySelector('mat-sidenav-content mat-toolbar .tab-title');
    expect(titleEl?.textContent?.trim()).toBe('Settings');
  });

  it('should strip query parameters and hash fragments when determining active tab title', async () => {
    breakpointSubject.next({ matches: true, breakpoints: {} });

    await router.navigateByUrl('/tasks?filter=active#section');
    fixture.detectChanges();
    const titleEl = fixture.nativeElement.querySelector('mat-sidenav-content mat-toolbar .tab-title');
    expect(titleEl?.textContent?.trim()).toBe('Tasks');
  });

  it('should close drawer on mobile when onNavClick is called', () => {
    breakpointSubject.next({ matches: true, breakpoints: {} });
    fixture.detectChanges();

    const mockDrawer = { close: vi.fn() } as unknown as MatSidenav;
    component.onNavClick(mockDrawer);
    expect(mockDrawer.close).toHaveBeenCalled();
  });

  it('should not close drawer on desktop when onNavClick is called', () => {
    breakpointSubject.next({ matches: false, breakpoints: {} });
    fixture.detectChanges();

    const mockDrawer = { close: vi.fn() } as unknown as MatSidenav;
    component.onNavClick(mockDrawer);
    expect(mockDrawer.close).not.toHaveBeenCalled();
  });
});
