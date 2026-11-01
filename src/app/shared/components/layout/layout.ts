import { Component, computed, inject } from '@angular/core';
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
import { SnackBarService } from '../../services/snack-bar.service';

// Must match t.down(expanded) in src/styles/_tokens.scss, which styles the same switch.
const COMPACT_QUERY = '(max-width: 839.98px)';
// The gap kept between a toast and the speed dial lifted above it; t.space(3), as between the dial and the nav.
const TOAST_GAP_PX = 12;

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
  private readonly snackBar = inject(SnackBarService);

  readonly navItems: readonly NavItem[] = [DASHBOARD, TASKS, GOALS, POMODORO, DAILY_SCORES, REWARDS, SETTINGS];
  readonly primaryNav: readonly NavItem[] = [
    { ...DASHBOARD, label: 'Today', icon: 'home' },
    TASKS,
    POMODORO,
    { ...DAILY_SCORES, label: 'Scores' },
  ];
  readonly moreNav: readonly NavItem[] = [GOALS, REWARDS, SETTINGS];
  readonly quickActions: readonly SpeedDialAction[] = [
    { icon: 'timer', label: 'Start focus', path: '/pomodoro' },
    { icon: 'add_task', label: 'New task', path: '/tasks', queryParams: { [NEW_ITEM_QUERY_PARAM]: '1' } },
  ];

  readonly isCompact = toSignal(this.breakpointObserver.observe(COMPACT_QUERY).pipe(map((result) => result.matches)), {
    initialValue: false,
  });

  // A toast takes the speed dial's place above the bottom nav (styles.scss), so the dial moves up out of its way.
  readonly speedDialLift = computed(() => {
    const height = this.snackBar.height();
    return height > 0 ? height + TOAST_GAP_PX : null;
  });
}
