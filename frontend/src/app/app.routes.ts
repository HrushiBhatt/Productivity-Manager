import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth';

// Pages are lazy-loaded, so the login screen doesn't ship the heatmap.
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [authGuard],
    loadComponent: () => import('./brew/brew-page').then((m) => m.BrewPage),
  },
  {
    path: 'progress',
    canActivate: [authGuard],
    loadComponent: () => import('./progress/progress-page').then((m) => m.ProgressPage),
  },
  { path: '**', redirectTo: '' },
];
