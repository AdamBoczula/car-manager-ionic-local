// spec: docs/specs/refuel/02-refuel-crud.md
// covers: docs/specs/refuel/02-refuel-crud.md#AC-1 (list rendering)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-2 (empty state)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-3 (delete action)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-4 (navigation)
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { Timestamp } from 'firebase/firestore';
import { RefuelListPage } from './refuel-list.page';
import { RefuelService } from '../../core/services/refuel.service';
import type { Refuel } from '../../core/models/refuel.model';
import { signal } from '@angular/core';

const mockRefuel: Refuel = {
  id: 'refuel-1',
  carId: 'default-car',
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

describe('RefuelListPage', () => {
  it('should display empty state when no refuels exist', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-2
    const mockService = createMockRefuelService();

    await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
      ],
    });

    expect(
      screen.getByText('Brak tankowań – dodaj pierwsze!')
    ).toBeInTheDocument();
  });

  it('should display refuel list with formatted data when refuels exist', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-1
    const mockService = createMockRefuelService({
      refuels: signal([mockRefuel, mockRefuel2]),
    });

    await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
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

    const mockService = createMockRefuelService({
      refuels: signal([refuelWithoutExtras]),
    });

    await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
      ],
    });

    expect(screen.getByText('15.01.2026')).toBeInTheDocument();
    expect(screen.queryByText(/ L$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Spalanie:/)).not.toBeInTheDocument();
  });

  it('should call delete when swiping to delete', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-3
    const mockService = createMockRefuelService({
      refuels: signal([mockRefuel]),
    });

    const user = userEvent.setup();

    await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
      ],
    });

    // Trigger the delete via the ion-item-option
    const deleteButton = screen.getByTestId('delete-refuel-button');
    await user.click(deleteButton);

    expect(mockService.delete).toHaveBeenCalledWith('refuel-1', 'default-car');
  });

  it('should have a button to navigate to the add form', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-4
    const mockService = createMockRefuelService();

    await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
      ],
    });

    const addButton = screen.getByTestId('add-refuel-button');
    expect(addButton).toBeInTheDocument();
  });

  it('should call startListening on init and stopListening on destroy', async () => {
    const mockService = createMockRefuelService();

    const { fixture } = await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
      ],
    });

    expect(mockService.startListening).toHaveBeenCalledWith('default-car');

    fixture.destroy();
    expect(mockService.stopListening).toHaveBeenCalled();
  });

  it('should show loading spinner when isLoading is true', async () => {
    const mockService = createMockRefuelService({
      isLoading: signal(true),
    });

    await render(RefuelListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
      ],
    });

    expect(screen.getByText('Ładowanie tankowań...')).toBeInTheDocument();
  });
});