// spec: docs/specs/05-car-management.md
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';
import { carGuard } from './core/guards/car.guard';

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
    path: 'add-car',
    loadComponent: () =>
      import('./pages/add-car/add-car.page').then((m) => m.AddCarPage),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    canActivate: [authGuard, carGuard],
  },
  {
    path: 'refuel-list',
    loadComponent: () =>
      import('./pages/refuel-list/refuel-list.page').then(
        (m) => m.RefuelListPage
      ),
    canActivate: [authGuard, carGuard],
  },
  {
    path: 'refuel-form',
    loadComponent: () =>
      import('./pages/refuel-form/refuel-form.page').then(
        (m) => m.RefuelFormPage
      ),
    canActivate: [authGuard, carGuard],
  },
  {
    path: 'repair-list',
    loadComponent: () =>
      import('./pages/repair-list/repair-list.page').then(
        (m) => m.RepairListPage
      ),
    canActivate: [authGuard, carGuard],
  },
  {
    path: 'repair-form',
    loadComponent: () =>
      import('./pages/repair-form/repair-form.page').then(
        (m) => m.RepairFormPage
      ),
    canActivate: [authGuard, carGuard],
  },
];