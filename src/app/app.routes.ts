import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { Settings } from './features/settings/settings';
import { GoalsPage } from './features/goals/pages/goals-page/goals-page';
import { TasksPage } from './features/tasks/pages/tasks-page/tasks-page';
import { DailyScoresPageComponent } from './features/daily-scores/pages/daily-scores-page.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'tasks', component: TasksPage },
  { path: 'goals', component: GoalsPage },
  { path: 'pomodoro', loadChildren: () => import('./features/pomodoro/pomodoro.routes').then(m => m.POMODORO_ROUTES) },
  { path: 'daily-scores', component: DailyScoresPageComponent },
  { path: 'settings', component: Settings }
];

