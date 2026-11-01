// covers: docs/specs/auth/auth.md
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './login.page';
import { AuthService } from '../../core/services/auth.service';
import { FirebaseError } from 'firebase/app';

function createMockAuthService(overrides?: {
  isLoggedIn?: boolean;
  authReady?: boolean;
}) {
  return {
    isLoggedIn: signal(overrides?.isLoggedIn ?? false),
    authReady: signal(overrides?.authReady ?? true),
    currentUser: signal(null),
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  };
}

vi.mock('../../core/firebase', () => ({
  auth: {} as unknown,
  db: {} as unknown,
  app: {} as unknown,
}));

/** Get the native <input> element by its placeholder. Ionic renders both <ion-input> and <input>. */
function getNativeInput(placeholder: string): HTMLInputElement {
  return document.querySelector(
    `input[placeholder="${placeholder}"]`
  ) as HTMLInputElement;
}

describe('LoginPage', () => {
  let mockAuth: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    mockAuth = createMockAuthService({ authReady: true });
    vi.clearAllMocks();
  });

  async function setup(overrides?: { isLoggedIn?: boolean; authReady?: boolean }) {
    mockAuth = createMockAuthService(overrides);
    return render(LoginPage, {
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth },
      ],
    });
  }

  describe('renderowanie', () => {
    it('powinien wyświetlić tytuł aplikacji', async () => {
      await setup();
      expect(screen.getByText('🚗 Car Manager')).toBeInTheDocument();
    });

    it('powinien wyświetlić podtytuł zachęcający do logowania', async () => {
      await setup();
      expect(screen.getByText('Zaloguj się, aby zarządzać kosztami auta')).toBeInTheDocument();
    });

    it('powinien wyświetlić formularz logowania gdy auth jest gotowy', async () => {
      await setup({ authReady: true });
      expect(getNativeInput('twoj@email.com')).toBeInTheDocument();
      expect(getNativeInput('Twoje hasło')).toBeInTheDocument();
    });

    it('powinien wyświetlić spinner ładowania gdy auth nie jest gotowy', async () => {
      await setup({ authReady: false });
      expect(screen.getByText('Ładowanie...')).toBeInTheDocument();
    });

    it('powinien wyświetlić przycisk logowania', async () => {
      await setup();
      expect(screen.getByText('🔑 Zaloguj się')).toBeInTheDocument();
    });

    it('powinien wyświetlić przycisk Google login', async () => {
      await setup();
      expect(screen.getByText('Kontynuuj z Google')).toBeInTheDocument();
    });

    it('powinien wyświetlić link do rejestracji', async () => {
      await setup();
      expect(screen.getByText('Zarejestruj się →')).toBeInTheDocument();
    });

    it('powinien wyświetlić tekst "Nie masz konta?"', async () => {
      await setup();
      expect(screen.getByText('Nie masz konta?')).toBeInTheDocument();
    });
  });

  describe('walidacja formularza', () => {
    it('powinien mieć zablokowany przycisk gdy pola są puste', async () => {
      await setup();
      const button = document.querySelector('ion-button.login-button');
      expect(button).toHaveAttribute('disabled');
    });

    it('powinien odblokować przycisk gdy email i hasło są wypełnione', async () => {
      const user = userEvent.setup();
      const { fixture } = await setup();

      await user.type(getNativeInput('twoj@email.com'), 'test@example.com');
      await user.type(getNativeInput('Twoje hasło'), 'password123');
      await fixture.whenStable();

      const button = document.querySelector('ion-button.login-button');
      expect(button).not.toHaveAttribute('disabled');
    });
  });

  describe('logowanie email/hasło', () => {
    it('powinien wywołać authService.login z danymi z formularza', async () => {
      mockAuth.login.mockResolvedValue({ uid: '123' });
      const user = userEvent.setup();
      await setup();

      await user.type(getNativeInput('twoj@email.com'), 'test@example.com');
      await user.type(getNativeInput('Twoje hasło'), 'password123');
      await user.click(screen.getByText('🔑 Zaloguj się'));

      expect(mockAuth.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  describe('logowanie Google', () => {
    it('powinien wywołać authService.loginWithGoogle', async () => {
      mockAuth.loginWithGoogle.mockResolvedValue({ uid: '123' });
      const user = userEvent.setup();
      await setup();

      await user.click(screen.getByText('Kontynuuj z Google'));
      expect(mockAuth.loginWithGoogle).toHaveBeenCalled();
    });

    it('nie powinien pokazywać błędu gdy użytkownik zamknie popup', async () => {
      const popupError = Object.assign(new Error('Popup closed'), {
        code: 'auth/popup-closed-by-user',
      });
      mockAuth.loginWithGoogle.mockRejectedValue(popupError);
      const user = userEvent.setup();
      const { fixture } = await setup();

      await user.click(screen.getByText('Kontynuuj z Google'));

      expect(fixture.componentInstance.errorMessage()).toBeNull();
    });
  });

  describe('mapowanie błędów Firebase', () => {
    it('auth/invalid-credential → Nieprawidłowy email lub hasło.', () => {
      const err = Object.assign(new FirebaseError('auth/invalid-credential', ''));
      // getErrorMessage jest prywatne, testujemy przez pośrednią logikę
      const msg = LoginPage.prototype['getErrorMessage'](err);
      expect(msg).toBe('Nieprawidłowy email lub hasło.');
    });

    it('auth/too-many-requests → Zbyt wiele prób.', () => {
      const err = Object.assign(new FirebaseError('auth/too-many-requests', ''));
      const msg = LoginPage.prototype['getErrorMessage'](err);
      expect(msg).toBe('Zbyt wiele prób. Spróbuj ponownie za chwilę.');
    });

    it('auth/network-request-failed → Brak połączenia.', () => {
      const err = Object.assign(new FirebaseError('auth/network-request-failed', ''));
      const msg = LoginPage.prototype['getErrorMessage'](err);
      expect(msg).toBe('Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.');
    });

    it('nieznany kod → ogólny komunikat z kodem błędu', () => {
      const err = Object.assign(new FirebaseError('auth/unknown-error', ''));
      const msg = LoginPage.prototype['getErrorMessage'](err);
      expect(msg).toContain('Wystąpił błąd logowania.');
      expect(msg).toContain('auth/unknown-error');
    });

    it('auth/operation-not-allowed → komunikat o konfiguracji Firebase', () => {
      const err = Object.assign(new FirebaseError('auth/operation-not-allowed', ''));
      const msg = LoginPage.prototype['getErrorMessage'](err);
      expect(msg).toContain('Firebase');
      expect(msg).toContain('Authentication');
    });

    it('auth/configuration-not-found → komunikat o konfiguracji Google', () => {
      const err = Object.assign(new FirebaseError('auth/configuration-not-found', ''));
      const msg = LoginPage.prototype['getErrorMessage'](err);
      expect(msg).toContain('Google');
      expect(msg).toContain('Firebase');
    });

    it('REDIRECT_INITIATED → pusty string (bez błędu)', () => {
      const msg = LoginPage.prototype['getErrorMessage'](new Error('REDIRECT_INITIATED'));
      expect(msg).toBe('');
    });

    it('nie-FirebaseError → nieoczekiwany błąd', () => {
      const msg = LoginPage.prototype['getErrorMessage'](new Error('oops'));
      expect(msg).toBe('Wystąpił nieoczekiwany błąd.');
    });
  });
});