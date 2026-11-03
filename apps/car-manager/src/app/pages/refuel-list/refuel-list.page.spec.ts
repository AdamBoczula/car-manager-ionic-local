// spec: docs/specs/05-car-management.md
// covers: docs/specs/refuel/02-refuel-crud.md#AC-1 (list rendering)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-2 (empty state)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-3 (delete action)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-4 (navigation)
// covers: docs/specs/05-car-management.md#AC-13
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { Timestamp } from 'firebase/firestore';
import { signal } from '@angular/core';
import { RefuelListPage } from './refuel-list.page';
import { RefuelService } from '../../core/services/refuel.service';
import { CarService } from '../../core/services/car.service';
import type { Refuel } from '../../core/models/refuel.model';
import type { Car } from '../../core/models/car.model';

vi.mock('../../core/firebase', () => ({
  auth: {} as unknown,
  db: {} as unknown,
}));

const mockRefuel: Refuel = {
  id: 'refuel-1',
  carId: 'car-abc',
  date: '2026-01-15',
  amount: 250,
  mileage: 125000,
  liters: 40,
  isVerva: false,
  isSkipped: false,
  consumption: 6.25,
  createdBy: 'user-1',
  createdAt: { seconds: 1767211200, nanoseconds: 0 } as Timestamp,
};

const mockRefuel2: Refuel = {
  ...mockRefuel,
  id: 'refuel-2',
  date: '2026-01-20',
  amount: 280,
  mileage: 125500,
  liters: 42,
  consumption: 8.4,
  isVerva: true,
};

const mockCar: Car = {
  id: 'car-abc',
  name: 'Toyota Corolla',
  ownerId: 'user-1',
  createdAt: Timestamp.now(),
};

function createMockRefuelService(overrides?: Partial<RefuelService>) {
  return {
    refuels: signal<Refuel[]>([]),
    isLoading: signal(false),
    startListening: vi.fn().mockResolvedValue(undefined),
    stopListening: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as RefuelService;
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

describe('RefuelListPage', () => {
  it('should display empty state when no refuels exist', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-2
    const mockRefuelSvc = createMockRefuelService();
    const mockCarSvc = createMockCarService();

    await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    expect(
      screen.getByText('Brak tankowań – dodaj pierwsze!')
    ).toBeInTheDocument();
  });

  it('should display refuel list with formatted data when refuels exist', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-1
    const mockRefuelSvc = createMockRefuelService({
      refuels: signal([mockRefuel, mockRefuel2]),
    });
    const mockCarSvc = createMockCarService();

    await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    expect(screen.getByText('15.01.2026')).toBeInTheDocument();
    expect(screen.getByText('250,00 zł')).toBeInTheDocument();
    expect(screen.getByText('125000 km')).toBeInTheDocument();
    expect(screen.getByText('40 L')).toBeInTheDocument();
    expect(screen.getByText('Spalanie: 6.25 L/100km')).toBeInTheDocument();
    expect(screen.getByText('Verva')).toBeInTheDocument();
    expect(screen.getByText('20.01.2026')).toBeInTheDocument();
  });

  it('should not display liters or consumption when they are missing', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-1
    const refuelWithoutExtras: Refuel = {
      ...mockRefuel,
      liters: undefined,
      consumption: undefined,
    };

    const mockRefuelSvc = createMockRefuelService({
      refuels: signal([refuelWithoutExtras]),
    });
    const mockCarSvc = createMockCarService();

    await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    expect(screen.getByText('15.01.2026')).toBeInTheDocument();
    expect(screen.queryByText(/ L$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Spalanie:/)).not.toBeInTheDocument();
  });

  // covers: docs/specs/05-car-management.md#AC-13
  it('should call delete with carId from activeCarId', async () => {
    const mockRefuelSvc = createMockRefuelService({
      refuels: signal([mockRefuel]),
    });
    const mockCarSvc = createMockCarService({ activeCarId: 'car-abc' });

    const user = userEvent.setup();

    await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    const deleteButton = screen.getByTestId('delete-refuel-button');
    await user.click(deleteButton);

    expect(mockRefuelSvc.delete).toHaveBeenCalledWith('refuel-1', 'car-abc');
  });

  it('should have a button to navigate to the add form', async () => {
    const mockRefuelSvc = createMockRefuelService();
    const mockCarSvc = createMockCarService();

    await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    const addButton = screen.getByTestId('add-refuel-button');
    expect(addButton).toBeInTheDocument();
  });

  it('should call startListening with activeCarId on init', async () => {
    const mockRefuelSvc = createMockRefuelService();
    const mockCarSvc = createMockCarService({ activeCarId: 'car-abc' });

    const { fixture } = await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    expect(mockRefuelSvc.startListening).toHaveBeenCalledWith('car-abc');

    fixture.destroy();
    expect(mockRefuelSvc.stopListening).toHaveBeenCalled();
  });

  it('should show loading spinner when isLoading is true', async () => {
    const mockRefuelSvc = createMockRefuelService({
      isLoading: signal(true),
    });
    const mockCarSvc = createMockCarService();

    await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    expect(screen.getByText('Ładowanie tankowań...')).toBeInTheDocument();
  });

  it('should render car-switcher in the header', async () => {
    const mockRefuelSvc = createMockRefuelService();
    const mockCarSvc = createMockCarService();

    const { container } = await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
      ],
    });

    expect(container.querySelector('app-car-switcher')).toBeTruthy();
  });
});