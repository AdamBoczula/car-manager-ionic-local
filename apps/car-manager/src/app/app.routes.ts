import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
    canActivate: [noAuthGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
    canActivate: [noAuthGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    canActivate: [authGuard],
  },
  {
    path: 'refuel-list',
    loadComponent: () =>
      import('./pages/refuel-list/refuel-list.page').then((m) => m.RefuelListPage),
    canActivate: [authGuard],
  },
  {
    path: 'refuel-form',
    loadComponent: () =>
      import('./pages/refuel-form/refuel-form.page').then((m) => m.RefuelFormPage),
    canActivate: [authGuard],
  },
  {
    path: 'repair-list',
    loadComponent: () =>
      import('./pages/repair-list/repair-list.page').then((m) => m.RepairListPage),
    canActivate: [authGuard],
  },
  {
    path: 'repair-form',
    loadComponent: () =>
      import('./pages/repair-form/repair-form.page').then((m) => m.RepairFormPage),
    canActivate: [authGuard],
  },
];