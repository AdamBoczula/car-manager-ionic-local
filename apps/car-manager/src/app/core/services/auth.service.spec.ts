import type { Auth } from 'firebase/auth';
// spec: docs/specs/02-login-screen.md
// covers: docs/specs/02-login-screen.md#AC-1, AC-2, AC-3
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { AuthService } from './auth.service';

// Mock @capacitor/core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}));

// Mock @codetrix-studio/capacitor-google-auth
vi.mock('@codetrix-studio/capacitor-google-auth', () => ({
  GoogleAuth: {
    initialize: vi.fn().mockResolvedValue(undefined),
    signIn: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock firebase/auth (direct SDK)
vi.mock('firebase/auth', () => {
  const credentialFn = vi
    .fn()
    .mockReturnValue({ providerId: 'google.com', signInMethod: 'google.com' });
  const providerClass = vi.fn();
  (providerClass as unknown as { credential: typeof credentialFn }).credential = credentialFn;

  return {
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    GoogleAuthProvider: providerClass,
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
    getRedirectResult: vi.fn(),
    signInWithCredential: vi.fn(),
  };
});

// Mock the ../firebase module to provide a mock auth instance
vi.mock('../firebase', () => ({
  auth: {} as Auth,
}));

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  getRedirectResult,
} from 'firebase/auth';
import type { User } from 'firebase/auth';

const mockUser: User = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
} as User;

describe('AuthService', () => {
  let service: AuthService;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    navigateSpy = vi.fn().mockResolvedValue(true);
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    // Default: onAuthStateChanged emits null (not logged in)
    (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
      (_auth: unknown, callback: (user: User | null) => void) => {
        callback(null);
        return vi.fn(); // unsubscribe
      },
    );
    // Default: getRedirectResult returns null (no pending redirect)
    (getRedirectResult as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideRouter([]),
        { provide: NavController, useValue: { navigateRoot: navigateSpy } },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  describe('constructor / handleRedirectResult', () => {
    it('powinien wywołać getRedirectResult przy inicjalizacji', () => {
      expect(getRedirectResult).toHaveBeenCalled();
    });

    it('powinien przekierować na dashboard gdy redirect result zawiera usera', async () => {
      // Re-create with different getRedirectResult mock
      vi.clearAllMocks();
      (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
        (_auth: unknown, callback: (user: User | null) => void) => {
          callback(null);
          return vi.fn();
        },
      );
      (getRedirectResult as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthService,
          provideRouter([]),
          { provide: NavController, useValue: { navigateRoot: navigateSpy } },
        ],
      });
      service = TestBed.inject(AuthService);

      // Wait for async handleRedirectResult
      await new Promise((r) => setTimeout(r, 10));

      // currentUser must be set BEFORE navigation to avoid race with authGuard
      expect(service.currentUser()).toBe(mockUser);
      expect(service.isLoggedIn()).toBe(true);
      expect(navigateSpy).toHaveBeenCalledWith('/dashboard', { animated: false });
    });
  });

  describe('login()', () => {
    it('powinien wywołać signInWithEmailAndPassword, ustawić currentUser i przekierować na dashboard', async () => {
      (signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
      });

      await service.login('test@example.com', 'password123');

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'test@example.com',
        'password123',
      );
      // currentUser must be set BEFORE navigation to avoid race with authGuard
      expect(service.currentUser()).toBe(mockUser);
      expect(service.isLoggedIn()).toBe(true);
      expect(navigateSpy).toHaveBeenCalledWith('/dashboard', { animated: false });
    });
  });

  describe('register()', () => {
    it('powinien wywołać createUserWithEmailAndPassword, ustawić currentUser i przekierować', async () => {
      (createUserWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
      });

      await service.register('new@example.com', 'password123');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        'new@example.com',
        'password123',
      );
      // currentUser must be set BEFORE navigation to avoid race with authGuard
      expect(service.currentUser()).toBe(mockUser);
      expect(service.isLoggedIn()).toBe(true);
      expect(navigateSpy).toHaveBeenCalledWith('/dashboard', { animated: false });
    });
  });

  describe('loginWithGoogle()', () => {
    it('powinien użyć signInWithPopup na desktopie, ustawić currentUser i przekierować', async () => {
      (signInWithPopup as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
      });

      await service.loginWithGoogle();

      expect(GoogleAuthProvider).toHaveBeenCalled();
      expect(signInWithPopup).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
      // currentUser must be set BEFORE navigation to avoid race with authGuard
      expect(service.currentUser()).toBe(mockUser);
      expect(service.isLoggedIn()).toBe(true);
      expect(navigateSpy).toHaveBeenCalledWith('/dashboard', { animated: false });
    });

    it('powinien użyć GoogleAuth.signIn i signInWithCredential na platformie natywnej', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(GoogleAuth.signIn).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        familyName: 'User',
        givenName: 'Test',
        imageUrl: 'http://example.com/avatar.png',
        serverAuthCode: 'auth-code',
        authentication: {
          accessToken: 'access-token',
          idToken: 'mock-google-id-token',
        },
      });
      (signInWithCredential as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
      });

      await service.loginWithGoogle();

      expect(GoogleAuth.initialize).toHaveBeenCalled();
      expect(GoogleAuth.signIn).toHaveBeenCalled();
      expect(GoogleAuthProvider.credential).toHaveBeenCalledWith('mock-google-id-token');
      expect(signInWithCredential).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
      expect(service.currentUser()).toBe(mockUser);
      expect(service.isLoggedIn()).toBe(true);
      expect(navigateSpy).toHaveBeenCalledWith('/dashboard', { animated: false });
    });

    it('powinien zignorować anulowanie logowania na platformie natywnej (kod 12501)', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(GoogleAuth.signIn).mockRejectedValue({
        code: '12501',
        message: 'The user canceled the sign-in flow.',
      });

      await expect(service.loginWithGoogle()).resolves.toBeUndefined();
      expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('powinien rzucić błąd gdy brak idToken na platformie natywnej', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(GoogleAuth.signIn).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        familyName: 'User',
        givenName: 'Test',
        imageUrl: '',
        serverAuthCode: '',
        authentication: {
          accessToken: 'access-token',
          idToken: '',
        },
      });

      await expect(service.loginWithGoogle()).rejects.toThrow();
    });
  });

  describe('logout()', () => {
    it('powinien wywołać signOut i przekierować na login na webie', async () => {
      (signOut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await service.logout();

      expect(signOut).toHaveBeenCalledWith(expect.any(Object));
      expect(navigateSpy).toHaveBeenCalledWith('/login', { animated: false });
    });

    it('powinien wywołać GoogleAuth.signOut i signOut na platformie natywnej', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      (signOut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await service.logout();

      expect(GoogleAuth.signOut).toHaveBeenCalled();
      expect(signOut).toHaveBeenCalledWith(expect.any(Object));
      expect(navigateSpy).toHaveBeenCalledWith('/login', { animated: false });
    });
  });

  describe('auth state', () => {
    it('powinien ustawić authReady na true po pierwszej emisji onAuthStateChanged', () => {
      expect(service.authReady()).toBe(true);
      expect(service.isLoggedIn()).toBe(false);
      expect(service.currentUser()).toBeNull();
    });

    it('powinien zaktualizować stan gdy onAuthStateChanged emituje usera', () => {
      // Re-create with user emitted
      vi.clearAllMocks();
      (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
        (_auth: unknown, callback: (user: User | null) => void) => {
          callback(mockUser);
          return vi.fn();
        },
      );
      (getRedirectResult as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthService,
          provideRouter([]),
          { provide: NavController, useValue: { navigateRoot: navigateSpy } },
        ],
      });
      service = TestBed.inject(AuthService);

      expect(service.authReady()).toBe(true);
      expect(service.isLoggedIn()).toBe(true);
      expect(service.currentUser()?.uid).toBe('test-uid-123');
    });
  });
});
