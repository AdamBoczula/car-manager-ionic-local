// spec: docs/specs/05-car-management.md
// covers: docs/specs/05-car-management.md#AC-14
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component, signal } from '@angular/core';
import { firstValueFrom, type Observable } from 'rxjs';
import { carGuard } from './car.guard';
import { CarService } from '../services/car.service';

vi.mock('../firebase', () => ({
  auth: {} as unknown,
  db: {} as unknown,
}));

@Component({ standalone: true, template: '' })
class DummyDashboardComponent {}

@Component({ standalone: true, template: '' })
class DummyAddCarComponent {}

describe('carGuard', () => {
  let router: Router;
  let mockCarService: {
    hasCars: ReturnType<typeof signal<boolean>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    isInitialized: ReturnType<typeof signal<boolean>>;
    startListening: ReturnType<typeof vi.fn>;
    stopListening: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCarService = {
      hasCars: signal(false),
      isLoading: signal(false),
      isInitialized: signal(true),
      startListening: vi.fn().mockResolvedValue(undefined),
      stopListening: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'dashboard',
            component: DummyDashboardComponent,
            canActivate: [carGuard],
          },
          {
            path: 'add-car',
            component: DummyAddCarComponent,
          },
        ]),
        { provide: CarService, useValue: mockCarService },
      ],
    });

    router = TestBed.inject(Router);
  });

  // covers: docs/specs/05-car-management.md#AC-14
  describe('when cars are loaded and garage is empty', () => {
    it('should redirect to /add-car', fakeAsync(async () => {
      mockCarService.hasCars.set(false);
      mockCarService.isLoading.set(false);

      await router.navigate(['/dashboard']);

      expect(router.url).toBe('/add-car');
    }));
  });

  describe('when cars are loaded and garage has cars', () => {
    it('should allow activation', fakeAsync(async () => {
      mockCarService.hasCars.set(true);
      mockCarService.isLoading.set(false);

      const result = await router.navigate(['/dashboard']);

      expect(result).toBe(true);
    }));
  });

  describe('when cars are still loading', () => {
    it('should wait for loading to finish, then redirect if empty', fakeAsync(async () => {
      mockCarService.hasCars.set(false);
      mockCarService.isLoading.set(true);
      mockCarService.isInitialized.set(false);

      const navPromise = router.navigate(['/dashboard']);
      tick();

      // Simulate loading complete — still empty
      mockCarService.isLoading.set(false);
      mockCarService.isInitialized.set(true);
      tick();

      await navPromise;
      expect(router.url).toBe('/add-car');
    }));

    it('should wait for loading to finish, then allow if cars exist', fakeAsync(async () => {
      mockCarService.hasCars.set(true);
      mockCarService.isLoading.set(true);
      mockCarService.isInitialized.set(false);

      const navPromise = router.navigate(['/dashboard']);
      tick();

      // Simulate loading complete — cars now available
      mockCarService.isLoading.set(false);
      mockCarService.isInitialized.set(true);
      tick();

      const result = await navPromise;
      expect(result).toBe(true);
    }));
  });

  describe('when car service has not started yet', () => {
    it('should start loading before making a routing decision', async () => {
      mockCarService.isInitialized.set(false);
      mockCarService.hasCars.set(false);

      const result = TestBed.runInInjectionContext(() => carGuard());

      expect(mockCarService.startListening).toHaveBeenCalledOnce();

      mockCarService.isInitialized.set(true);

      const resolved = await firstValueFrom(
        result as Observable<boolean | ReturnType<Router['createUrlTree']>>,
      );
      expect(resolved).not.toBe(true);
      expect(resolved.toString()).toBe('/add-car');
    });
  });
});
