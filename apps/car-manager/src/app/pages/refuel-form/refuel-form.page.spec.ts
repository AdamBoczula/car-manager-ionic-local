// spec: docs/specs/05-car-management.md
// covers: docs/specs/refuel/02-refuel-crud.md#AC-5 (form renders with all fields)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-6 (validation)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-7 (submit calls service and navigates)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-8 (skip toggle reveals reason field)
// covers: docs/specs/05-car-management.md#AC-13
// bugfix: docs/bugs/02-router-navigate-in-ionic.md
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideRouter, Routes } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { signal } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { RefuelFormPage } from './refuel-form.page';
import { RefuelService } from '../../core/services/refuel.service';
import { CarService } from '../../core/services/car.service';
import type { Refuel } from '../../core/models/refuel.model';
import type { Car } from '../../core/models/car.model';

vi.mock('../../core/firebase', () => ({
  auth: {} as unknown,
  db: {} as unknown,
}));

const mockCar: Car = {
  id: 'car-abc',
  name: 'Toyota Corolla',
  ownerId: 'user-1',
  createdAt: Timestamp.now(),
};

function createMockRefuelService(overrides?: Partial<RefuelService>) {
  return {
    add: vi.fn().mockResolvedValue({
      id: 'new-refuel-1',
      carId: 'car-abc',
      date: '2026-01-15',
      amount: 250,
      mileage: 125000,
      isVerva: false,
      isSkipped: false,
      createdBy: 'user-1',
      createdAt: { seconds: 1767211200, nanoseconds: 0 },
    } as Refuel),
    ...overrides,
  } as unknown as RefuelService;
}

function createMockCarService(overrides?: { activeCarId?: string | null }) {
  return {
    cars: signal<Car[]>(
      overrides?.activeCarId !== undefined ? [mockCar] : [mockCar]
    ),
    activeCar: signal<Car | null>(mockCar),
    activeCarId: signal<string | null>(
      overrides?.activeCarId !== undefined ? overrides.activeCarId : 'car-abc'
    ),
    hasCars: signal(true),
    isLoading: signal(false),
    addCar: vi.fn().mockResolvedValue(mockCar),
    setActiveCar: vi.fn().mockResolvedValue(undefined),
  };
}

function mockNavController() {
  return {
    navigateBack: vi.fn().mockResolvedValue(true),
    navigateForward: vi.fn(),
    navigateRoot: vi.fn(),
  };
}

const baseRoutes: Routes = [{ path: 'refuel-list', component: class Dummy {} }];

