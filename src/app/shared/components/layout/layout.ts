import { Component, DestroyRef, inject } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, catchError } from 'rxjs/operators';
import { from, EMPTY } from 'rxjs';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { NavItem } from '../../models/nav-item.model';

const ROUTE_DASHBOARD = 'dashboard';
const ROUTE_TASKS = 'tasks';
const ROUTE_GOALS = 'goals';
const ROUTE_POMODORO = 'pomodoro';
const ROUTE_DAILY_SCORES = 'daily-scores';
const ROUTE_REWARDS = 'rewards';
const ROUTE_SETTINGS = 'settings';

const TITLE_DASHBOARD = 'Dashboard';
const TITLE_TASKS = 'Tasks';
const TITLE_GOALS = 'Goals';
const TITLE_POMODORO = 'Pomodoro';
const TITLE_DAILY_SCORES = 'Daily Scores';
const TITLE_REWARDS = 'Rewards';
const TITLE_SETTINGS = 'Settings';

const ROUTE_TITLE_MAP: Record<string, string> = {
  [ROUTE_DASHBOARD]: TITLE_DASHBOARD,
  [ROUTE_TASKS]: TITLE_TASKS,
  [ROUTE_GOALS]: TITLE_GOALS,
  [ROUTE_POMODORO]: TITLE_POMODORO,
  [ROUTE_DAILY_SCORES]: TITLE_DAILY_SCORES,
  [ROUTE_REWARDS]: TITLE_REWARDS,
  [ROUTE_SETTINGS]: TITLE_SETTINGS,
};

const NAV_ITEMS: readonly NavItem[] = [
  { path: '/dashboard', label: TITLE_DASHBOARD, icon: 'dashboard' },
  { path: '/tasks', label: TITLE_TASKS, icon: 'checklist' },
  { path: '/goals', label: TITLE_GOALS, icon: 'star' },
  { path: '/pomodoro', label: TITLE_POMODORO, icon: 'timer' },
  { path: '/daily-scores', label: TITLE_DAILY_SCORES, icon: 'score' },
  { path: '/rewards', label: TITLE_REWARDS, icon: 'card_giftcard' },
  { path: '/settings', label: TITLE_SETTINGS, icon: 'settings' },
];

@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class LayoutComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly navItems = NAV_ITEMS;

  readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map(result => result.matches)),
    { initialValue: false }
  );

  readonly currentTabTitle = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => this.getTabTitle(event.urlAfterRedirects || event.url))
    ),
    { initialValue: this.getTabTitle(this.router.url) }
  );

  onNavClick(drawer: MatSidenav): void {
    if (this.isHandset()) {
      from(Promise.resolve(drawer.close()))
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          catchError((err: unknown) => {
            console.error('Failed to close navigation drawer:', err);
            return EMPTY;
          })
        )
        .subscribe();
    }
  }

  private getTabTitle(url: string | null | undefined): string {
    if (!url) {
      return TITLE_DASHBOARD;
    }
    const cleanUrl = url.split('?')[0].split('#')[0];
    const segment = cleanUrl.split('/').find(Boolean);
    if (segment && Object.prototype.hasOwnProperty.call(ROUTE_TITLE_MAP, segment)) {
      return ROUTE_TITLE_MAP[segment];
    }
    return TITLE_DASHBOARD;
  }
}
