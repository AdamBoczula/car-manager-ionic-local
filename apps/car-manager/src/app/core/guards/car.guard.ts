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

  if (carService.isInitialized()) {
    return carService.hasCars() ? true : router.createUrlTree(['/add-car']);
  }

  void carService.startListening();

  return toObservable(carService.isInitialized).pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => (carService.hasCars() ? true : router.createUrlTree(['/add-car']))),
  );
};
