import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { Settings } from './features/settings/settings';
import { GoalsPage } from './features/goals/pages/goals-page/goals-page';
import { TasksPage } from './features/tasks/pages/tasks-page/tasks-page';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'tasks', component: TasksPage },
  { path: 'goals', component: GoalsPage },
  { path: 'settings', component: Settings }
];
