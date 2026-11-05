// spec: docs/specs/02-login-screen.md
// covers: docs/specs/02-login-screen.md — route guard for guests (non-authenticated users)
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { noAuthGuard } from './no-auth.guard';

vi.mock('../firebase', () => ({
  auth: {} as unknown,
  db: {} as unknown,
}));

describe('noAuthGuard', () => {
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

    it('powinien przepuścić niezalogowanego użytkownika', () => {
      isLoggedIn.set(false);

      const result = TestBed.runInInjectionContext(() => noAuthGuard());

      expect(result).toBe(true);
    });

    it('powinien przekierować zalogowanego użytkownika na /dashboard', () => {
      isLoggedIn.set(true);

      const result = TestBed.runInInjectionContext(() => noAuthGuard());

      const urlTree = result as ReturnType<Router['createUrlTree']>;
      expect(urlTree.toString()).toBe('/dashboard');
    });
  });

  describe('gdy authReady === false (czeka na inicjalizację Firebase)', () => {
    it('powinien zwrócić Observable i przepuścić gdy auth stanie się ready i user niezalogowany', async () => {
      isLoggedIn.set(false);

      const result = TestBed.runInInjectionContext(() => noAuthGuard());
      expect(result).toBeInstanceOf(Object); // Observable

      authReady.set(true);

      const resolved = await firstValueFrom(result as ReturnType<typeof noAuthGuard> as never);
      expect(resolved).toBe(true);
    });

    it('powinien zwrócić Observable i przekierować na /dashboard gdy auth stanie się ready a user zalogowany', async () => {
      isLoggedIn.set(true);

      const result = TestBed.runInInjectionContext(() => noAuthGuard());
      expect(result).toBeInstanceOf(Object);

      authReady.set(true);

      const resolved = await firstValueFrom(result as ReturnType<typeof noAuthGuard> as never);
      const urlTree = resolved as ReturnType<Router['createUrlTree']>;
      expect(urlTree.toString()).toBe('/dashboard');
    });
  });
});
