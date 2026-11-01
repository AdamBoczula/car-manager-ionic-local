import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Blokuje dostęp do tras login/register dla zalogowanych użytkowników.
 * Czeka na inicjalizację Firebase Auth, potem sprawdza stan.
 * Jeśli użytkownik jest zalogowany → przekierowanie na /dashboard.
 */
export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Jeśli auth już gotowy – sprawdź natychmiast
  if (authService.authReady()) {
    return !authService.isLoggedIn()
      ? true
      : router.createUrlTree(['/dashboard']);
  }

  // Czekaj na inicjalizację Firebase Auth
  return toObservable(authService.authReady).pipe(
    filter((ready) => ready),
    take(1),
    map(() =>
      !authService.isLoggedIn() ? true : router.createUrlTree(['/dashboard'])
    )
  );
};