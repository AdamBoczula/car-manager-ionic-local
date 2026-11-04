// spec: docs/specs/02-login-screen.md
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Chroni trasy przed niezalogowanymi użytkownikami.
 * Jeśli użytkownik nie jest zalogowany → przekierowanie na /login.
 *
 * Waits for Firebase Auth to emit its first state (authReady) before deciding.
 * Without this, a page refresh on a protected route would always redirect
 * to /login because the initial signal value is null.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.authReady()) {
    return authService.isLoggedIn() ? true : router.createUrlTree(['/login']);
  }

  // Auth not yet initialized — wait for onAuthStateChanged
  return toObservable(authService.authReady).pipe(
    filter((ready) => ready),
    take(1),
    map(() =>
      authService.isLoggedIn() ? true : router.createUrlTree(['/login'])
    )
  );
};