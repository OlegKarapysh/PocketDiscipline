import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import type { BreakpointState } from '@angular/cdk/layout';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';
import { BehaviorSubject } from 'rxjs';
import { describe, it, expect, beforeEach } from 'vitest';
import { Layout } from './layout';
import { BottomNav } from '../bottom-nav/bottom-nav';
import { SpeedDial } from '../speed-dial/speed-dial';
import { Badge } from '../badge/badge';

const SECTION_PATHS = ['/dashboard', '/tasks', '/goals', '/pomodoro', '/daily-scores', '/rewards', '/settings'];

describe('Layout', () => {
  let fixture: ComponentFixture<Layout>;
  let compactSubject: BehaviorSubject<BreakpointState>;

  const setCompact = async (matches: boolean) => {
    compactSubject.next({ matches, breakpoints: {} });
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const isRailOpen = () =>
    fixture.debugElement
      .queryAll(By.directive(MatSidenav))
      .some((rail) => (rail.componentInstance as MatSidenav).opened);

  beforeEach(async () => {
    compactSubject = new BehaviorSubject<BreakpointState>({ matches: false, breakpoints: {} });

    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        // Any standalone component without required inputs will do as the routed page.
        provideRouter(SECTION_PATHS.map((path) => ({ path: path.slice(1), component: Badge }))),
        { provide: BreakpointObserver, useValue: { observe: () => compactSubject.asObservable() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Layout);
    await TestBed.inject(Router).navigateByUrl('/dashboard');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should link every section from the rail', () => {
    const links = fixture.debugElement
      .queryAll(By.css('mat-sidenav a[mat-list-item]'))
      .map((link) => (link.nativeElement as HTMLAnchorElement).getAttribute('href'));

    expect(links).toEqual(expect.arrayContaining(SECTION_PATHS));
  });

  it('should show the rail without bottom nav or speed dial on wide screens', async () => {
    await setCompact(false);

    expect(isRailOpen()).toBe(true);
    expect(fixture.debugElement.query(By.directive(BottomNav))).toBeNull();
    expect(fixture.debugElement.query(By.directive(SpeedDial))).toBeNull();
  });

  it('should swap the rail for the bottom nav and speed dial on narrow screens', async () => {
    await setCompact(true);

    expect(isRailOpen()).toBe(false);
    expect(fixture.debugElement.query(By.directive(BottomNav))).toBeTruthy();
    expect(fixture.debugElement.query(By.directive(SpeedDial))).toBeTruthy();
  });

  it('should reach every section from the bottom nav or its More menu', async () => {
    await setCompact(true);

    const bottomNav = fixture.debugElement.query(By.directive(BottomNav)).componentInstance as BottomNav;
    const reachable = [...bottomNav.items(), ...bottomNav.moreItems()].map((item) => item.path);

    expect(reachable).toEqual(expect.arrayContaining(SECTION_PATHS));
  });

  it('should keep the routed page alive when the viewport crosses the breakpoint', async () => {
    const page = fixture.debugElement.query(By.directive(Badge)).componentInstance as Badge;

    await setCompact(true);
    expect(fixture.debugElement.query(By.directive(Badge)).componentInstance).toBe(page);

    await setCompact(false);
    expect(fixture.debugElement.query(By.directive(Badge)).componentInstance).toBe(page);
  });
});
