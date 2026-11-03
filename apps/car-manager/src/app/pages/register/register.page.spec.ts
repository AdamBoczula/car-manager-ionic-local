// covers: docs/specs/auth/auth.md
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { RegisterPage } from './register.page';
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

describe('RegisterPage', () => {
  let mockAuth: ReturnType<typeof createMockAuthService>;

  beforeEach(() => {
    mockAuth = createMockAuthService({ authReady: true });
    vi.clearAllMocks();
  });

  async function setup(overrides?: { isLoggedIn?: boolean; authReady?: boolean }) {
    mockAuth = createMockAuthService(overrides);
    return render(RegisterPage, {
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: mockAuth },
      ],
    });
  }

  describe('renderowanie', () => {
    it('powinien wyświetlić tytuł rejestracji', async () => {
      await setup();
      expect(screen.getByText('Utwórz konto')).toBeInTheDocument();
    });

    it('powinien wyświetlić podtytuł', async () => {
      await setup();
      expect(screen.getByText('Zarejestruj się, aby zacząć śledzić koszty')).toBeInTheDocument();
    });

    it('powinien wyświetlić formularz gdy auth jest gotowy', async () => {
      await setup({ authReady: true });
      expect(getNativeInput('twoj@email.com')).toBeInTheDocument();
      expect(getNativeInput('Minimum 6 znaków')).toBeInTheDocument();
      expect(getNativeInput('Wpisz hasło ponownie')).toBeInTheDocument();
    });

    it('powinien wyświetlić spinner ładowania gdy auth nie jest gotowy', async () => {
      await setup({ authReady: false });
      expect(screen.getByText('Ładowanie...')).toBeInTheDocument();
    });

    it('powinien wyświetlić przycisk rejestracji', async () => {
      await setup();
      expect(screen.getByText('✨ Utwórz konto')).toBeInTheDocument();
    });

    it('powinien wyświetlić link do logowania', async () => {
      await setup();
      expect(screen.getByText('Zaloguj się →')).toBeInTheDocument();
    });
  });

  describe('walidacja hasła', () => {
    it('powinien pokazać błąd gdy hasło jest za krótkie', async () => {
      const user = userEvent.setup();
      await setup();
      await user.type(getNativeInput('Minimum 6 znaków'), '12345');
      expect(screen.getByText('Hasło musi mieć co najmniej 6 znaków.')).toBeInTheDocument();
    });

    it('nie powinien pokazywać błędu gdy hasło ma 6+ znaków', async () => {
      const user = userEvent.setup();
      await setup();
      await user.type(getNativeInput('Minimum 6 znaków'), '123456');
      expect(screen.queryByText('Hasło musi mieć co najmniej 6 znaków.')).not.toBeInTheDocument();
    });

    it('powinien pokazać błąd gdy hasła nie są zgodne', async () => {
      const user = userEvent.setup();
      await setup();
      await user.type(getNativeInput('Minimum 6 znaków'), 'password123');
      await user.type(getNativeInput('Wpisz hasło ponownie'), 'different');
      expect(screen.getByText('Hasła nie są identyczne.')).toBeInTheDocument();
    });

    it('nie powinien pokazywać błędu zgodności gdy hasła są identyczne', async () => {
      const user = userEvent.setup();
      await setup();
      await user.type(getNativeInput('Minimum 6 znaków'), 'password123');
      await user.type(getNativeInput('Wpisz hasło ponownie'), 'password123');
      expect(screen.queryByText('Hasła nie są identyczne.')).not.toBeInTheDocument();
    });
  });

  describe('stan przycisku', () => {
    it('powinien być zablokowany gdy pola są puste', async () => {
      await setup();
      const button = document.querySelector('ion-button.register-button');
      expect(button).toHaveAttribute('disabled');
    });

    it('powinien być zablokowany gdy hasła nie są zgodne', async () => {
      const user = userEvent.setup();
      const { fixture } = await setup();
      await user.type(getNativeInput('twoj@email.com'), 'test@example.com');
      await user.type(getNativeInput('Minimum 6 znaków'), 'password123');
      await user.type(getNativeInput('Wpisz hasło ponownie'), 'different');
      await fixture.whenStable();

      const button = document.querySelector('ion-button.register-button');
      expect(button).toHaveAttribute('disabled');
    });
  });

  describe('rejestracja', () => {
    it('powinien wywołać authService.register z danymi', async () => {
      mockAuth.register.mockResolvedValue({ uid: '123' });
      const user = userEvent.setup();
      await setup();

      await user.type(getNativeInput('twoj@email.com'), 'new@example.com');
      await user.type(getNativeInput('Minimum 6 znaków'), 'password123');
      await user.type(getNativeInput('Wpisz hasło ponownie'), 'password123');
      await user.click(screen.getByText('✨ Utwórz konto'));

      expect(mockAuth.register).toHaveBeenCalledWith('new@example.com', 'password123');
    });
  });

  describe('mapowanie błędów Firebase', () => {
    it('auth/email-already-in-use → konto już istnieje', () => {
      const err = Object.assign(new FirebaseError('auth/email-already-in-use', ''));
      const msg = RegisterPage.prototype['getErrorMessage'](err);
      expect(msg).toBe('Konto z tym adresem email już istnieje.');
    });

    it('auth/weak-password → hasło zbyt słabe', () => {
      const err = Object.assign(new FirebaseError('auth/weak-password', ''));
      const msg = RegisterPage.prototype['getErrorMessage'](err);
      expect(msg).toBe('Hasło jest zbyt słabe. Użyj co najmniej 6 znaków.');
    });

    it('auth/network-request-failed → brak połączenia', () => {
      const err = Object.assign(new FirebaseError('auth/network-request-failed', ''));
      const msg = RegisterPage.prototype['getErrorMessage'](err);
      expect(msg).toBe('Brak połączenia z internetem. Sprawdź sieć i spróbuj ponownie.');
    });

    it('nieznany kod → ogólny komunikat z kodem błędu', () => {
      const err = Object.assign(new FirebaseError('auth/unknown', ''));
      const msg = RegisterPage.prototype['getErrorMessage'](err);
      expect(msg).toContain('Wystąpił błąd rejestracji.');
      expect(msg).toContain('auth/unknown');
    });

    it('auth/operation-not-allowed → komunikat o konfiguracji Firebase', () => {
      const err = Object.assign(new FirebaseError('auth/operation-not-allowed', ''));
      const msg = RegisterPage.prototype['getErrorMessage'](err);
      expect(msg).toContain('Email/Password');
      expect(msg).toContain('Firebase');
    });

    it('auth/configuration-not-found → komunikat o konfiguracji Google', () => {
      const err = Object.assign(new FirebaseError('auth/configuration-not-found', ''));
      const msg = RegisterPage.prototype['getErrorMessage'](err);
      expect(msg).toContain('Google');
      expect(msg).toContain('Firebase');
    });

    it('REDIRECT_INITIATED → nieoczekiwany błąd (już nie wspierany)', () => {
      const msg = RegisterPage.prototype['getErrorMessage'](new Error('REDIRECT_INITIATED'));
      expect(msg).toBe('Wystąpił nieoczekiwany błąd.');
    });

    it('nie-FirebaseError → nieoczekiwany błąd', () => {
      const msg = RegisterPage.prototype['getErrorMessage'](new Error('oops'));
      expect(msg).toBe('Wystąpił nieoczekiwany błąd.');
    });
  });
});