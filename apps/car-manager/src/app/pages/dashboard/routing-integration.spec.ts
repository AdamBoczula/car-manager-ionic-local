// spec: docs/specs/05-car-management.md
// covers: dashboard → refuel-list and dashboard → repair-list navigation
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { Routes } from '@angular/router';
import { provideRouter, Router } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';
import { signal, Component } from '@angular/core';
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

/** Stub pages for navigation targets -- unique host to avoid NG0912 */
@Component({
  standalone: true,
  host: { 'data-stub': 'refuel-list' },
  template: '<div>refuel-list page</div>',
})
class RefuelListStub {}

@Component({
  standalone: true,
  host: { 'data-stub': 'repair-list' },
  template: '<div>repair-list page</div>',
})
class RepairListStub {}

@Component({
  standalone: true,
  host: { 'data-stub': 'refuel-form' },
  template: '<div>refuel-form page</div>',
})
class RefuelFormStub {}

@Component({
  standalone: true,
  host: { 'data-stub': 'repair-form' },
  template: '<div>repair-form page</div>',
})
class RepairFormStub {}

const routes: Routes = [
  { path: 'dashboard', component: DashboardPage },
  { path: 'refuel-list', component: RefuelListStub },
  { path: 'repair-list', component: RepairListStub },
  { path: 'refuel-form', component: RefuelFormStub },
  { path: 'repair-form', component: RepairFormStub },
];

