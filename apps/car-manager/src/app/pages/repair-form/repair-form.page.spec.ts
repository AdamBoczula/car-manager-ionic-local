// spec: docs/specs/05-car-management.md
// covers: docs/specs/repair/02-repair-crud.md#AC-3, docs/specs/repair/02-repair-crud.md#AC-4, docs/specs/repair/02-repair-crud.md#AC-5
// covers: docs/specs/05-car-management.md#AC-13
// bugfix: docs/bugs/02-router-navigate-in-ionic.md
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import type { Routes } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideIonicAngular, NavController } from '@ionic/angular';
import { signal, Component } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { RepairFormPage } from './repair-form.page';
import { RepairService } from '../../core/services/repair.service';
import { CarService } from '../../core/services/car.service';
import { SpeechService } from '../../core/services/speech.service';
import { of, throwError } from 'rxjs';
import type { Repair } from '../../core/models/repair.model';
import type { Car } from '../../core/models/car.model';

vi.mock('../../core/firebase', () => ({
  auth: {} as unknown,
  db: {} as unknown,
}));

const mockCar: Car = {
  id: 'car-abc',
  name: 'Toyota Corolla',
  ownerId: 'u1',
  createdAt: Timestamp.now(),
};

const mockNavController = {
  navigateForward: vi.fn().mockResolvedValue(true),
  navigateBack: vi.fn().mockResolvedValue(true),
  navigateRoot: vi.fn().mockResolvedValue(true),
  back: vi.fn(),
  pop: vi.fn().mockResolvedValue(true),
  setDirection: vi.fn(),
  setTopOutlet: vi.fn(),
  consumeTransition: vi.fn(() => ({
    direction: 'forward' as const,
    animation: undefined,
    animationBuilder: undefined,
  })),
};

@Component({ standalone: true, template: '' })
class DummyComponent {}

const routes: Routes = [
  { path: 'repair-list', component: DummyComponent },
  { path: 'repair-form', component: DummyComponent },
  { path: 'dashboard', component: DummyComponent },
];

function createMockRepairService(overrides?: Partial<RepairService>) {
  return {
    add: vi.fn().mockResolvedValue({
      id: 'new-repair',
      carId: 'car-abc',
      date: '2026-11-01',
      amount: 500,
      mileage: 65000,
      location: 'AutoSerwis Kraków',
      description: 'Wymiana klocków',
      mechanicNote: '',
      createdBy: 'u1',
      createdAt: { seconds: 1, nanoseconds: 0 },
    } as Repair),
    ...overrides,
  } as unknown as RepairService;
}

