// spec: docs/specs/02-login-screen.md
import { Injectable, inject, signal, computed, DestroyRef, NgZone } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  getRedirectResult,
  type User,
} from 'firebase/auth';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { auth } from '../firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firebaseAuth = auth;
  private readonly navController = inject(NavController);
  private readonly ngZone = inject(NgZone);
  private socialLoginInitialized = false;

  /** Current Firebase user (null if not logged in). */
  readonly currentUser = signal<User | null>(null);

  /** Whether the user is currently logged in. */
  readonly isLoggedIn = computed(() => !!this.currentUser());

  /**
   * Whether Firebase Auth has emitted its first state.
   * Becomes true after the first onAuthStateChanged emission.
   */
  readonly authReady = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Subscribe to auth state changes
    new Observable<User | null>((subscriber) => {
      const unsubscribe = onAuthStateChanged(this.firebaseAuth, (user) => {
        subscriber.next(user);
      });
      return unsubscribe;
    })
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((user) => {
        this.currentUser.set(user);
        this.authReady.set(true);
      });

    // Handle redirect result (for Google sign-in with redirect on mobile)
    this.handleRedirectResult();
  }

  /**
   * Handle Firebase redirect result on page load.
   * Called once on service init to capture Google sign-in redirects.
   */
  private async handleRedirectResult(): Promise<void> {
    try {
      const result = await getRedirectResult(this.firebaseAuth);
      if (result?.user) {
        // Must set currentUser BEFORE navigating (same race condition).
        this.currentUser.set(result.user);
        await this.navController.navigateRoot('/dashboard', { animated: false });
      }
    } catch (err) {
      console.warn('Auth redirect result error:', err);
    }
  }

  async login(email: string, password: string): Promise<void> {
    const result = await signInWithEmailAndPassword(this.firebaseAuth, email, password);
    if (result.user) {
      // Must set currentUser BEFORE navigating, otherwise authGuard
      // runs before onAuthStateChanged fires and blocks the redirect.
      this.currentUser.set(result.user);
      await this.navController.navigateRoot('/dashboard', { animated: false });
    }
  }

  async register(email: string, password: string): Promise<void> {
    const result = await createUserWithEmailAndPassword(this.firebaseAuth, email, password);
    if (result.user) {
      // Must set currentUser BEFORE navigating (same race condition as login).
      this.currentUser.set(result.user);
      await this.navController.navigateRoot('/dashboard', { animated: false });
    }
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();

    try {
      if (Capacitor.isNativePlatform()) {
        await this.ensureSocialLoginInitialized();
        const response = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile'],
          },
        });
        const idToken = response.result.responseType === 'online' ? response.result.idToken : null;
        if (!idToken) {
          throw new Error('Nie otrzymano tokenu identyfikacyjnego Google.');
        }

        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(this.firebaseAuth, credential);

        await this.ngZone.run(async () => {
          if (result.user) {
            this.currentUser.set(result.user);
            await this.navController.navigateRoot('/dashboard', { animated: false });
          }
        });
        return;
      }

      const result = await signInWithPopup(this.firebaseAuth, provider);
      // signInWithPopup resolves outside Angular zone (popup uses postMessage).
      // Re-enter the zone so Ionic transitions & change detection work.
      await this.ngZone.run(async () => {
        if (result.user) {
          this.currentUser.set(result.user);
          await this.navController.navigateRoot('/dashboard', { animated: false });
        }
      });
    } catch (err: unknown) {
      // Swallow popup-closed-by-user or user cancel — user intentionally cancelled
      const firebaseErr = err as { code?: string | number; message?: string } | null | undefined;
      const code = firebaseErr?.code;
      const message = firebaseErr?.message?.toLowerCase();
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'USER_CANCELLED' ||
        code === '12501' ||
        code === 12501 ||
        message?.includes('cancel')
      ) {
        return;
      }
      throw err;
    }
  }

  async logout(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await this.ensureSocialLoginInitialized();
        await SocialLogin.logout({ provider: 'google' });
      } catch {
        // Ignore error if user was not signed in with Google
      }
    }
    await signOut(this.firebaseAuth);
    await this.navController.navigateRoot('/login', { animated: false });
  }

  private async ensureSocialLoginInitialized(): Promise<void> {
    if (this.socialLoginInitialized) {
      return;
    }

    const webClientId = environment.googleAuth?.webClientId;
    if (!webClientId) {
      throw new Error('Brak konfiguracji Google Web Client ID.');
    }

    const iOSClientId = environment.googleAuth?.iOSClientId;
    await SocialLogin.initialize({
      google: {
        webClientId,
        ...(iOSClientId ? { iOSClientId, iOSServerClientId: webClientId } : {}),
        mode: 'online',
        // Only idToken is needed for Firebase Auth; avoids Android AuthorizationClient hang on stock BridgeActivity.
        skipAuthOnlyAuthorizationAfterSignIn: true,
      },
    });
    this.socialLoginInitialized = true;
  }
}
