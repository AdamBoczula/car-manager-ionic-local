// spec: docs/specs/02-login-screen.md
// covers: docs/specs/02-login-screen.md#AC-1, AC-2, AC-3
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import type { User } from 'firebase/auth';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
  onAuthStateChanged: vi.fn(),
  getAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
}));

vi.mock('../firebase', () => ({
  auth: {} as unknown,
}));

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
} from 'firebase/auth';

const mockUser: Partial<User> = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

describe('AuthService', () => {
  let service: AuthService;
  let router: Router;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: getRedirectResult returns null (no pending redirect)
    (getRedirectResult as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    TestBed.configureTestingModule({
      providers: [AuthService, provideRouter([])],
    });

    service = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  describe('constructor / handleRedirectResult', () => {
    it('powinien wywołać getRedirectResult przy inicjalizacji', () => {
      expect(getRedirectResult).toHaveBeenCalled();
    });

    it('powinien przekierować na dashboard gdy redirect result zawiera usera', async () => {
      (getRedirectResult as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
      });

      // Re-create service to trigger constructor with redirect result
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [AuthService, provideRouter([])],
      });
      service = TestBed.inject(AuthService);
      router = TestBed.inject(Router);
      navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      // Wait for async handleRedirectResult
      await new Promise((r) => setTimeout(r, 10));

      expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('login()', () => {
    it('powinien wywołać signInWithEmailAndPassword i przekierować na dashboard', async () => {
      (signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
      });

      await service.login('test@example.com', 'password123');

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'test@example.com',
        'password123'
      );
      expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('register()', () => {
    it('powinien wywołać createUserWithEmailAndPassword i przekierować', async () => {
      (createUserWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
      });

      await service.register('new@example.com', 'password123');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'new@example.com',
        'password123'
      );
      expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('loginWithGoogle()', () => {
    it('powinien użyć signInWithPopup na desktopie', async () => {
      (signInWithPopup as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
      });

      await service.loginWithGoogle();

      expect(GoogleAuthProvider).toHaveBeenCalled();
      expect(signInWithPopup).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object)
      );
      expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('logout()', () => {
    it('powinien wywołać signOut i przekierować na login', async () => {
      (signOut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await service.logout();

      expect(signOut).toHaveBeenCalledWith(expect.any(Object));
      expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('onAuthStateChanged', () => {
    it('powinien zaktualizować stan po otrzymaniu użytkownika', () => {
      const callback = (onAuthStateChanged as ReturnType<typeof vi.fn>).mock.calls[0][1];
      callback(mockUser);

      expect(service.authReady()).toBe(true);
      expect(service.isLoggedIn()).toBe(true);
      expect(service.currentUser()).toEqual(mockUser);
    });

    it('powinien zaktualizować stan po wylogowaniu', () => {
      const callback = (onAuthStateChanged as ReturnType<typeof vi.fn>).mock.calls[0][1];
      callback(null);

      expect(service.authReady()).toBe(true);
      expect(service.isLoggedIn()).toBe(false);
      expect(service.currentUser()).toBeNull();
    });
  });
});