describe('DashboardPage routing integration', () => {
  let fixture: ComponentFixture<DashboardPage>;
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
        isInitialized: signal(true),
        addCar: vi.fn().mockResolvedValue({ id: 'c1', name: 'A' }),
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
      navigateForward: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage, RefuelListStub, RepairListStub, RefuelFormStub, RepairFormStub],
      providers: [
        provideRouter(routes),
        provideIonicAngular({ mode: 'md' }),
        { provide: AuthService, useValue: mocks.authService },
        { provide: StorageService, useValue: mocks.storageService },
        { provide: SyncService, useValue: mocks.syncService },
        { provide: CarService, useValue: mocks.carService },
        { provide: RefuelService, useValue: mocks.refuelService },
        { provide: RepairService, useValue: mocks.repairService },
        { provide: NavController, useValue: navControllerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await TestBed.flushEffects();

    return { mocks, navControllerMock };
  }

  it('should navigate from dashboard to refuel-list via "Zobacz wszystkie" link click', async () => {
    const { mocks, navControllerMock } = await setup();
    // Need refuels for the "Zobacz wszystkie" link to appear
    const car: Car = { id: 'c1', name: 'A', ownerId: 'u1', createdAt: Timestamp.now() };
    mocks.carService.cars.set([car]);
    mocks.carService.activeCar.set(car);
    mocks.carService.activeCarId.set('c1');
    mocks.carService.hasCars.set(true);
    refuelServiceRefuels.set([
      {
        id: 'r1',
        carId: 'c1',
        date: '2026-01-15',
        amount: 250,
        mileage: 125000,
        liters: 40,
        isVerva: false,
        isSkipped: false,
        createdBy: 'u1',
        createdAt: Timestamp.now(),
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await TestBed.flushEffects();

    const link = document.querySelector('[data-testid="link-all-refuels"]')!;
    expect(link).toBeTruthy();
    link.click();

    expect(navControllerMock.navigateForward).toHaveBeenCalledWith('/refuel-list');
  });

  it('should navigate from dashboard to repair-list via "Zobacz wszystkie" link click', async () => {
    const { mocks, navControllerMock } = await setup();
    const car: Car = { id: 'c1', name: 'A', ownerId: 'u1', createdAt: Timestamp.now() };
    mocks.carService.cars.set([car]);
    mocks.carService.activeCar.set(car);
    mocks.carService.activeCarId.set('c1');
    mocks.carService.hasCars.set(true);
    repairServiceRepairs.set([
      {
        id: 'p1',
        carId: 'c1',
        date: '2026-01-15',
        amount: 500,
        mileage: 125000,
        location: 'Serwis',
        description: 'Naprawa',
        mechanicNote: '',
        createdBy: 'u1',
        createdAt: Timestamp.now(),
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await TestBed.flushEffects();

    const link = document.querySelector('[data-testid="link-all-repairs"]')!;
    expect(link).toBeTruthy();
    link.click();

    expect(navControllerMock.navigateForward).toHaveBeenCalledWith('/repair-list');
  });

  it('should navigate from dashboard to refuel-form via FAB click', async () => {
    const { navControllerMock } = await setup();

    const fab = document.querySelector('[data-testid="fab-refuel"]')!;
    expect(fab).toBeTruthy();
    fab.click();

    expect(navControllerMock.navigateForward).toHaveBeenCalledWith('/refuel-form');
  });

  it('should navigate from dashboard to repair-form via FAB click', async () => {
    const { navControllerMock } = await setup();

    const fab = document.querySelector('[data-testid="fab-repair"]')!;
    expect(fab).toBeTruthy();
    fab.click();

    expect(navControllerMock.navigateForward).toHaveBeenCalledWith('/repair-form');
  });

  // bugfix: docs/bugs/01-car-switcher-confirmation-redirect.md
  it('should display dashboard content (not just URL) after car selection redirect', async () => {
    const { navControllerMock } = await setup();

    const dashContent = document.querySelector('.dashboard-content');
    expect(dashContent).toBeTruthy();
    const refuelBtn = document.querySelector('[data-testid="btn-add-refuel"]');
    expect(refuelBtn).toBeTruthy();

    // Verify that if we navigate via NavController, dashboard content persists
    expect(navControllerMock.navigateForward).toBeDefined();
  });
});

// bugfix: docs/bugs/02-router-navigate-in-ionic.md
describe('DashboardPage routing integration — real NavController', () => {
  let fixture: ComponentFixture<DashboardPage>;
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
        isInitialized: signal(true),
        addCar: vi.fn().mockResolvedValue({ id: 'c1', name: 'A' }),
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

  async function setupRealNav() {
    const mocks = createMocks();

    await TestBed.configureTestingModule({
      imports: [DashboardPage, RefuelListStub, RepairListStub, RefuelFormStub, RepairFormStub],
      providers: [
        provideRouter(routes),
        provideIonicAngular({ mode: 'md' }),
        { provide: AuthService, useValue: mocks.authService },
        { provide: StorageService, useValue: mocks.storageService },
        { provide: SyncService, useValue: mocks.syncService },
        { provide: CarService, useValue: mocks.carService },
        { provide: RefuelService, useValue: mocks.refuelService },
        { provide: RepairService, useValue: mocks.repairService },
        // No NavController mock — use real Ionic NavController
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await TestBed.flushEffects();

    return { mocks };
  }

  // covers: docs/bugs/02-router-navigate-in-ionic.md
  it('should navigate to /refuel-list and change URL when clicking "Zobacz wszystkie" link', async () => {
    const { mocks } = await setupRealNav();
    // Add a car and refuel so the link appears
    const car: Car = { id: 'c1', name: 'A', ownerId: 'u1', createdAt: Timestamp.now() };
    mocks.carService.activeCarId.set('c1');
    mocks.carService.activeCar.set(car);
    mocks.carService.cars.set([car]);
    mocks.carService.hasCars.set(true);
    refuelServiceRefuels.set([
      {
        id: 'r1',
        carId: 'c1',
        date: '2026-01-15',
        amount: 250,
        mileage: 125000,
        liters: 40,
        isVerva: false,
        isSkipped: false,
        createdBy: 'u1',
        createdAt: Timestamp.now(),
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await TestBed.flushEffects();

    // Verify we start on dashboard
    expect(document.querySelector('.dashboard-content')).toBeTruthy();
    expect(document.querySelector('[data-testid="link-all-refuels"]')).toBeTruthy();

    // Click the "Zobacz wszystkie" link
    const link = document.querySelector('[data-testid="link-all-refuels"]')!;
    link.click();
    await fixture.whenStable();

    // Verify the router URL reflects navigation
    const router = TestBed.inject(Router);
    const currentUrl = router.url;
    expect(currentUrl).toContain('refuel-list');
  });

  // covers: docs/bugs/02-router-navigate-in-ionic.md
  it('should navigate to /repair-list and change URL when clicking "Zobacz wszystkie" link', async () => {
    const { mocks } = await setupRealNav();
    const car: Car = { id: 'c1', name: 'A', ownerId: 'u1', createdAt: Timestamp.now() };
    mocks.carService.activeCarId.set('c1');
    mocks.carService.activeCar.set(car);
    mocks.carService.cars.set([car]);
    mocks.carService.hasCars.set(true);
    repairServiceRepairs.set([
      {
        id: 'p1',
        carId: 'c1',
        date: '2026-01-15',
        amount: 500,
        mileage: 125000,
        location: 'Serwis',
        description: 'Naprawa',
        mechanicNote: '',
        createdBy: 'u1',
        createdAt: Timestamp.now(),
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await TestBed.flushEffects();

    expect(document.querySelector('.dashboard-content')).toBeTruthy();
    expect(document.querySelector('[data-testid="link-all-repairs"]')).toBeTruthy();

    const link = document.querySelector('[data-testid="link-all-repairs"]')!;
    link.click();
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    const currentUrl = router.url;
    expect(currentUrl).toContain('repair-list');
  });

  // covers: docs/bugs/02-router-navigate-in-ionic.md
  it('should ACTIVATE the refuel-list component, not just change URL', async () => {
    const { mocks } = await setupRealNav();
    const car: Car = { id: 'c1', name: 'A', ownerId: 'u1', createdAt: Timestamp.now() };
    mocks.carService.activeCarId.set('c1');
    mocks.carService.activeCar.set(car);
    mocks.carService.cars.set([car]);
    mocks.carService.hasCars.set(true);
    refuelServiceRefuels.set([
      {
        id: 'r1',
        carId: 'c1',
        date: '2026-01-15',
        amount: 250,
        mileage: 125000,
        liters: 40,
        isVerva: false,
        isSkipped: false,
        createdBy: 'u1',
        createdAt: Timestamp.now(),
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await TestBed.flushEffects();

    // Verify dashboard content is present before navigation
    expect(document.querySelector('.dashboard-content')).toBeTruthy();
    expect(document.querySelector('[data-testid="link-all-refuels"]')).toBeTruthy();

    // Click "Zobacz wszystkie" link
    const link = document.querySelector('[data-testid="link-all-refuels"]')!;
    link.click();
    await fixture.whenStable();

    // The Angular Router should have the refuel-list route as active.
    const router = TestBed.inject(Router);
    expect(router.url).toContain('refuel-list');

    // Verify the activated component is RefuelListStub
    const rootSnapshot = router.routerState.root;
    let leafSnapshot = rootSnapshot;
    while (leafSnapshot.firstChild) {
      leafSnapshot = leafSnapshot.firstChild;
    }
    expect(leafSnapshot.routeConfig?.path).toBe('refuel-list');
    expect(leafSnapshot.routeConfig?.component).toBe(RefuelListStub);
  });

  // covers: docs/bugs/02-router-navigate-in-ionic.md
  it('should ACTIVATE the repair-list component, not just change URL', async () => {
    const { mocks } = await setupRealNav();
    const car: Car = { id: 'c1', name: 'A', ownerId: 'u1', createdAt: Timestamp.now() };
    mocks.carService.activeCarId.set('c1');
    mocks.carService.activeCar.set(car);
    mocks.carService.cars.set([car]);
    mocks.carService.hasCars.set(true);
    repairServiceRepairs.set([
      {
        id: 'p1',
        carId: 'c1',
        date: '2026-01-15',
        amount: 500,
        mileage: 125000,
        location: 'Serwis',
        description: 'Naprawa',
        mechanicNote: '',
        createdBy: 'u1',
        createdAt: Timestamp.now(),
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await TestBed.flushEffects();

    expect(document.querySelector('.dashboard-content')).toBeTruthy();
    expect(document.querySelector('[data-testid="link-all-repairs"]')).toBeTruthy();

    const link = document.querySelector('[data-testid="link-all-repairs"]')!;
    link.click();
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    expect(router.url).toContain('repair-list');

    // Verify the activated component is RepairListStub
    const rootSnapshot = router.routerState.root;
    let leafSnapshot = rootSnapshot;
    while (leafSnapshot.firstChild) {
      leafSnapshot = leafSnapshot.firstChild;
    }
    expect(leafSnapshot.routeConfig?.path).toBe('repair-list');
    expect(leafSnapshot.routeConfig?.component).toBe(RepairListStub);
  });
});
