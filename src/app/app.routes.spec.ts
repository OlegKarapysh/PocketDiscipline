import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';
import { Dashboard } from './features/dashboard/dashboard';
import { TasksPage } from './features/tasks/pages/tasks-page/tasks-page';
import { GoalsPage } from './features/goals/pages/goals-page/goals-page';
import { POMODORO_ROUTES } from './features/pomodoro/pomodoro.routes';
import { DailyScoresPageComponent } from './features/daily-scores/pages/daily-scores-page.component';
import { Settings } from './features/settings/settings';

describe('App Routes', () => {
  it('should redirect empty path to /dashboard with full pathMatch', () => {
    const defaultRoute = routes.find(r => r.path === '');
    expect(defaultRoute).toBeDefined();
    expect(defaultRoute?.redirectTo).toBe('/dashboard');
    expect(defaultRoute?.pathMatch).toBe('full');
  });

  it('should define all main feature paths', () => {
    const paths = routes.map(r => r.path);
    expect(paths).toContain('');
    expect(paths).toContain('dashboard');
    expect(paths).toContain('tasks');
    expect(paths).toContain('goals');
    expect(paths).toContain('pomodoro');
    expect(paths).toContain('daily-scores');
    expect(paths).toContain('settings');
  });

  it('should lazy-load Dashboard component for dashboard route', async () => {
    const route = routes.find(r => r.path === 'dashboard');
    expect(route?.loadComponent).toBeDefined();
    const component = await (route?.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(Dashboard);
  });

  it('should lazy-load TasksPage component for tasks route', async () => {
    const route = routes.find(r => r.path === 'tasks');
    expect(route?.loadComponent).toBeDefined();
    const component = await (route?.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(TasksPage);
  });

  it('should lazy-load GoalsPage component for goals route', async () => {
    const route = routes.find(r => r.path === 'goals');
    expect(route?.loadComponent).toBeDefined();
    const component = await (route?.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(GoalsPage);
  });

  it('should lazy-load POMODORO_ROUTES for pomodoro route', async () => {
    const route = routes.find(r => r.path === 'pomodoro');
    expect(route?.loadChildren).toBeDefined();
    const childRoutes = await (route?.loadChildren as () => Promise<unknown>)();
    expect(childRoutes).toBe(POMODORO_ROUTES);
  });

  it('should lazy-load DailyScoresPageComponent for daily-scores route', async () => {
    const route = routes.find(r => r.path === 'daily-scores');
    expect(route?.loadComponent).toBeDefined();
    const component = await (route?.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(DailyScoresPageComponent);
  });

  it('should lazy-load Settings component for settings route', async () => {
    const route = routes.find(r => r.path === 'settings');
    expect(route?.loadComponent).toBeDefined();
    const component = await (route?.loadComponent as () => Promise<unknown>)();
    expect(component).toBe(Settings);
  });
});
