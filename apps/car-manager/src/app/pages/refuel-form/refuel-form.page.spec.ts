// spec: docs/specs/05-car-management.md
// covers: docs/specs/refuel/02-refuel-crud.md#AC-5 (form renders with all fields)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-6 (validation)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-7 (submit calls service and navigates)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-8 (skip toggle reveals reason field)
// covers: docs/specs/05-car-management.md#AC-13
// bugfix: docs/bugs/02-router-navigate-in-ionic.md
// covers: docs/bugs/05-decimal-input-comma-dot.md
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import type { Routes } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { signal } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { RefuelFormPage } from './refuel-form.page';
import { RefuelService } from '../../core/services/refuel.service';
import { CarService } from '../../core/services/car.service';
import {
  ReceiptOcrService,
  type ReceiptScanOutcome,
} from '../../core/services/receipt-ocr.service';
import { RefuelDraftService } from '../../core/services/refuel-draft.service';
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
      isPremium: false,
      isSkipped: false,
      createdBy: 'user-1',
      createdAt: { seconds: 1767211200, nanoseconds: 0 },
    } as Refuel),
    ...overrides,
  } as unknown as RefuelService;
}

function createMockCarService(overrides?: { activeCarId?: string | null }) {
  return {
    cars: signal<Car[]>(overrides?.activeCarId !== undefined ? [mockCar] : [mockCar]),
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

function mockNavController() {
  return {
    navigateBack: vi.fn().mockResolvedValue(true),
    navigateForward: vi.fn(),
    navigateRoot: vi.fn(),
  };
}

function createMockReceiptOcrService(overrides?: {
  isSupported?: boolean;
  isScanning?: boolean;
  outcome?: ReceiptScanOutcome;
}) {
  return {
    isSupported: signal(overrides?.isSupported ?? true),
    isScanning: signal(overrides?.isScanning ?? false),
    scanReceipt: vi.fn().mockResolvedValue(
      overrides?.outcome ?? {
        status: 'success',
        message: 'Odczytano paragon. Sprawdź dane i wpisz przebieg.',
        result: {
          rawText: 'VERVA ON 40,00 x 6,50 260,00A',
          matchedFields: ['date', 'amount', 'liters', 'isPremium'],
          draft: {
            date: '2026-11-24',
            amount: 260,
            liters: 40,
            isPremium: true,
          },
        },
      },
    ),
  } as unknown as ReceiptOcrService;
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
    expect(screen.getByLabelText('Ilość litrów (opcjonalnie)')).toBeInTheDocument();
    expect(screen.getByLabelText('Paliwo premium?')).toBeInTheDocument();
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
        isPremium: false,
        isSkipped: false,
      }),
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

  it('should include isPremium flag and skip reason when submitted', async () => {
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

    const premiumToggle = screen.getByLabelText('Paliwo premium?');
    await user.click(premiumToggle);

    const skipCheckbox = screen.getByText('Pomiń wpis');
    await user.click(skipCheckbox);

    const reasonInput = screen.getByLabelText('Powód pominięcia');
    await user.type(reasonInput, 'Ktoś inny zatankował');

    await user.click(screen.getByText('Zapisz tankowanie'));

    expect(mockRefuelSvc.add).toHaveBeenCalledWith(
      expect.objectContaining({
        isPremium: true,
        isSkipped: true,
        skippedReason: 'Ktoś inny zatankował',
      }),
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

  // covers: docs/bugs/05-decimal-input-comma-dot.md
  it('should accept comma and dot in decimal fields without clearing value', async () => {
    const mockRefuelSvc = createMockRefuelService();
    const mockCarSvc = createMockCarService({ activeCarId: 'car-abc' });
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

    const amountInput = screen.getByLabelText('Kwota w PLN');
    const mileageInput = screen.getByLabelText('Przebieg w kilometrach');
    const litersInput = screen.getByLabelText('Ilość litrów (opcjonalnie)');

    // Type with comma in amount, dot in liters
    await user.type(amountInput, '123,45');
    await user.type(mileageInput, '125000');
    await user.type(litersInput, '45.20');

    // Values should not be cleared
    expect(amountInput).toHaveValue('123,45');
    expect(litersInput).toHaveValue('45,20');

    await user.click(screen.getByText('Zapisz tankowanie'));

    expect(mockRefuelSvc.add).toHaveBeenCalledWith(
      expect.objectContaining({
        carId: 'car-abc',
        amount: 123.45,
        mileage: 125000,
        liters: 45.2,
      }),
    );
  });

  // covers: docs/specs/refuel/03-receipt-ocr.md#AC-5
  it('should prefill form from RefuelDraftService once on init', async () => {
    const draftSvc = new RefuelDraftService();
    draftSvc.setDraft(
      { date: '2026-11-20', amount: 275.5, liters: 42.1, isPremium: true },
      'Odczytano paragon.',
      'success',
    );

    const { fixture } = await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: createMockRefuelService() },
        { provide: CarService, useValue: createMockCarService() },
        { provide: NavController, useValue: mockNavController() },
        { provide: ReceiptOcrService, useValue: createMockReceiptOcrService() },
        { provide: RefuelDraftService, useValue: draftSvc },
      ],
    });

    expect(screen.getByLabelText('Data tankowania')).toHaveValue('2026-11-20');
    expect(screen.getByLabelText('Kwota w PLN')).toHaveValue('275,50');
    expect(screen.getByLabelText('Ilość litrów (opcjonalnie)')).toHaveValue('42,10');
    expect(fixture.componentInstance.isPremium()).toBe(true);
    expect(draftSvc.consumeDraft()).toBeNull();
  });

  // covers: docs/specs/refuel/03-receipt-ocr.md#AC-4
  it('should scan receipt on form and preserve previously entered mileage', async () => {
    const mockOcrSvc = createMockReceiptOcrService({ isSupported: true });
    const user = userEvent.setup();

    const { fixture } = await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: createMockRefuelService() },
        { provide: CarService, useValue: createMockCarService() },
        { provide: NavController, useValue: mockNavController() },
        { provide: ReceiptOcrService, useValue: mockOcrSvc },
      ],
    });

    const mileageInput = screen.getByLabelText('Przebieg w kilometrach');
    await user.type(mileageInput, '125400');

    await user.click(screen.getByTestId('scan-receipt-button'));

    expect(mockOcrSvc.scanReceipt).toHaveBeenCalled();
    expect(screen.getByLabelText('Data tankowania')).toHaveValue('2026-11-24');
    expect(screen.getByLabelText('Kwota w PLN')).toHaveValue('260,00');
    expect(screen.getByLabelText('Ilość litrów (opcjonalnie)')).toHaveValue('40,00');
    expect(fixture.componentInstance.isPremium()).toBe(true);
    expect(fixture.componentInstance.mileage()).toBe(125400);
    expect(fixture.componentInstance.toastOpen()).toBe(true);
  });

  // covers: docs/specs/refuel/03-receipt-ocr.md#AC-8
  it('should hide scan receipt button when OCR is not supported (web)', async () => {
    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: createMockRefuelService() },
        { provide: CarService, useValue: createMockCarService() },
        { provide: NavController, useValue: mockNavController() },
        {
          provide: ReceiptOcrService,
          useValue: createMockReceiptOcrService({ isSupported: false }),
        },
      ],
    });

    expect(screen.queryByTestId('scan-receipt-button')).not.toBeInTheDocument();
  });

  // covers: docs/specs/refuel/03-receipt-ocr.md#AC-6, AC-7
  it('should handle cancelled and error/empty scan outcomes cleanly', async () => {
    const cancelledOcr = createMockReceiptOcrService({ outcome: { status: 'cancelled' } });
    const user = userEvent.setup();

    const { fixture } = await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: createMockRefuelService() },
        { provide: CarService, useValue: createMockCarService() },
        { provide: NavController, useValue: mockNavController() },
        { provide: ReceiptOcrService, useValue: cancelledOcr },
      ],
    });

    await user.click(screen.getByTestId('scan-receipt-button'));
    expect(fixture.componentInstance.toastOpen()).toBe(false);

    vi.mocked(cancelledOcr.scanReceipt).mockResolvedValueOnce({
      status: 'error',
      message: 'Brak uprawnień do aparatu.',
    });
    await user.click(screen.getByTestId('scan-receipt-button'));
    expect(fixture.componentInstance.toastOpen()).toBe(true);
    expect(fixture.componentInstance.toastColor()).toBe('danger');
    expect(fixture.componentInstance.toastMessage()).toBe('Brak uprawnień do aparatu.');
  });
});
