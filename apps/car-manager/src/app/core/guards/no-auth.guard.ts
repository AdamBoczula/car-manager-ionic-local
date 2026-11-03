// spec: docs/specs/02-login-screen.md
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Chroni trasy przed zalogowanymi użytkownikami (login, register).
 * Jeśli użytkownik jest już zalogowany → przekierowanie na /dashboard.
 */
export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};