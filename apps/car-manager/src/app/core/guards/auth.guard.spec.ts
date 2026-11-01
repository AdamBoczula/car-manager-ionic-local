import {
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component, signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

@Component({ standalone: true, template: '' })
class DummyDashboardComponent {}

describe('authGuard', () => {
  let router: Router;
  let mockAuthService: {
    isLoggedIn: ReturnType<typeof signal<boolean>>;
    authReady: ReturnType<typeof signal<boolean>>;
    currentUser: ReturnType<typeof signal<null>>;
  };

  beforeEach(() => {
    mockAuthService = {
      isLoggedIn: signal(false),
      authReady: signal(false),
      currentUser: signal(null),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', component: DummyDashboardComponent, canActivate: [authGuard] },
          { path: 'login', component: DummyDashboardComponent },
        ]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    router = TestBed.inject(Router);
  });

  describe('gdy auth jest gotowy', () => {
    it('powinien przepuścić zalogowanego użytkownika', fakeAsync(async () => {
      mockAuthService.isLoggedIn.set(true);
      mockAuthService.authReady.set(true);

      const result = await router.navigate(['/dashboard']);

      expect(result).toBe(true);
    }));

    it('powinien przekierować niezalogowanego na /login', fakeAsync(async () => {
      mockAuthService.isLoggedIn.set(false);
      mockAuthService.authReady.set(true);

      await router.navigate(['/dashboard']);

      expect(router.url).toBe('/login');
    }));
  });

  describe('gdy auth nie jest jeszcze gotowy', () => {
    it('powinien czekać na inicjalizację, potem przepuścić zalogowanego', fakeAsync(async () => {
      mockAuthService.authReady.set(false);
      mockAuthService.isLoggedIn.set(true);

      const navPromise = router.navigate(['/dashboard']);
      tick();

      // Symuluj inicjalizację Firebase
      mockAuthService.authReady.set(true);
      tick();

      const result = await navPromise;
      expect(result).toBe(true);
    }));

    it('powinien czekać na inicjalizację, potem przekierować niezalogowanego', fakeAsync(async () => {
      mockAuthService.authReady.set(false);
      mockAuthService.isLoggedIn.set(false);

      const navPromise = router.navigate(['/dashboard']);
      tick();

      mockAuthService.authReady.set(true);
      tick();

      await navPromise;
      expect(router.url).toBe('/login');
    }));
  });
});