// spec: docs/specs/05-car-management.md
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { CarService } from '../services/car.service';

/**
 * Chroni trasy przed użytkownikami bez aut w garażu.
 * Jeśli garaż jest pusty → przekierowanie na /add-car (wizard).
 * Używany razem z authGuard na wszystkich chronionych trasach.
 */
export const carGuard: CanActivateFn = () => {
  const carService = inject(CarService);
  const router = inject(Router);

  // If cars already loaded – check immediately
  if (!carService.isLoading() && carService.hasCars()) {
    return true;
  }

  // If cars loaded but empty – redirect to wizard
  if (!carService.isLoading() && !carService.hasCars()) {
    return router.createUrlTree(['/add-car']);
  }

  // Wait for cars to finish loading
  return toObservable(carService.isLoading).pipe(
    filter((loading) => !loading),
    take(1),
    map(() =>
      carService.hasCars() ? true : router.createUrlTree(['/add-car'])
    )
  );
};