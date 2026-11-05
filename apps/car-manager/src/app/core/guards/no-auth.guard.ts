// spec: docs/specs/02-login-screen.md
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Chroni trasy przed zalogowanymi użytkownikami (login, register).
 * Jeśli użytkownik jest już zalogowany → przekierowanie na /dashboard.
 *
 * Waits for Firebase Auth to emit its first state (authReady) before deciding.
 * Without this, a logged-in user refreshing on /login would briefly see the
 * login form and then get stuck, because onAuthStateChanged fires too late
 * for the guard to redirect.
 */
export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.authReady()) {
    return !authService.isLoggedIn() ? true : router.createUrlTree(['/dashboard']);
  }

  // Auth not yet initialized — wait for onAuthStateChanged
  return toObservable(authService.authReady).pipe(
    filter((ready) => ready),
    take(1),
    map(() => (!authService.isLoggedIn() ? true : router.createUrlTree(['/dashboard']))),
  );
};
