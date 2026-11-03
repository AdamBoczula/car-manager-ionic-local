import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
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
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    IonButton,
    IonContent,
    IonInput,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
    IonText,
    IonToast,
    IonIcon,
  ],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss',
})
export class RegisterPage {
  readonly authService = inject(AuthService);

  readonly email = signal('');
  readonly password = signal('');
  readonly confirmPassword = signal('');
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    addIcons({ logoGoogle });
  }

  async handleRegister(): Promise<void> {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.register(this.email(), this.password());
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
        case 'auth/email-already-in-use':
          return 'Konto z tym adresem email już istnieje.';
        case 'auth/weak-password':
          return 'Hasło jest zbyt słabe. Użyj co najmniej 6 znaków.';
        case 'auth/network-request-failed':
          return 'Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.';
        case 'auth/operation-not-allowed':
          return 'Rejestracja email/hasłem nie jest włączona. Włącz ją w konsoli Firebase (Authentication → Sign-in method → Email/Password).';
        case 'auth/configuration-not-found':
          return 'Projekt Firebase nie ma skonfigurowanego logowania przez Google. Sprawdź konsolę Firebase.';
        default:
          // Log unknown errors to console for debugging
          console.error('Firebase auth error:', err.code, err.message);
          return 'Wystąpił błąd rejestracji. Spróbuj ponownie. (' + err.code + ')';
      }
    }
    return 'Wystąpił nieoczekiwany błąd.';
  }
}