// spec: docs/specs/02-login-screen.md
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firebaseAuth: Auth = auth;
  private readonly router = inject(Router);

  readonly currentUser = signal<User | null>(null);
  readonly isLoggedIn = signal(false);
  readonly authReady = signal(false);

  constructor() {
    // Handle redirect result (for Google sign-in with redirect)
    this.handleRedirectResult();

    onAuthStateChanged(this.firebaseAuth, (user) => {
      this.currentUser.set(user);
      this.isLoggedIn.set(!!user);
      this.authReady.set(true);

      // Auto-navigate logged-in user to dashboard if on auth pages
      if (user) {
        const currentUrl = this.router.url;
        if (currentUrl === '/login' || currentUrl === '/register' || currentUrl === '/') {
          this.router.navigate(['/dashboard']);
        }
      }
    });
  }

  /**
   * Handle Firebase redirect result on page load.
   * Called once on service init to capture Google sign-in redirects.
   */
  private async handleRedirectResult(): Promise<void> {
    try {
      const result = await getRedirectResult(this.firebaseAuth);
      if (result?.user) {
        await this.router.navigate(['/dashboard']);
      }
    } catch (err) {
      // Error handled silently — onAuthStateChanged will still fire with null
      console.warn('Auth redirect result error:', err);
    }
  }

  async login(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(
      this.firebaseAuth,
      email,
      password
    );
    await this.router.navigate(['/dashboard']);
    return result.user;
  }

  async register(email: string, password: string): Promise<User> {
    const result = await createUserWithEmailAndPassword(
      this.firebaseAuth,
      email,
      password
    );
    await this.router.navigate(['/dashboard']);
    return result.user;
  }

  async loginWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();

    try {
      // Prefer redirect on mobile (Capacitor WebView doesn't support popup)
      // Popup works on desktop during development
      const isMobile = /android|iphone|ipad/i.test(navigator.userAgent);

      if (isMobile) {
        await signInWithRedirect(this.firebaseAuth, provider);
        // Return is not used for redirect flow — handleRedirectResult picks it up
        throw new Error('REDIRECT_INITIATED');
      }

      const result = await signInWithPopup(this.firebaseAuth, provider);
      await this.router.navigate(['/dashboard']);
      return result.user;
    } catch (err) {
      if (err instanceof Error && err.message === 'REDIRECT_INITIATED') {
        // Redirect was initiated, user will come back via getRedirectResult
        throw err;
      }
      throw err;
    }
  }

  async logout(): Promise<void> {
    await signOut(this.firebaseAuth);
    await this.router.navigate(['/login']);
  }
}