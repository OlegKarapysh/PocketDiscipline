import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';

const ROUTE_DASHBOARD = 'dashboard';
const ROUTE_TASKS = 'tasks';
const ROUTE_GOALS = 'goals';
const ROUTE_POMODORO = 'pomodoro';
const ROUTE_DAILY_SCORES = 'daily-scores';
const ROUTE_SETTINGS = 'settings';

const TITLE_DASHBOARD = 'Dashboard';
const TITLE_TASKS = 'Tasks';
const TITLE_GOALS = 'Goals';
const TITLE_POMODORO = 'Pomodoro';
const TITLE_DAILY_SCORES = 'Daily Scores';
const TITLE_SETTINGS = 'Settings';

const ROUTE_TITLE_MAP: Record<string, string> = {
  [ROUTE_DASHBOARD]: TITLE_DASHBOARD,
  [ROUTE_TASKS]: TITLE_TASKS,
  [ROUTE_GOALS]: TITLE_GOALS,
  [ROUTE_POMODORO]: TITLE_POMODORO,
  [ROUTE_DAILY_SCORES]: TITLE_DAILY_SCORES,
  [ROUTE_SETTINGS]: TITLE_SETTINGS,
};

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatButtonModule
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class LayoutComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);

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

  readonly isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map(result => result.matches)
  );

  private getTabTitle(url: string): string {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const segment = cleanUrl.split('/').filter(Boolean)[0];
    if (segment && ROUTE_TITLE_MAP[segment]) {
      return ROUTE_TITLE_MAP[segment];
    }
    return TITLE_DASHBOARD;
  }
}
