// spec: docs/specs/05-car-management.md
// covers: docs/specs/repair/02-repair-crud.md#AC-1, docs/specs/repair/02-repair-crud.md#AC-2
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { Timestamp } from 'firebase/firestore';
import { signal } from '@angular/core';
import { RepairListPage } from './repair-list.page';
import { RepairService } from '../../core/services/repair.service';
import { CarService } from '../../core/services/car.service';
import type { Repair } from '../../core/models/repair.model';
import type { Car } from '../../core/models/car.model';

vi.mock('../../core/firebase', () => ({
  auth: {} as unknown,
  db: {} as unknown,
}));

const mockRepair: Repair = {
  id: 'r1',
  carId: 'car-abc',
  date: '2026-10-15',
  amount: 500,
  mileage: 65000,
  location: 'AutoSerwis Kraków',
  description: 'Wymiana klocków i tarcz hamulcowych — przód + tył',
  mechanicNote: 'Zalecana wymiana płynu hamulcowego',
  createdBy: 'u1',
  createdAt: { seconds: 1, nanoseconds: 0 } as Timestamp,
};

const mockRepair2: Repair = {
  ...mockRepair,
  id: 'r2',
  date: '2026-09-01',
  amount: 1200,
  mileage: 62000,
  location: 'ASO Toyota',
  description: 'Wymiana rozrządu kompletny zestaw + pompa wody',
  mechanicNote: '',
};

const mockCar: Car = {
  id: 'car-abc',
  name: 'Toyota Corolla',
  ownerId: 'u1',
  createdAt: Timestamp.now(),
};

function createMockRepairService(overrides?: Partial<RepairService>) {
  return {
    repairs: signal<Repair[]>([]),
    isLoading: signal(false),
    startListening: vi.fn().mockResolvedValue(undefined),
    stopListening: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as RepairService;
}

function createMockCarService(overrides?: {
  activeCarId?: string | null;
  cars?: Car[];
  activeCar?: Car | null;
}) {
  return {
    cars: signal<Car[]>(overrides?.cars ?? [mockCar]),
    activeCar: signal<Car | null>(overrides?.activeCar ?? mockCar),
    activeCarId: signal<string | null>(
      overrides?.activeCarId !== undefined ? overrides.activeCarId : 'car-abc'
    ),
    hasCars: signal(true),
    isLoading: signal(false),
    addCar: vi.fn().mockResolvedValue(mockCar),
    setActiveCar: vi.fn().mockResolvedValue(undefined),
  };
}

describe('RepairListPage', () => {
  // ── AC-1: Pusty stan ──
  it('powinien wyświetlić pusty stan gdy brak napraw', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-1
    const mockRepairSvc = createMockRepairService();
    const mockCarSvc = createMockCarService();

    await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    expect(
      screen.getByText('Brak napraw – dodaj pierwszą!')
    ).toBeInTheDocument();
  });

  // ── AC-1: Lista napraw ──
  it('powinien wyświetlić listę napraw z formatowanymi danymi', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-1
    const mockRepairSvc = createMockRepairService({
      repairs: signal([mockRepair, mockRepair2]),
    });
    const mockCarSvc = createMockCarService();

    await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    expect(screen.getByText('15.10.2026')).toBeInTheDocument();
    expect(screen.getByText('01.09.2026')).toBeInTheDocument();
    expect(screen.getByText('500,00 zł')).toBeInTheDocument();
    expect(screen.getByText('1200,00 zł')).toBeInTheDocument();
    expect(screen.getByText(/65[,.\s]?000 km/)).toBeInTheDocument();
    expect(screen.getByText(/62[,.\s]?000 km/)).toBeInTheDocument();
    expect(screen.getByText('AutoSerwis Kraków')).toBeInTheDocument();
    expect(screen.getByText('ASO Toyota')).toBeInTheDocument();
    expect(
      screen.getByText('Wymiana klocków i tarcz hamulcowych — przód + tył')
    ).toBeInTheDocument();
  });

  // ── AC-1: Truncation ──
  it('powinien obciąć długi opis do 50 znaków z wielokropkiem', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-1
    const longDescRepair: Repair = {
      ...mockRepair,
      description:
        'Bardzo długi opis naprawy który powinien zostać obcięty do pięćdziesięciu znaków',
    };
    const mockRepairSvc = createMockRepairService({
      repairs: signal([longDescRepair]),
    });
    const mockCarSvc = createMockCarService();

    await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    const expected =
      'Bardzo długi opis naprawy który powinien zostać ob…';
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  // covers: docs/specs/05-car-management.md#AC-13
  it('powinien wywołać delete() z carId z CarService', async () => {
    const mockRepairSvc = createMockRepairService({
      repairs: signal([mockRepair]),
    });
    const mockCarSvc = createMockCarService({ activeCarId: 'car-abc' });
    const user = userEvent.setup();

    await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    const deleteButton = screen.getByTestId('delete-repair-button');
    await user.click(deleteButton);

    expect(mockRepairSvc.delete).toHaveBeenCalledWith('r1', 'car-abc');
  });

  // ── AC-1: Przycisk + ──
  it('powinien mieć przycisk do nawigacji do formularza dodawania', async () => {
    const mockRepairSvc = createMockRepairService();
    const mockCarSvc = createMockCarService();

    await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    const addButton = screen.getByTestId('add-repair-button');
    expect(addButton).toBeInTheDocument();
  });

  // ── OnInit / OnDestroy ──
  it('powinien wywołać startListening z activeCarId przy inicjalizacji', async () => {
    const mockRepairSvc = createMockRepairService();
    const mockCarSvc = createMockCarService({ activeCarId: 'car-abc' });

    const { fixture } = await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    expect(mockRepairSvc.startListening).toHaveBeenCalledWith('car-abc');

    fixture.destroy();
    expect(mockRepairSvc.stopListening).toHaveBeenCalled();
  });

  it('powinien wyrenderować car-switcher w headerze', async () => {
    const mockRepairSvc = createMockRepairService();
    const mockCarSvc = createMockCarService();

    const { container } = await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    expect(container.querySelector('app-car-switcher')).toBeTruthy();
  });
});