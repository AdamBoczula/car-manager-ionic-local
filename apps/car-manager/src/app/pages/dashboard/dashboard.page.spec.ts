// spec: docs/specs/02-login-screen.md
// covers: docs/specs/02-login-screen.md#AC-1, AC-2, AC-3
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { DashboardPage } from './dashboard.page';
import { AuthService } from '../../core/services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { SyncService } from '../../core/services/sync.service';
import type { User } from 'firebase/auth';

const mockUser: Partial<User> = {
  uid: 'test-uid',
  email: 'test@example.com',
};

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let router: Router;

  function createMocks(overrides?: { isOnline?: boolean; userEmail?: string | null }) {
    return {
      authService: {
        currentUser: vi.fn(() => {
          if (overrides?.userEmail === null) return null;
          return (overrides?.userEmail
            ? { uid: 'u1', email: overrides.userEmail, displayName: null }
            : mockUser) as User;
        }),
        isLoggedIn: vi.fn(() => true),
        authReady: vi.fn(() => true),
        logout: vi.fn().mockResolvedValue(undefined),
      },
      storageService: {
        init: vi.fn().mockResolvedValue(undefined),
      },
      syncService: {
        isOnline: vi.fn(() => overrides?.isOnline ?? true),
        processQueue: vi.fn().mockResolvedValue(undefined),
      },
    };
  }

  async function setup(overrides?: { isOnline?: boolean; userEmail?: string | null }) {
    const mocks = createMocks(overrides);

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: AuthService, useValue: mocks.authService },
        { provide: StorageService, useValue: mocks.storageService },
        { provide: SyncService, useValue: mocks.syncService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    router = TestBed.inject(Router);

    return { mocks };
  }

  function render(): void {
    fixture.detectChanges();
  }

  async function renderAndWait(): Promise<void> {
    fixture.detectChanges();
    // Wait for async ngOnInit to finish
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // ── Render tests ──

  describe('renderowanie', () => {
    it('powinien utworzyć komponent', async () => {
      await setup();
      fixture.detectChanges();
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('powinien wyświetlić nagłówek "Car Manager 🚗"', async () => {
      await setup();
      render();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Car Manager');
    });

    it('powinien wyświetlić powitanie "Witaj!"', async () => {
      await setup();
      await renderAndWait();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Witaj!');
    });

    it('powinien wyświetlić email zalogowanego użytkownika', async () => {
      await setup({ userEmail: 'test@example.com' });
      await renderAndWait();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('test@example.com');
    });

    it('nie powinien wyświetlać emaila gdy użytkownik nie ma emaila', async () => {
      await setup({ userEmail: null });
      await renderAndWait();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).not.toContain('@');
    });

    it('powinien wyświetlić wskaźnik "Online" gdy jest połączenie', async () => {
      await setup({ isOnline: true });
      await renderAndWait();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Online');
    });

    it('powinien wyświetlić wskaźnik "Offline" gdy brak połączenia', async () => {
      await setup({ isOnline: false });
      await renderAndWait();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Offline');
    });
  });

  // ── Cards ──

  describe('karty', () => {
    it('powinien wyświetlić kartę "Tankowania"', async () => {
      await setup();
      await renderAndWait();
      const card = fixture.nativeElement.querySelector('[data-testid="card-refuel"]');
      expect(card).toBeTruthy();
      expect(card!.textContent).toContain('Tankowania');
    });

    it('powinien wyświetlić kartę "Naprawy"', async () => {
      await setup();
      await renderAndWait();
      const card = fixture.nativeElement.querySelector('[data-testid="card-repair"]');
      expect(card).toBeTruthy();
      expect(card!.textContent).toContain('Naprawy');
    });

    it('kliknięcie w kartę Tankowania powinno nawigować do /refuel-list', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const card = fixture.nativeElement.querySelector('[data-testid="card-refuel"]') as HTMLElement;
      card.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith(['/refuel-list']);
    });

    it('kliknięcie w kartę Naprawy powinno nawigować do /repair-list', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const card = fixture.nativeElement.querySelector('[data-testid="card-repair"]') as HTMLElement;
      card.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith(['/repair-list']);
    });
  });

  // ── FAB ──

  describe('FAB', () => {
    it('powinien wyrenderować główny przycisk FAB', async () => {
      await setup();
      await renderAndWait();
      const fab = fixture.nativeElement.querySelector('[data-testid="fab-main"]');
      expect(fab).toBeTruthy();
    });

    it('powinien wyrenderować przycisk FAB dla tankowania', async () => {
      await setup();
      await renderAndWait();
      const fabRefuel = fixture.nativeElement.querySelector('[data-testid="fab-refuel"]');
      expect(fabRefuel).toBeTruthy();
    });

    it('powinien wyrenderować przycisk FAB dla naprawy', async () => {
      await setup();
      await renderAndWait();
      const fabRepair = fixture.nativeElement.querySelector('[data-testid="fab-repair"]');
      expect(fabRepair).toBeTruthy();
    });

    it('kliknięcie FAB refuel powinno nawigować do /refuel-form', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const fabRefuel = fixture.nativeElement.querySelector('[data-testid="fab-refuel"]') as HTMLElement;
      fabRefuel.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith(['/refuel-form']);
    });

    it('kliknięcie FAB repair powinno nawigować do /repair-form', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const fabRepair = fixture.nativeElement.querySelector('[data-testid="fab-repair"]') as HTMLElement;
      fabRepair.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith(['/repair-form']);
    });
  });

  // ── Logout ──

  describe('wylogowanie', () => {
    it('powinien wywołać authService.logout() po kliknięciu przycisku wyloguj', async () => {
      const { mocks } = await setup();
      await renderAndWait();

      const logoutBtn = fixture.nativeElement.querySelector('[data-testid="logout-button"]');

      expect(logoutBtn).toBeTruthy();
      (logoutBtn as HTMLElement).click();
      await fixture.whenStable();

      expect(mocks.authService.logout).toHaveBeenCalled();
    });
  });

  // ── Init ──

  describe('inicjalizacja', () => {
    it('powinien wywołać storage.init()', async () => {
      const { mocks } = await setup();
      await renderAndWait();
      expect(mocks.storageService.init).toHaveBeenCalled();
    });

    it('powinien wywołać sync.processQueue() gdy online', async () => {
      const { mocks } = await setup({ isOnline: true });
      await renderAndWait();
      expect(mocks.syncService.processQueue).toHaveBeenCalled();
    });

    it('nie powinien wywołać sync.processQueue() gdy offline', async () => {
      const { mocks } = await setup({ isOnline: false });
      await renderAndWait();
      expect(mocks.syncService.processQueue).not.toHaveBeenCalled();
    });
  });
});