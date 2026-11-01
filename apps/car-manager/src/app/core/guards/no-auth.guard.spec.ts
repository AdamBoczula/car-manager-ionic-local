import {
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component, signal } from '@angular/core';
import { noAuthGuard } from './no-auth.guard';
import { AuthService } from '../services/auth.service';

@Component({ standalone: true, template: '' })
class DummyComponent {}

describe('noAuthGuard', () => {
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
          { path: 'login', component: DummyComponent, canActivate: [noAuthGuard] },
          { path: 'dashboard', component: DummyComponent },
        ]),
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    router = TestBed.inject(Router);
  });

  describe('gdy auth jest gotowy', () => {
    it('powinien przepuścić niezalogowanego użytkownika', fakeAsync(async () => {
      mockAuthService.isLoggedIn.set(false);
      mockAuthService.authReady.set(true);

      const result = await router.navigate(['/login']);

      expect(result).toBe(true);
    }));

    it('powinien przekierować zalogowanego na /dashboard', fakeAsync(async () => {
      mockAuthService.isLoggedIn.set(true);
      mockAuthService.authReady.set(true);

      await router.navigate(['/login']);

      expect(router.url).toBe('/dashboard');
    }));
  });

  describe('gdy auth nie jest jeszcze gotowy', () => {
    it('powinien czekać na inicjalizację, potem przepuścić niezalogowanego', fakeAsync(async () => {
      mockAuthService.isLoggedIn.set(false);
      mockAuthService.authReady.set(false);

      const navPromise = router.navigate(['/login']);
      tick();

      mockAuthService.authReady.set(true);
      tick();

      const result = await navPromise;
      expect(result).toBe(true);
    }));

    it('powinien czekać na inicjalizację, potem przekierować zalogowanego', fakeAsync(async () => {
      mockAuthService.isLoggedIn.set(true);
      mockAuthService.authReady.set(false);

      const navPromise = router.navigate(['/login']);
      tick();

      mockAuthService.authReady.set(true);
      tick();

      await navPromise;
      expect(router.url).toBe('/dashboard');
    }));
  });
});