import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
  { path: 'tasks', loadComponent: () => import('./features/tasks/pages/tasks-page/tasks-page').then(m => m.TasksPage) },
  { path: 'goals', loadComponent: () => import('./features/goals/pages/goals-page/goals-page').then(m => m.GoalsPage) },
  { path: 'pomodoro', loadChildren: () => import('./features/pomodoro/pomodoro.routes').then(m => m.POMODORO_ROUTES) },
  { path: 'daily-scores', loadComponent: () => import('./features/daily-scores/pages/daily-scores-page.component').then(m => m.DailyScoresPageComponent) },
  { path: 'settings', loadComponent: () => import('./features/settings/settings').then(m => m.Settings) }
];