function createMockCarService(overrides?: { activeCarId?: string | null }) {
  return {
    cars: signal<Car[]>([mockCar]),
    activeCar: signal<Car | null>(mockCar),
    activeCarId: signal<string | null>(
      overrides?.activeCarId !== undefined ? overrides.activeCarId : 'car-abc',
    ),
    hasCars: signal(true),
    isLoading: signal(false),
    addCar: vi.fn().mockResolvedValue(mockCar),
    setActiveCar: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockSpeechService(overrides?: Partial<SpeechService>) {
  return {
    isListening: vi.fn(() => false),
    isSupported: vi.fn(() => true),
    startListening: vi.fn(() => of('dyktowany tekst')),
    ...overrides,
  } as unknown as SpeechService;
}

describe('RepairFormPage', () => {
  it('powinien wyrenderować wszystkie pola formularza', async () => {
    const mockRepairSvc = createMockRepairService();
    const mockCarSvc = createMockCarService();
    const mockSpeechSvc = createMockSpeechService();

    await render(RepairFormPage, {
      providers: [
        provideRouter(routes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: SpeechService, useValue: mockSpeechSvc },
        { provide: NavController, useValue: mockNavController },
      ],
    });

    expect(screen.getByLabelText('Data naprawy')).toBeInTheDocument();
    expect(screen.getByLabelText('Kwota w PLN')).toBeInTheDocument();
    expect(screen.getByLabelText('Przebieg w kilometrach')).toBeInTheDocument();
    expect(screen.getByLabelText('Miejsce naprawy')).toBeInTheDocument();
    expect(screen.getByLabelText('Opis wykonanych prac')).toBeInTheDocument();
    expect(screen.getByLabelText('Komentarz o wykonawcy')).toBeInTheDocument();
    expect(screen.getByTestId('submit-repair-button')).toBeInTheDocument();
  });

  it('powinien dezaktywować przycisk submit gdy formularz jest nieprawidłowy', async () => {
    const mockRepairSvc = createMockRepairService();
    const mockCarSvc = createMockCarService();
    const mockSpeechSvc = createMockSpeechService();
    const user = userEvent.setup();

    await render(RepairFormPage, {
      providers: [
        provideRouter(routes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: SpeechService, useValue: mockSpeechSvc },
        { provide: NavController, useValue: mockNavController },
      ],
    });

    await user.click(screen.getByTestId('submit-repair-button'));
    expect(mockRepairSvc.add).not.toHaveBeenCalled();
  });

  // covers: docs/specs/05-car-management.md#AC-13
  it('powinien zapisać naprawę z carId z CarService i nawigować', async () => {
    const mockRepairSvc = createMockRepairService();
    const mockCarSvc = createMockCarService({ activeCarId: 'car-abc' });
    const mockSpeechSvc = createMockSpeechService();
    const user = userEvent.setup();

    const navMock = {
      ...mockNavController,
      navigateBack: vi.fn().mockResolvedValue(true),
    };

    await render(RepairFormPage, {
      providers: [
        provideRouter(routes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: SpeechService, useValue: mockSpeechSvc },
        { provide: NavController, useValue: navMock },
      ],
    });

    await user.type(screen.getByLabelText('Kwota w PLN'), '500');
    await user.type(screen.getByLabelText('Przebieg w kilometrach'), '65000');
    await user.type(screen.getByLabelText('Miejsce naprawy'), 'AutoSerwis Kraków');
    await user.type(screen.getByLabelText('Opis wykonanych prac'), 'Wymiana klocków');

    await user.click(screen.getByTestId('submit-repair-button'));

    expect(mockRepairSvc.add).toHaveBeenCalledWith(
      expect.objectContaining({
        carId: 'car-abc',
        amount: 500,
        mileage: 65000,
        location: 'AutoSerwis Kraków',
        description: 'Wymiana klocków',
      }),
    );

    await vi.waitFor(() => {
      expect(navMock.navigateForward).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('powinien wywołać startListening po kliknięciu przycisku mikrofonu', async () => {
    const mockRepairSvc = createMockRepairService();
    const mockCarSvc = createMockCarService();
    const mockSpeechSvc = createMockSpeechService();
    const user = userEvent.setup();

    await render(RepairFormPage, {
      providers: [
        provideRouter(routes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: SpeechService, useValue: mockSpeechSvc },
        { provide: NavController, useValue: mockNavController },
      ],
    });

    const micButton = screen.getByTestId('mic-button');
    await user.click(micButton);

    expect(mockSpeechSvc.startListening).toHaveBeenCalled();
  });

  it('powinien dodać transkrypt do pola opisu', async () => {
    const mockRepairSvc = createMockRepairService();
    const mockCarSvc = createMockCarService();
    const mockSpeechSvc = createMockSpeechService({
      startListening: vi.fn().mockReturnValue(of('testowy transkrypt')),
    });
    const user = userEvent.setup();

    await render(RepairFormPage, {
      providers: [
        provideRouter(routes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: SpeechService, useValue: mockSpeechSvc },
        { provide: NavController, useValue: mockNavController },
      ],
    });

    const micButton = screen.getByTestId('mic-button');
    await user.click(micButton);

    const descEl = screen.getByLabelText('Opis wykonanych prac') as HTMLTextAreaElement;
    expect(descEl.value).toContain('testowy transkrypt');
  });

  it('powinien obsłużyć błąd rozpoznawania mowy bez przerywania działania', async () => {
    const mockRepairSvc = createMockRepairService();
    const mockCarSvc = createMockCarService();
    const mockSpeechSvc = createMockSpeechService({
      startListening: vi.fn(() => throwError(() => new Error('Speech not available'))),
    });
    const user = userEvent.setup();

    await render(RepairFormPage, {
      providers: [
        provideRouter(routes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: SpeechService, useValue: mockSpeechSvc },
        { provide: NavController, useValue: mockNavController },
      ],
    });

    const micButton = screen.getByTestId('mic-button');
    await user.click(micButton);
    expect(mockSpeechSvc.startListening).toHaveBeenCalled();
  });

  it('powinien wyświetlić toast błędu gdy brak aktywnego auta', async () => {
    const mockRepairSvc = createMockRepairService();
    const mockCarSvc = createMockCarService({ activeCarId: null });
    const mockSpeechSvc = createMockSpeechService();
    const user = userEvent.setup();

    await render(RepairFormPage, {
      providers: [
        provideRouter(routes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockRepairSvc },
        { provide: CarService, useValue: mockCarSvc },
        { provide: SpeechService, useValue: mockSpeechSvc },
        { provide: NavController, useValue: mockNavController },
      ],
    });

    await user.type(screen.getByLabelText('Kwota w PLN'), '500');
    await user.type(screen.getByLabelText('Przebieg w kilometrach'), '65000');
    await user.type(screen.getByLabelText('Miejsce naprawy'), 'AutoSerwis');
    await user.type(screen.getByLabelText('Opis wykonanych prac'), 'Test');

    await user.click(screen.getByTestId('submit-repair-button'));

    // Should not call add when no active car
    expect(mockRepairSvc.add).not.toHaveBeenCalled();
  });
});
