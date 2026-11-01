// spec: docs/specs/refuel/02-refuel-crud.md
// covers: docs/specs/refuel/02-refuel-crud.md#AC-5 (form renders with all fields)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-6 (validation)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-7 (submit calls service and navigates)
// covers: docs/specs/refuel/02-refuel-crud.md#AC-8 (skip toggle reveals reason field)
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideRouter, Routes } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { NavController } from '@ionic/angular';
import { RefuelFormPage } from './refuel-form.page';
import { RefuelService } from '../../core/services/refuel.service';
import { Router } from '@angular/router';
import type { Refuel } from '../../core/models/refuel.model';

function createMockRefuelService(overrides?: Partial<RefuelService>) {
  return {
    add: vi.fn().mockResolvedValue({
      id: 'new-refuel-1',
      carId: 'default-car',
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

function mockNavController() {
  return {
    navigateBack: vi.fn(),
    navigateForward: vi.fn(),
    navigateRoot: vi.fn(),
  };
}

const baseRoutes: Routes = [
  { path: 'refuel-list', component: {} as any },
];

describe('RefuelFormPage', () => {
  it('should render all form fields with Polish labels', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-5
    const mockService = createMockRefuelService();

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
        { provide: NavController, useValue: mockNavController() },
      ],
    });

    expect(screen.getByText('Dodaj tankowanie')).toBeInTheDocument();
    expect(screen.getByLabelText('Data')).toBeInTheDocument();
    expect(screen.getByLabelText('Kwota (PLN)')).toBeInTheDocument();
    expect(screen.getByLabelText('Przebieg (km)')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Ilość litrów (opcjonalnie)')
    ).toBeInTheDocument();
    expect(screen.getByText('Verva?')).toBeInTheDocument();
    expect(screen.getByText('Pomiń wpis')).toBeInTheDocument();
    expect(screen.getByText('Zapisz tankowanie')).toBeInTheDocument();
  });

  it('should keep submit button disabled when form is invalid', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-6
    const mockService = createMockRefuelService();
    const user = userEvent.setup();

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
        { provide: NavController, useValue: mockNavController() },
      ],
    });

    // Click submit with empty form — add() should NOT be called
    await user.click(screen.getByText('Zapisz tankowanie'));

    expect(mockService.add).not.toHaveBeenCalled();
  });

  it('should submit refuel data and navigate on success', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-7
    const mockService = createMockRefuelService();
    const user = userEvent.setup();

    const navigateSpy = vi.fn();
    const mockRouter = { navigate: navigateSpy };

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
        { provide: Router, useValue: mockRouter },
        { provide: NavController, useValue: mockNavController() },
      ],
    });

    await user.type(screen.getByLabelText('Kwota (PLN)'), '250');
    await user.type(screen.getByLabelText('Przebieg (km)'), '125000');
    await user.type(screen.getByLabelText('Ilość litrów (opcjonalnie)'), '40');

    await user.click(screen.getByText('Zapisz tankowanie'));

    expect(mockService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        carId: 'default-car',
        amount: 250,
        mileage: 125000,
        liters: 40,
        isVerva: false,
        isSkipped: false,
      })
    );

    // Navigation happens after add resolves
    await vi.waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith(['/refuel-list']);
    });
  });

  it('should show skippedReason textarea when isSkipped is checked', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-8
    const mockService = createMockRefuelService();
    const user = userEvent.setup();

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
        { provide: NavController, useValue: mockNavController() },
      ],
    });

    // Skipped reason should not be visible initially
    expect(
      screen.queryByLabelText('Powód pominięcia')
    ).not.toBeInTheDocument();

    // Click the skip checkbox
    const skipCheckbox = screen.getByText('Pomiń wpis');
    await user.click(skipCheckbox);

    // Now the reason field should appear
    expect(screen.getByLabelText('Powód pominięcia')).toBeInTheDocument();
  });

  it('should include Verva flag and skip reason when submitted', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-7
    const mockService = createMockRefuelService();
    const user = userEvent.setup();

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
        { provide: NavController, useValue: mockNavController() },
      ],
    });

    // Fill required
    await user.type(screen.getByLabelText('Kwota (PLN)'), '300');
    await user.type(screen.getByLabelText('Przebieg (km)'), '130000');

    // Toggle Verva
    const vervaToggle = screen.getByText('Verva?');
    await user.click(vervaToggle);

    // Check skip
    const skipCheckbox = screen.getByText('Pomiń wpis');
    await user.click(skipCheckbox);

    // Type skip reason
    const reasonInput = screen.getByLabelText('Powód pominięcia');
    await user.type(reasonInput, 'Ktoś inny zatankował');

    await user.click(screen.getByText('Zapisz tankowanie'));

    expect(mockService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        isVerva: true,
        isSkipped: true,
        skippedReason: 'Ktoś inny zatankował',
      })
    );
  });

  it('should show error toast when add fails', async () => {
    // covers: docs/specs/refuel/02-refuel-crud.md#AC-7
    const mockService = createMockRefuelService({
      add: vi.fn().mockRejectedValue(new Error('Firestore offline')),
    });
    const user = userEvent.setup();

    const navigateSpy = vi.fn();

    await render(RefuelFormPage, {
      providers: [
        provideRouter(baseRoutes),
        provideIonicAngular({ mode: 'md' }),
        { provide: RefuelService, useValue: mockService },
        { provide: Router, useValue: { navigate: navigateSpy } },
        { provide: NavController, useValue: mockNavController() },
      ],
    });

    await user.type(screen.getByLabelText('Kwota (PLN)'), '250');
    await user.type(screen.getByLabelText('Przebieg (km)'), '125000');

    await user.click(screen.getByText('Zapisz tankowanie'));

    await vi.waitFor(() => {
      expect(mockService.add).toHaveBeenCalled();
    });

    // Should not navigate on error
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});