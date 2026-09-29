import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { BottomNav } from '../bottom-nav/bottom-nav';
import { SpeedDial } from '../speed-dial/speed-dial';
import type { NavItem } from '../../models/nav-item.model';
import type { SpeedDialAction } from '../../models/speed-dial-action.model';
import { NEW_ITEM_QUERY_PARAM } from '../../constants/new-item-query-param.const';

// Must match t.down(expanded) in src/styles/_tokens.scss, which styles the same switch.
const COMPACT_QUERY = '(max-width: 839.98px)';

const DASHBOARD: NavItem = { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' };
const TASKS: NavItem = { path: '/tasks', label: 'Tasks', icon: 'checklist' };
const GOALS: NavItem = { path: '/goals', label: 'Goals', icon: 'flag' };
const POMODORO: NavItem = { path: '/pomodoro', label: 'Pomodoro', icon: 'timer' };
const DAILY_SCORES: NavItem = { path: '/daily-scores', label: 'Daily Scores', icon: 'insights' };
const REWARDS: NavItem = { path: '/rewards', label: 'Rewards', icon: 'redeem' };
const SETTINGS: NavItem = { path: '/settings', label: 'Settings', icon: 'settings' };

@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatIconModule,
    MatListModule,
    BottomNav,
    SpeedDial,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly navItems: readonly NavItem[] = [DASHBOARD, TASKS, GOALS, POMODORO, DAILY_SCORES, REWARDS, SETTINGS];
  readonly primaryNav: readonly NavItem[] = [{ ...DASHBOARD, label: 'Today', icon: 'home' }, TASKS, GOALS, REWARDS];
  readonly moreNav: readonly NavItem[] = [POMODORO, DAILY_SCORES, SETTINGS];
  readonly quickActions: readonly SpeedDialAction[] = [
    { icon: 'timer', label: 'Start focus', path: '/pomodoro' },
    { icon: 'add_task', label: 'New task', path: '/tasks', queryParams: { [NEW_ITEM_QUERY_PARAM]: '1' } },
  ];

  readonly isCompact = toSignal(this.breakpointObserver.observe(COMPACT_QUERY).pipe(map((result) => result.matches)), {
    initialValue: false,
  });
}
