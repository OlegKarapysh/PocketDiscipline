import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard';
import { Settings } from './features/settings/settings';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'settings', component: Settings }
];
