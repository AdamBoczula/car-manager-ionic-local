// spec: docs/specs/02-login-screen.md
// covers: docs/specs/02-login-screen.md — route guard for guests (non-authenticated users)
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { noAuthGuard } from './no-auth.guard';

vi.mock('../firebase', () => ({
  auth: {} as unknown,
  db: {} as unknown,
}));

describe('noAuthGuard', () => {
  let authService: { isLoggedIn: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(() => {
    authService = {
      isLoggedIn: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', component: {} as never },
          { path: 'login', component: {} as never },
        ]),
        { provide: AuthService, useValue: authService },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('powinien przepuścić niezalogowanego użytkownika', () => {
    authService.isLoggedIn.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => noAuthGuard());

    expect(result).toBe(true);
    expect(authService.isLoggedIn).toHaveBeenCalled();
  });

  it('powinien przekierować zalogowanego użytkownika na /dashboard', () => {
    authService.isLoggedIn.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => noAuthGuard());

    expect(result).toBeInstanceOf(Object); // UrlTree
    const urlTree = result as ReturnType<Router['createUrlTree']>;
    expect(urlTree.toString()).toBe('/dashboard');
    expect(authService.isLoggedIn).toHaveBeenCalled();
  });
});