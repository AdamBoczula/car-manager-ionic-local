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
import { RefuelService } from '../../core/services/refuel.service';
import { RepairService } from '../../core/services/repair.service';
import type { Car } from '../../core/models/car.model';
import type { Refuel } from '../../core/models/refuel.model';
import type { Repair } from '../../core/models/repair.model';
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

function createMockRefuels(): Refuel[] {
  return [
    {
      id: 'r1',
      carId: 'car-1',
      date: '2025-11-03',
      amount: 180.5,
      mileage: 55000,
      liters: 30,
      isVerva: false,
      isSkipped: false,
      createdBy: 'u1',
      createdAt: Timestamp.now(),
    },
    {
      id: 'r2',
      carId: 'car-1',
      date: '2025-10-28',
      amount: 200,
      mileage: 54200,
      liters: 35,
      isVerva: true,
      isSkipped: false,
      createdBy: 'u1',
      createdAt: Timestamp.now(),
    },
    {
      id: 'r3',
      carId: 'car-1',
      date: '2025-10-15',
      amount: 150,
      mileage: 53000,
      isVerva: false,
      isSkipped: false,
      createdBy: 'u1',
      createdAt: Timestamp.now(),
    },
    {
      id: 'r4',
      carId: 'car-1',
      date: '2025-10-01',
      amount: 170,
      mileage: 51800,
      liters: 28,
      isVerva: false,
      isSkipped: false,
      createdBy: 'u1',
      createdAt: Timestamp.now(),
    },
  ];
}

