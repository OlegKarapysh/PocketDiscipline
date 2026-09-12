import { Routes } from '@angular/router';

export const REWARDS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/rewards-hub/rewards-hub').then(m => m.RewardsHubComponent),
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./components/category-management/category-management').then(m => m.CategoryManagementComponent),
  }
];

