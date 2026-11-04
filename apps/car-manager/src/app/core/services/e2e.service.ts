// spec: docs/specs/02-login-screen.md
// bugfix: docs/bugs/02-router-navigate-in-ionic.md
import { Injectable, inject } from '@angular/core';
import { NavController } from '@ionic/angular';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { environment } from '../../../environments/environment';

/**
 * Eagerly-instantiated service that exposes auth helpers on `window.__e2e__`
 * for Playwright E2E tests when using Firebase emulators.
 *
 * Injected in AppComponent to ensure Firebase is initialized first.
 */
@Injectable({ providedIn: 'root' })
export class E2eService {
  private readonly navController = inject(NavController);

  constructor() {
    if (!environment.production && typeof window !== 'undefined') {
      const helpers: Record<string, unknown> = {
        signIn: (email: string, password: string) =>
          signInWithEmailAndPassword(auth, email, password),
        signOut: () => signOut(auth),
        navigateTo: (path: string) => this.navController.navigateForward(path),
      };

      // Preserve any existing __e2e__ properties (e.g., set by tests before app load)
      const existing = (window as unknown as Record<string, unknown>)[
        '__e2e__'
      ] as Record<string, unknown> | undefined;
      (window as unknown as Record<string, unknown>)['__e2e__'] = {
        ...existing,
        ...helpers,
      };
    }
  }
}