function createMockRepairs(): Repair[] {
  return [
    {
      id: 'p1',
      carId: 'car-1',
      date: '2025-10-20',
      amount: 850,
      mileage: 53000,
      location: 'AutoSerwis Kraków',
      description: 'Wymiana hamulców',
      mechanicNote: '',
      createdBy: 'u1',
      createdAt: Timestamp.now(),
    },
    {
      id: 'p2',
      carId: 'car-1',
      date: '2025-09-05',
      amount: 1200,
      mileage: 50000,
      location: 'Mechanik',
      description: 'Wymiana rozrządu',
      mechanicNote: '',
      createdBy: 'u1',
      createdAt: Timestamp.now(),
    },
    {
      id: 'p3',
      carId: 'car-1',
      date: '2025-07-12',
      amount: 350,
      mileage: 47000,
      location: '',
      description: 'Przegląd okresowy',
      mechanicNote: '',
      createdBy: 'u1',
      createdAt: Timestamp.now(),
    },
  ];
}

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let navController: NavController;
  let refuelServiceRefuels: ReturnType<typeof signal<Refuel[]>>;
  let repairServiceRepairs: ReturnType<typeof signal<Repair[]>>;

  function createMocks() {
    refuelServiceRefuels = signal<Refuel[]>([]);
    repairServiceRepairs = signal<Repair[]>([]);

    return {
      authService: {
        currentUser: vi.fn(() => mockUser as User),
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
      refuelService: {
        refuels: refuelServiceRefuels,
        isLoading: signal(false),
        startListening: vi.fn().mockResolvedValue(undefined),
        stopListening: vi.fn(),
      },
      repairService: {
        repairs: repairServiceRepairs,
        isLoading: signal(false),
        startListening: vi.fn().mockResolvedValue(undefined),
        stopListening: vi.fn(),
      },
    };
  }

  async function setup() {
    const mocks = createMocks();
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
        { provide: RefuelService, useValue: mocks.refuelService },
        { provide: RepairService, useValue: mocks.repairService },
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
  });

  // ── Add action buttons ──

  describe('przyciski dodawania', () => {
    it('powinien wyświetlić przycisk "Dodaj tankowanie"', async () => {
      await setup();
      await renderAndWait();
      const btn = fixture.nativeElement.querySelector(
        '[data-testid="btn-add-refuel"]'
      );
      expect(btn).toBeTruthy();
      expect(btn!.textContent).toContain('Dodaj tankowanie');
    });

    it('powinien wyświetlić przycisk "Dodaj naprawę"', async () => {
      await setup();
      await renderAndWait();
      const btn = fixture.nativeElement.querySelector(
        '[data-testid="btn-add-repair"]'
      );
      expect(btn).toBeTruthy();
      expect(btn!.textContent).toContain('Dodaj naprawę');
    });

    it('kliknięcie "Dodaj tankowanie" powinno nawigować do /refuel-form', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(navController, 'navigateForward');
      const btn = fixture.nativeElement.querySelector(
        '[data-testid="btn-add-refuel"]'
      ) as HTMLElement;
      btn.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith('/refuel-form');
    });

    it('kliknięcie "Dodaj naprawę" powinno nawigować do /repair-form', async () => {
      await setup();
      await renderAndWait();

      const navigateSpy = vi.spyOn(navController, 'navigateForward');
      const btn = fixture.nativeElement.querySelector(
        '[data-testid="btn-add-repair"]'
      ) as HTMLElement;
      btn.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith('/repair-form');
    });
  });

  // ── Recent refuels ──

  describe('ostatnie tankowania', () => {
    it('powinien pokazać pusty stan gdy brak tankowań', async () => {
      await setup();
      await renderAndWait();

      const empty = fixture.nativeElement.querySelector(
        '[data-testid="empty-refuels"]'
      );
      expect(empty).toBeTruthy();
      expect(empty!.textContent).toContain('Brak tankowań');
    });

    it('powinien wyświetlić maksymalnie 5 ostatnich tankowań', async () => {
      const { mocks } = await setup();
      refuelServiceRefuels.set(createMockRefuels());
      await renderAndWait();

      const items = fixture.nativeElement.querySelectorAll(
        '[data-testid="recent-refuel-item"]'
      );
      expect(items.length).toBe(4); // 4 items in mock, capped at 5
    });

    it('powinien pokazać link "Zobacz wszystkie" gdy są tankowania', async () => {
      const { mocks } = await setup();
      refuelServiceRefuels.set(createMockRefuels().slice(0, 1));
      await renderAndWait();

      const link = fixture.nativeElement.querySelector(
        '[data-testid="link-all-refuels"]'
      );
      expect(link).toBeTruthy();
    });

    it('nie powinien pokazywać linku "Zobacz wszystkie" gdy brak tankowań', async () => {
      await setup();
      await renderAndWait();

      const link = fixture.nativeElement.querySelector(
        '[data-testid="link-all-refuels"]'
      );
      expect(link).toBeNull();
    });

    it('kliknięcie w element listy powinno nawigować do /refuel-list', async () => {
      const { mocks } = await setup();
      refuelServiceRefuels.set(createMockRefuels().slice(0, 1));
      await renderAndWait();

      const navigateSpy = vi.spyOn(navController, 'navigateForward');
      const item = fixture.nativeElement.querySelector(
        '[data-testid="recent-refuel-item"]'
      ) as HTMLElement;
      item.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith('/refuel-list');
    });

    it('powinien wyświetlić datę, kwotę i przebieg dla tankowania', async () => {
      const { mocks } = await setup();
      refuelServiceRefuels.set([createMockRefuels()[0]]);
      await renderAndWait();

      const item = fixture.nativeElement.querySelector(
        '[data-testid="recent-refuel-item"]'
      ) as HTMLElement;
      expect(item.textContent).toContain('03.11.2025');
      expect(item.textContent).toContain('180,50');
      expect(item.textContent).toContain('55000');
    });

    it('powinien pokazać odznakę Verva dla tankowania premium', async () => {
      const { mocks } = await setup();
      refuelServiceRefuels.set([createMockRefuels()[1]]); // r2 has isVerva=true
      await renderAndWait();

      const item = fixture.nativeElement.querySelector(
        '[data-testid="recent-refuel-item"]'
      ) as HTMLElement;
      expect(item.textContent).toContain('Verva');
    });

    it('powinien wyświetlić spalanie gdy consumption jest dostępne', async () => {
      const { mocks } = await setup();
      const refuelWithConsumption = {
        ...createMockRefuels()[0],
        consumption: 7.5,
        liters: 30,
      };
      refuelServiceRefuels.set([refuelWithConsumption]);
      await renderAndWait();

      const item = fixture.nativeElement.querySelector(
        '[data-testid="recent-refuel-item"]'
      ) as HTMLElement;
      expect(item.textContent).toContain('Spalanie:');
      expect(item.textContent).toContain('7.5');
      expect(item.textContent).toContain('L/100km');
    });

    it('nie powinien wyświetlać spalania gdy consumption jest null', async () => {
      const { mocks } = await setup();
      refuelServiceRefuels.set([createMockRefuels()[0]]); // no consumption
      await renderAndWait();

      const item = fixture.nativeElement.querySelector(
        '[data-testid="recent-refuel-item"]'
      ) as HTMLElement;
      expect(item.textContent).not.toContain('Spalanie:');
    });
  });

  // ── Recent repairs ──

  describe('ostatnie naprawy', () => {
    it('powinien pokazać pusty stan gdy brak napraw', async () => {
      await setup();
      await renderAndWait();

      const empty = fixture.nativeElement.querySelector(
        '[data-testid="empty-repairs"]'
      );
      expect(empty).toBeTruthy();
      expect(empty!.textContent).toContain('Brak napraw');
    });

    it('powinien wyświetlić maksymalnie 5 ostatnich napraw', async () => {
      const { mocks } = await setup();
      repairServiceRepairs.set(createMockRepairs());
      await renderAndWait();

      const items = fixture.nativeElement.querySelectorAll(
        '[data-testid="recent-repair-item"]'
      );
      expect(items.length).toBe(3); // 3 items in mock, capped at 5
    });

    it('powinien pokazać link "Zobacz wszystkie" gdy są naprawy', async () => {
      const { mocks } = await setup();
      repairServiceRepairs.set(createMockRepairs().slice(0, 1));
      await renderAndWait();

      const link = fixture.nativeElement.querySelector(
        '[data-testid="link-all-repairs"]'
      );
      expect(link).toBeTruthy();
    });

    it('nie powinien pokazywać linku "Zobacz wszystkie" gdy brak napraw', async () => {
      await setup();
      await renderAndWait();

      const link = fixture.nativeElement.querySelector(
        '[data-testid="link-all-repairs"]'
      );
      expect(link).toBeNull();
    });

    it('kliknięcie w element listy powinno nawigować do /repair-list', async () => {
      const { mocks } = await setup();
      repairServiceRepairs.set(createMockRepairs().slice(0, 1));
      await renderAndWait();

      const navigateSpy = vi.spyOn(navController, 'navigateForward');
      const item = fixture.nativeElement.querySelector(
        '[data-testid="recent-repair-item"]'
      ) as HTMLElement;
      item.click();
      await fixture.whenStable();

      expect(navigateSpy).toHaveBeenCalledWith('/repair-list');
    });

    it('powinien wyświetlić datę, kwotę, przebieg i lokalizację dla naprawy', async () => {
      const { mocks } = await setup();
      repairServiceRepairs.set([createMockRepairs()[0]]);
      await renderAndWait();

      const item = fixture.nativeElement.querySelector(
        '[data-testid="recent-repair-item"]'
      ) as HTMLElement;
      expect(item.textContent).toContain('20.10.2025');
      expect(item.textContent).toContain('850,00');
      expect(item.textContent).toContain('53000');
      expect(item.textContent).toContain('AutoSerwis Kraków');
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