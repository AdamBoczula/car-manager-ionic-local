// spec: docs/specs/05-car-management.md
// covers: docs/specs/05-car-management.md#AC-8, AC-9, AC-18, AC-20
// bugfix: docs/bugs/02-router-navigate-in-ionic.md
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular, NavController } from '@ionic/angular';
import { signal } from '@angular/core';
import { DashboardPage } from './dashboard.page';
import { AuthService } from '../../core/services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { SyncService } from '../../core/services/sync.service';
import { CarService } from '../../core/services/car.service';
import type { Car } from '../../core/models/car.model';
import type { User } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

vi.mock('../../core/firebase', () => ({
  auth: {} as unknown,
  db: {} as unknown,
}));

const mockUser: Partial<User> = {
  uid: 'test-uid',
  email: 'test@example.com',
};

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let navController: NavController;

  function createMocks(overrides?: { userEmail?: string | null }) {
    return {
      authService: {
        currentUser: vi.fn(() => {
          if (overrides?.userEmail === null) return null;
          return (
            overrides?.userEmail
              ? { uid: 'u1', email: overrides.userEmail, displayName: null }
              : mockUser
          ) as User;
        }),
        isLoggedIn: vi.fn(() => true),
        authReady: vi.fn(() => true),
        logout: vi.fn().mockResolvedValue(undefined),
      },
      storageService: {
        init: vi.fn().mockResolvedValue(undefined),
      },
      syncService: {
        isOnline: vi.fn(() => true),
        processQueue: vi.fn().mockResolvedValue(undefined),
      },
      carService: {
        cars: signal<Car[]>([]),
        activeCar: signal<Car | null>(null),
        activeCarId: signal<string | null>(null),
        hasCars: signal(false),
        isLoading: signal(false),
        addCar: vi.fn().mockResolvedValue({
          id: 'car-1',
          name: 'New Car',
          ownerId: 'u1',
          createdAt: Timestamp.now(),
        } as Car),
        updateCar: vi.fn().mockResolvedValue(undefined),
        deleteCar: vi.fn().mockResolvedValue(undefined),
        setActiveCar: vi.fn().mockResolvedValue(undefined),
        startListening: vi.fn().mockResolvedValue(undefined),
        stopListening: vi.fn(),
      },
    };
  }

  async function setup(overrides?: { userEmail?: string | null }) {
    const mocks = createMocks(overrides);
    const navControllerMock = {
      navigateForward: vi.fn(),
      navigateRoot: vi.fn().mockResolvedValue(true),
      navigateBack: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: NavController, useValue: navControllerMock },
        { provide: AuthService, useValue: mocks.authService },
        { provide: StorageService, useValue: mocks.storageService },
        { provide: SyncService, useValue: mocks.syncService },
        { provide: CarService, useValue: mocks.carService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    navController = TestBed.inject(NavController);

    return { mocks };
  }

  function render(): void {
    fixture.detectChanges();
  }

  async function renderAndWait(): Promise<void> {
    fixture.detectChanges();
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

    it('powinien wyświetlić car-switcher w headerze', async () => {
      await setup();
      await renderAndWait();
      const el = fixture.nativeElement as HTMLElement;
      const switcher = el.querySelector('app-car-switcher');
      expect(switcher).toBeTruthy();
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
  });

  // ── Cards ──

  describe('karty', () => {
    it('powinien wyświetlić kartę "Tankowania"', async () => {
      await setup();
      await renderAndWait();
      const card = fixture.nativeElement.querySelector(
        '[data-testid="card-refuel"]'
      );
      expect(card).toBeTruthy();
      expect(card!.textContent).toContain('Tankowania');
    });

    it('powinien wyświetlić kartę "Naprawy"', async () => {
      await setup();
      await renderAndWait();
      const card = fixture.nativeElement.querySelector(
        '[data-testid="card-repair"]'
      );
      expect(card).toBeTruthy();
      expect(card!.textContent).toContain('Naprawy');
    });

    it('kliknięcie w kartę Tankowania powinno nawigować do /refuel-list', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(navController, 'navigateForward');
      const card = fixture.nativeElement.querySelector(
        '[data-testid="card-refuel"]'
      ) as HTMLElement;
      card.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith('/refuel-list');
    });

    it('kliknięcie w kartę Naprawy powinno nawigować do /repair-list', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(navController, 'navigateForward');
      const card = fixture.nativeElement.querySelector(
        '[data-testid="card-repair"]'
      ) as HTMLElement;
      card.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith('/repair-list');
    });
  });

  // ── FAB ──

  describe('FAB', () => {
    it('powinien wyrenderować główny przycisk FAB', async () => {
      await setup();
      await renderAndWait();
      const fab = fixture.nativeElement.querySelector(
        '[data-testid="fab-main"]'
      );
      expect(fab).toBeTruthy();
    });

    it('powinien wyrenderować przycisk FAB dla tankowania', async () => {
      await setup();
      await renderAndWait();
      const fabRefuel = fixture.nativeElement.querySelector(
        '[data-testid="fab-refuel"]'
      );
      expect(fabRefuel).toBeTruthy();
    });

    it('powinien wyrenderować przycisk FAB dla naprawy', async () => {
      await setup();
      await renderAndWait();
      const fabRepair = fixture.nativeElement.querySelector(
        '[data-testid="fab-repair"]'
      );
      expect(fabRepair).toBeTruthy();
    });

    it('kliknięcie FAB refuel powinno nawigować do /refuel-form', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(navController, 'navigateForward');
      const fabRefuel = fixture.nativeElement.querySelector(
        '[data-testid="fab-refuel"]'
      ) as HTMLElement;
      fabRefuel.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith('/refuel-form');
    });

    it('kliknięcie FAB repair powinno nawigować do /repair-form', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(navController, 'navigateForward');
      const fabRepair = fixture.nativeElement.querySelector(
        '[data-testid="fab-repair"]'
      ) as HTMLElement;
      fabRepair.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith('/repair-form');
    });
  });

  // ── Logout ──

  describe('wylogowanie', () => {
    it('powinien wywołać authService.logout() po kliknięciu przycisku wyloguj', async () => {
      const { mocks } = await setup();
      await renderAndWait();

      const logoutBtn = fixture.nativeElement.querySelector(
        '[data-testid="logout-button"]'
      );

      expect(logoutBtn).toBeTruthy();
      (logoutBtn as HTMLElement).click();
      await fixture.whenStable();

      expect(mocks.authService.logout).toHaveBeenCalled();
    });
  });

  // ── Car added handler ──

  describe('handleCarAdded', () => {
    // covers: docs/specs/05-car-management.md#AC-18
    it('powinien wywołać carService.addCar z opcjonalnymi polami', async () => {
      const { mocks } = await setup();
      await renderAndWait();

      await fixture.componentInstance.handleCarAdded({
        name: 'New Car',
        currentMileage: 123000,
        year: 2020,
        vin: 'WBA123',
      });

      expect(mocks.carService.addCar).toHaveBeenCalledWith('New Car', {
        currentMileage: 123000,
        year: 2020,
        vin: 'WBA123',
      });
      expect(mocks.carService.setActiveCar).toHaveBeenCalledWith('car-1');
    });

    // covers: docs/specs/05-car-management.md#AC-20
    it('powinien wywołać carService.addCar bez opcjonalnych pól gdy są puste', async () => {
      const { mocks } = await setup();
      await renderAndWait();

      await fixture.componentInstance.handleCarAdded({
        name: 'Basic Car',
      });

      expect(mocks.carService.addCar).toHaveBeenCalledWith('Basic Car', {});
      expect(mocks.carService.setActiveCar).toHaveBeenCalledWith('car-1');
    });
  });

  // ── Car updated / deleted handlers ──

  describe('handleCarUpdated', () => {
    it('powinien wywołać carService.updateCar z danymi', async () => {
      const { mocks } = await setup();
      await renderAndWait();

      await fixture.componentInstance.handleCarUpdated({
        id: 'car-1',
        name: 'Updated Car',
        currentMileage: 50000,
        year: 2023,
        vin: 'VIN123',
      });

      expect(mocks.carService.updateCar).toHaveBeenCalledWith('car-1', {
        name: 'Updated Car',
        currentMileage: 50000,
        year: 2023,
        vin: 'VIN123',
      });
    });
  });

  describe('handleCarDeleted', () => {
    it('powinien wywołać carService.deleteCar', async () => {
      const { mocks } = await setup();
      await renderAndWait();

      await fixture.componentInstance.handleCarDeleted('car-1');

      expect(mocks.carService.deleteCar).toHaveBeenCalledWith('car-1');
    });
  });

  // ── Init ──

  describe('inicjalizacja', () => {
    it('powinien wywołać storage.init()', async () => {
      const { mocks } = await setup();
      await renderAndWait();
      expect(mocks.storageService.init).toHaveBeenCalled();
    });
  });

  // ── Car selected handler with redirect ──
  // bugfix: docs/bugs/01-car-switcher-confirmation-redirect.md

  describe('handleCarSelected', () => {
    it('powinien ustawić aktywne auto i przekierować na /dashboard', async () => {
      const { mocks } = await setup();
      await renderAndWait();

      const navigateSpy = vi
        .spyOn(navController, 'navigateRoot')
        .mockResolvedValue(true);
      await fixture.componentInstance.handleCarSelected('car-2');

      expect(mocks.carService.setActiveCar).toHaveBeenCalledWith('car-2');
      expect(navigateSpy).toHaveBeenCalledWith('/dashboard', {
        animated: false,
      });
    });

    it('powinien przekierować na /dashboard nawet gdy auto jest już aktywne', async () => {
      const { mocks } = await setup();
      await renderAndWait();

      const navigateSpy = vi
        .spyOn(navController, 'navigateRoot')
        .mockResolvedValue(true);
      await fixture.componentInstance.handleCarSelected('car-1');

      expect(mocks.carService.setActiveCar).toHaveBeenCalledWith('car-1');
      expect(navigateSpy).toHaveBeenCalledWith('/dashboard', {
        animated: false,
      });
    });
  });
});
