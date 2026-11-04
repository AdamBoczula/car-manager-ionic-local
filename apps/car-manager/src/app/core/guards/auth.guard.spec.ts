// spec: docs/specs/02-login-screen.md
// covers: docs/specs/02-login-screen.md — route guard for authenticated users
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

vi.mock('../firebase', () => ({
  auth: {} as unknown,
  db: {} as unknown,
}));

describe('authGuard', () => {
  let authReady: ReturnType<typeof signal<boolean>>;
  let isLoggedIn: ReturnType<typeof signal<boolean>>;
  let router: Router;

  beforeEach(() => {
    authReady = signal(false);
    isLoggedIn = signal(false);

    const authServiceMock = {
      authReady: vi.fn().mockImplementation(() => authReady()),
      isLoggedIn: vi.fn().mockImplementation(() => isLoggedIn()),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', component: {} as never },
          { path: 'login', component: {} as never },
        ]),
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    router = TestBed.inject(Router);
  });

  describe('gdy authReady === true', () => {
    beforeEach(() => authReady.set(true));

    it('powinien przepuścić zalogowanego użytkownika', () => {
      isLoggedIn.set(true);

      const result = TestBed.runInInjectionContext(() => authGuard());

      expect(result).toBe(true);
    });

    it('powinien przekierować niezalogowanego użytkownika na /login', () => {
      isLoggedIn.set(false);

      const result = TestBed.runInInjectionContext(() => authGuard());

      const urlTree = result as ReturnType<Router['createUrlTree']>;
      expect(urlTree.toString()).toBe('/login');
    });
  });

  describe('gdy authReady === false (czeka na inicjalizację Firebase)', () => {
    it('powinien zwrócić Observable i przepuścić gdy auth stanie się ready i user zalogowany', async () => {
      isLoggedIn.set(true);

      const result = TestBed.runInInjectionContext(() => authGuard());
      expect(result).toBeInstanceOf(Object); // Observable

      // Simulate auth becoming ready
      authReady.set(true);

      const resolved = await firstValueFrom(result as ReturnType<typeof authGuard> as never);
      expect(resolved).toBe(true);
    });

    it('powinien zwrócić Observable i przekierować na /login gdy auth stanie się ready a user niezalogowany', async () => {
      isLoggedIn.set(false);

      const result = TestBed.runInInjectionContext(() => authGuard());
      expect(result).toBeInstanceOf(Object);

      authReady.set(true);

      const resolved = await firstValueFrom(result as ReturnType<typeof authGuard> as never);
      const urlTree = resolved as ReturnType<Router['createUrlTree']>;
      expect(urlTree.toString()).toBe('/login');
    });
  });
});