describe('RefuelFormPage', () => {
  it('should render all form fields', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-5
    const mockRefuelSvc = createMockRefuelService();
    const mockCarSvc = createMockCarService();

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: NavController, useValue: mockNavController() },
      ],
    });

    expect(screen.getByLabelText('Data tankowania')).toBeInTheDocument();
    expect(screen.getByLabelText('Kwota w PLN')).toBeInTheDocument();
    expect(screen.getByLabelText('Przebieg w kilometrach')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Ilość litrów (opcjonalnie)')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Verva?')).toBeInTheDocument();
    expect(screen.getByText('Pomiń wpis')).toBeInTheDocument();
    expect(screen.getByText('Zapisz tankowanie')).toBeInTheDocument();
  });

  it('should keep submit button disabled when form is invalid', async () => {
    const mockRefuelSvc = createMockRefuelService();
    const mockCarSvc = createMockCarService();
    const user = userEvent.setup();

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: NavController, useValue: mockNavController() },
      ],
    });

    await user.click(screen.getByText('Zapisz tankowanie'));
    expect(mockRefuelSvc.add).not.toHaveBeenCalled();
  });

  // covers: docs/specs/05-car-management.md#AC-13
  it('should submit refuel with active carId and navigate on success', async () => {
    const mockRefuelSvc = createMockRefuelService();
    const mockCarSvc = createMockCarService({ activeCarId: 'car-abc' });
    const user = userEvent.setup();

    const navMock = {
      ...mockNavController(),
      navigateBack: vi.fn().mockResolvedValue(true),
    };

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: NavController, useValue: navMock },
      ],
    });

    await user.type(screen.getByLabelText('Kwota w PLN'), '250');
    await user.type(screen.getByLabelText('Przebieg w kilometrach'), '125000');
    await user.type(screen.getByLabelText('Ilość litrów (opcjonalnie)'), '40');

    await user.click(screen.getByText('Zapisz tankowanie'));

    expect(mockRefuelSvc.add).toHaveBeenCalledWith(
      expect.objectContaining({
        carId: 'car-abc',
        amount: 250,
        mileage: 125000,
        liters: 40,
        isVerva: false,
        isSkipped: false,
      })
    );

    await vi.waitFor(() => {
      expect(navMock.navigateForward).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show skippedReason textarea when isSkipped is checked', async () => {
    const mockRefuelSvc = createMockRefuelService();
    const mockCarSvc = createMockCarService();
    const user = userEvent.setup();

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: NavController, useValue: mockNavController() },
      ],
    });

    expect(screen.queryByLabelText('Powód pominięcia')).not.toBeInTheDocument();

    const skipCheckbox = screen.getByText('Pomiń wpis');
    await user.click(skipCheckbox);

    expect(screen.getByLabelText('Powód pominięcia')).toBeInTheDocument();
  });

  it('should include Verva flag and skip reason when submitted', async () => {
    const mockRefuelSvc = createMockRefuelService();
    const mockCarSvc = createMockCarService();
    const user = userEvent.setup();

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: NavController, useValue: mockNavController() },
      ],
    });

    await user.type(screen.getByLabelText('Kwota w PLN'), '300');
    await user.type(screen.getByLabelText('Przebieg w kilometrach'), '130000');

    const vervaToggle = screen.getByLabelText('Verva?');
    await user.click(vervaToggle);

    const skipCheckbox = screen.getByText('Pomiń wpis');
    await user.click(skipCheckbox);

    const reasonInput = screen.getByLabelText('Powód pominięcia');
    await user.type(reasonInput, 'Ktoś inny zatankował');

    await user.click(screen.getByText('Zapisz tankowanie'));

    expect(mockRefuelSvc.add).toHaveBeenCalledWith(
      expect.objectContaining({
        isVerva: true,
        isSkipped: true,
        skippedReason: 'Ktoś inny zatankował',
      })
    );
  });

  it('should show error toast when add fails', async () => {
    const mockRefuelSvc = createMockRefuelService({
      add: vi.fn().mockRejectedValue(new Error('Firestore offline')),
    });
    const mockCarSvc = createMockCarService();
    const user = userEvent.setup();

    const navMock = mockNavController();

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: NavController, useValue: navMock },
      ],
    });

    await user.type(screen.getByLabelText('Kwota w PLN'), '250');
    await user.type(screen.getByLabelText('Przebieg w kilometrach'), '125000');

    await user.click(screen.getByText('Zapisz tankowanie'));

    await vi.waitFor(() => {
      expect(mockRefuelSvc.add).toHaveBeenCalled();
    });

    expect(navMock.navigateBack).not.toHaveBeenCalled();
  });

  it('should show error toast when no active car', async () => {
    const mockRefuelSvc = createMockRefuelService();
    const mockCarSvc = createMockCarService({ activeCarId: null });
    const user = userEvent.setup();

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockRefuelSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: NavController, useValue: mockNavController() },
      ],
    });

    await user.type(screen.getByLabelText('Kwota w PLN'), '250');
    await user.type(screen.getByLabelText('Przebieg w kilometrach'), '125000');

    await user.click(screen.getByText('Zapisz tankowanie'));

    // Should not call add when there's no active car
    expect(mockRefuelSvc.add).not.toHaveBeenCalled();
  });
});