import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
  IonText,
  IonToast,
  IonIcon,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logoGoogle } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { FirebaseError } from 'firebase/app';

@Component({
  selector: 'app-login',
  host: { class: 'ion-page' },
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    IonButton,
    IonContent,
    IonInput,
    IonItem,
    IonLabel,
    IonSpinner,
    IonText,
    IonToast,
    IonIcon,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  readonly authService = inject(AuthService);

  readonly email = signal('');
  readonly password = signal('');
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<{ email?: string; password?: string }>({});

  constructor() {
    addIcons({ logoGoogle });
  }

  async handleLogin(): Promise<void> {
    if (this.isLoading()) return;

    // Validate fields client-side
    const errors: { email?: string; password?: string } = {};
    if (!this.email().trim()) {
      errors.email = 'Email jest wymagany.';
    }
    if (!this.password()) {
      errors.password = 'Hasło jest wymagane.';
    }
    this.fieldErrors.set(errors);
    if (errors.email || errors.password) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.login(this.email(), this.password());
    } catch (err) {
      this.errorMessage.set(this.getErrorMessage(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleGoogleLogin(): Promise<void> {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.loginWithGoogle();
    } catch (err) {
      // Nie pokazuj błędu, jeśli użytkownik anulował popup
      if ((err as FirebaseError)?.code !== 'auth/popup-closed-by-user') {
        this.errorMessage.set(this.getErrorMessage(err));
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private getErrorMessage(err: unknown): string {
    if (err instanceof FirebaseError) {
      switch (err.code) {
        case 'auth/invalid-credential':
          return 'Nieprawidłowy email lub hasło.';
        case 'auth/invalid-email':
          return 'Nieprawidłowy format emaila.';
        case 'auth/missing-password':
          return 'Hasło jest wymagane.';
        case 'auth/too-many-requests':
          return 'Zbyt wiele prób. Spróbuj ponownie za chwilę.';
        case 'auth/network-request-failed':
          return 'Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.';
        case 'auth/operation-not-allowed':
          return 'Logowanie email/hasłem nie jest włączone. Włącz je w konsoli Firebase (Authentication → Sign-in method).';
        case 'auth/configuration-not-found':
          return 'Projekt Firebase nie ma skonfigurowanego logowania przez Google. Sprawdź konsolę Firebase.';
        default:
          // Log unknown errors to console for debugging
          console.error('Firebase auth error:', err.code, err.message);
          return 'Wystąpił błąd logowania. Spróbuj ponownie. (' + err.code + ')';
      }
    }
    return 'Wystąpił nieoczekiwany błąd.';
  }
}
