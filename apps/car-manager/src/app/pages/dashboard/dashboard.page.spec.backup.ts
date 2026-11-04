// spec: docs/specs/05-car-management.md
// covers: docs/specs/05-car-management.md#AC-8, AC-9, AC-18, AC-20
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';
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

  function createMocks(overrides?: { userEmail?: string | null }) {
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
      navigateForward: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: AuthService, useValue: mocks.authService },
        { provide: StorageService, useValue: mocks.storageService },
        { provide: SyncService, useValue: mocks.syncService },
        { provide: CarService, useValue: mocks.carService },
        { provide: NavController, useValue: navControllerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);

    return { mocks, navControllerMock };
  }

  function render(): void {
    fixture.detectChanges();
  }

  async function renderAndWait(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  // â”€â”€ Render tests â”€â”€

  describe('renderowanie', () => {
    it('powinien utworzyÄ‡ komponent', async () => {
      await setup();
      fixture.detectChanges();
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('powinien wyÅ›wietliÄ‡ car-switcher w headerze', async () => {
      await setup();
      await renderAndWait();
      const el = fixture.nativeElement as HTMLElement;
      const switcher = el.querySelector('app-car-switcher');
      expect(switcher).toBeTruthy();
    });

    it('powinien wyÅ›wietliÄ‡ powitanie "Witaj!"', async () => {
      await setup();
      await renderAndWait();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('Witaj!');
    });

    it('powinien wyÅ›wietliÄ‡ email zalogowanego uÅ¼ytkownika', async () => {
      await setup({ userEmail: 'test@example.com' });
      await renderAndWait();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('test@example.com');
    });

    it('nie powinien wyÅ›wietlaÄ‡ emaila gdy uÅ¼ytkownik nie ma emaila', async () => {
      await setup({ userEmail: null });
      await renderAndWait();
      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).not.toContain('@');
    });
  });

  // â”€â”€ Cards â”€â”€

  describe('karty', () => {
    it('powinien wyÅ›wietliÄ‡ kartÄ™ "Tankowania"', async () => {
      await setup();
      await renderAndWait();
      const card = fixture.nativeElement.querySelector('[data-testid="card-refuel"]');
      expect(card).toBeTruthy();
      expect(card!.textContent).toContain('Tankowania');
    });

    it('powinien wyÅ›wietliÄ‡ kartÄ™ "Naprawy"', async () => {
      await setup();
      await renderAndWait();
      const card = fixture.nativeElement.querySelector('[data-testid="card-repair"]');
      expect(card).toBeTruthy();
      expect(card!.textContent).toContain('Naprawy');
    });

    it('klikniÄ™cie w kartÄ™ Tankowania powinno nawigowaÄ‡ do /refuel-list', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const card = fixture.nativeElement.querySelector('[data-testid="card-refuel"]') as HTMLElement;
      card.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith(['/refuel-list']);
    });

    it('klikniÄ™cie w kartÄ™ Naprawy powinno nawigowaÄ‡ do /repair-list', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const card = fixture.nativeElement.querySelector('[data-testid="card-repair"]') as HTMLElement;
      card.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith(['/repair-list']);
    });
  });

  // â”€â”€ FAB â”€â”€

  describe('FAB', () => {
    it('powinien wyrenderowaÄ‡ gÅ‚Ã³wny przycisk FAB', async () => {
      await setup();
      await renderAndWait();
      const fab = fixture.nativeElement.querySelector('[data-testid="fab-main"]');
      expect(fab).toBeTruthy();
    });

    it('powinien wyrenderowaÄ‡ przycisk FAB dla tankowania', async () => {
      await setup();
      await renderAndWait();
      const fabRefuel = fixture.nativeElement.querySelector('[data-testid="fab-refuel"]');
      expect(fabRefuel).toBeTruthy();
    });

    it('powinien wyrenderowaÄ‡ przycisk FAB dla naprawy', async () => {
      await setup();
      await renderAndWait();
      const fabRepair = fixture.nativeElement.querySelector('[data-testid="fab-repair"]');
      expect(fabRepair).toBeTruthy();
    });

    it('klikniÄ™cie FAB refuel powinno nawigowaÄ‡ do /refuel-form', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const fabRefuel = fixture.nativeElement.querySelector('[data-testid="fab-refuel"]') as HTMLElement;
      fabRefuel.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith(['/refuel-form']);
    });

    it('klikniÄ™cie FAB repair powinno nawigowaÄ‡ do /repair-form', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const fabRepair = fixture.nativeElement.querySelector('[data-testid="fab-repair"]') as HTMLElement;
      fabRepair.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith(['/repair-form']);
    });
  });

  // â”€â”€ Logout â”€â”€

  describe('wylogowanie', () => {
    it('powinien wywoÅ‚aÄ‡ authService.logout() po klikniÄ™ciu przycisku wyloguj', async () => {
      const { mocks } = await setup();
      await renderAndWait();

      const logoutBtn = fixture.nativeElement.querySelector('[data-testid="logout-button"]');

      expect(logoutBtn).toBeTruthy();
      (logoutBtn as HTMLElement).click();
      await fixture.whenStable();

      expect(mocks.authService.logout).toHaveBeenCalled();
    });
  });

  // â”€â”€ Car added handler â”€â”€

  describe('handleCarAdded', () => {
    // covers: docs/specs/05-car-management.md#AC-18
    it('powinien wywoÅ‚aÄ‡ carService.addCar z opcjonalnymi polami', async () => {
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
    it('powinien wywoÅ‚aÄ‡ carService.addCar bez opcjonalnych pÃ³l gdy sÄ… puste', async () => {
      const { mocks } = await setup();
      await renderAndWait();

      await fixture.componentInstance.handleCarAdded({
        name: 'Basic Car',
      });

      expect(mocks.carService.addCar).toHaveBeenCalledWith('Basic Car', {});
      expect(mocks.carService.setActiveCar).toHaveBeenCalledWith('car-1');
    });
  });

  // â”€â”€ Car updated / deleted handlers â”€â”€

  describe('handleCarUpdated', () => {
    it('powinien wywoÅ‚aÄ‡ carService.updateCar z danymi', async () => {
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
    it('powinien wywoÅ‚aÄ‡ carService.deleteCar', async () => {
      const { mocks } = await setup();
      await renderAndWait();

      await fixture.componentInstance.handleCarDeleted('car-1');

      expect(mocks.carService.deleteCar).toHaveBeenCalledWith('car-1');
    });
  });

  // â”€â”€ Init â”€â”€

  describe('inicjalizacja', () => {
    it('powinien wywoÅ‚aÄ‡ storage.init()', async () => {
      const { mocks } = await setup();
      await renderAndWait();
      expect(mocks.storageService.init).toHaveBeenCalled();
    });
  });
});
