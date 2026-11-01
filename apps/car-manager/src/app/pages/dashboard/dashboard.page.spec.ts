// spec: docs/specs/dashboard/02-dashboard.md
import { render, screen, waitFor } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { DashboardPage } from './dashboard.page';
import { AuthService } from '../../core/services/auth.service';
import { RefuelService } from '../../core/services/refuel.service';
import { RepairService } from '../../core/services/repair.service';
import { StorageService } from '../../core/services/storage.service';
import { SyncService } from '../../core/services/sync.service';
import type { User } from 'firebase/auth';
import type { Refuel } from '../../core/models/refuel.model';
import type { Repair } from '../../core/models/repair.model';
import { signal } from '@angular/core';
import { Timestamp } from 'firebase/firestore';

const mockUser: Partial<User> = {
  uid: 'test-uid',
  email: 'test@example.com',
};

function createMockAuthService() {
  return {
    currentUser: signal(mockUser as User),
    isLoggedIn: signal(true),
    authReady: signal(true),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockRefuelService(refuels: Refuel[] = []) {
  return {
    refuels: signal(refuels),
    isLoading: signal(false),
    startListening: vi.fn().mockResolvedValue(undefined),
    stopListening: vi.fn(),
  };
}

function createMockRepairService(repairs: Repair[] = []) {
  return {
    repairs: signal(repairs),
    isLoading: signal(false),
    startListening: vi.fn().mockResolvedValue(undefined),
    stopListening: vi.fn(),
  };
}

function createMockStorageService() {
  return {
    init: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockSyncService() {
  return {
    isOnline: signal(true),
    processQueue: vi.fn().mockResolvedValue(undefined),
  };
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // covers: docs/specs/dashboard/02-dashboard.md#AC-1 — shows user email
  it('powinien wyświetlić email użytkownika', async () => {
    await render(DashboardPage, {
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: RefuelService, useValue: createMockRefuelService() },
        { provide: RepairService, useValue: createMockRepairService() },
        { provide: StorageService, useValue: createMockStorageService() },
        { provide: SyncService, useValue: createMockSyncService() },
      ],
    });

    // Wait for async ngOnInit to complete and storageReady to become true
    await screen.findByText('test@example.com');
    expect(screen.getByText('test@example.com')).toBeVisible();
  });

  // covers: docs/specs/dashboard/02-dashboard.md#AC-2 — monthly spending section is visible
  it('powinien wyświetlić sekcję wydatków w tym miesiącu', async () => {
    await render(DashboardPage, {
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: RefuelService, useValue: createMockRefuelService() },
        { provide: RepairService, useValue: createMockRepairService() },
        { provide: StorageService, useValue: createMockStorageService() },
        { provide: SyncService, useValue: createMockSyncService() },
      ],
    });

    // Wait for async init to complete
    await screen.findByText('Wydatki w tym miesiącu');
    expect(screen.getByText('Wydatki w tym miesiącu')).toBeVisible();
    // Should show 0,00 zł for empty data
    expect(screen.getByText('0,00 zł')).toBeVisible();
  });

  // covers: docs/specs/dashboard/02-dashboard.md#AC-3 — FAB button is rendered
  it('powinien wyświetlić przycisk FAB z szybkimi akcjami', async () => {
    await render(DashboardPage, {
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: RefuelService, useValue: createMockRefuelService() },
        { provide: RepairService, useValue: createMockRepairService() },
        { provide: StorageService, useValue: createMockStorageService() },
        { provide: SyncService, useValue: createMockSyncService() },
      ],
    });

    // Wait for async init to complete (FAB is always rendered)
    await screen.findByTestId('fab-main');
    expect(screen.getByTestId('fab-main')).toBeVisible();
    expect(screen.getByTestId('fab-add-refuel')).toBeVisible();
    expect(screen.getByTestId('fab-add-repair')).toBeVisible();
  });

  // covers: docs/specs/dashboard/02-dashboard.md#AC-4 — empty state when no refuels
  it('powinien wyświetlić pusty stan gdy brak tankowań', async () => {
    await render(DashboardPage, {
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: RefuelService, useValue: createMockRefuelService([]) },
        { provide: RepairService, useValue: createMockRepairService([]) },
        { provide: StorageService, useValue: createMockStorageService() },
        { provide: SyncService, useValue: createMockSyncService() },
      ],
    });

    // Wait for async init to complete, then look for empty state
    await screen.findByText('Brak danych o tankowaniach');
    expect(screen.getByText('Brak danych o tankowaniach')).toBeVisible();
  });

  // covers: docs/specs/dashboard/02-dashboard.md#AC-1 — calls startListening on init
  it('powinien wywołać startListening dla refuel i repair przy inicjalizacji', async () => {
    const mockRefuel = createMockRefuelService();
    const mockRepair = createMockRepairService();

    await render(DashboardPage, {
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: RefuelService, useValue: mockRefuel },
        { provide: RepairService, useValue: mockRepair },
        { provide: StorageService, useValue: createMockStorageService() },
        { provide: SyncService, useValue: createMockSyncService() },
      ],
    });

    // Wait for ngOnInit to complete (look for element that appears after init)
    await screen.findByText('Wydatki w tym miesiącu');

    expect(mockRefuel.startListening).toHaveBeenCalledWith('default-car');
    expect(mockRepair.startListening).toHaveBeenCalledWith('default-car');
  });

  // covers: docs/specs/dashboard/02-dashboard.md#AC-1 — shows latest refuel details when data exists
  it('powinien wyświetlić szczegóły ostatniego tankowania', async () => {
    const mockRefuels: Refuel[] = [
      {
        id: 'r1',
        carId: 'default-car',
        date: '2026-10-25',
        amount: 250,
        mileage: 125000,
        liters: 45,
        isVerva: false,
        isSkipped: false,
        consumption: 7.5,
        createdBy: 'test-uid',
        createdAt: Timestamp.now(),
      },
    ];

    await render(DashboardPage, {
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: createMockAuthService() },
        { provide: RefuelService, useValue: createMockRefuelService(mockRefuels) },
        { provide: RepairService, useValue: createMockRepairService() },
        { provide: StorageService, useValue: createMockStorageService() },
        { provide: SyncService, useValue: createMockSyncService() },
      ],
    });

    // Wait for the dashboard content to appear after init
    await screen.findByText('250,00 zł');

    // The formatted amount should appear: 250,00 zł
    expect(screen.getByText('250,00 zł')).toBeVisible();
    // Mileage should appear (en-US locale: 125,000)
    expect(screen.getByText('125,000 km')).toBeVisible();
    // Consumption should appear (en-US locale: 7.50)
    expect(screen.getByText('Spalanie: 7.50 L/100km')).toBeVisible();
  });
});