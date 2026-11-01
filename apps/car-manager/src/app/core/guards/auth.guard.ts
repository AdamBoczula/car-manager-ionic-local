import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Chroni trasy przed niezalogowanymi użytkownikami.
 * Czeka na inicjalizację Firebase Auth, potem sprawdza stan.
 * Jeśli użytkownik nie jest zalogowany → przekierowanie na /login.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Jeśli auth już gotowy – sprawdź natychmiast
  if (authService.authReady()) {
    return authService.isLoggedIn()
      ? true
      : router.createUrlTree(['/login']);
  }

  // Czekaj na inicjalizację Firebase Auth
  return toObservable(authService.authReady).pipe(
    filter((ready) => ready),
    take(1),
    map(() =>
      authService.isLoggedIn() ? true : router.createUrlTree(['/login'])
    )
  );
};