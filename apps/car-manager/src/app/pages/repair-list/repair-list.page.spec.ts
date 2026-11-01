// covers: docs/specs/repair/02-repair-crud.md#AC-1, docs/specs/repair/02-repair-crud.md#AC-2
// spec: docs/specs/repair/02-repair-crud.md
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { Timestamp } from 'firebase/firestore';
import { RepairListPage } from './repair-list.page';
import { RepairService } from '../../core/services/repair.service';
import type { Repair } from '../../core/models/repair.model';
import { signal } from '@angular/core';

const mockRepair: Repair = {
  id: 'r1',
  carId: 'default-car',
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

describe('RepairListPage', () => {
  // ── AC-1: Pusty stan ──
  it('powinien wyświetlić pusty stan gdy brak napraw', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-1
    const mockService = createMockRepairService();

    await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockService },
      ],
    });

    expect(
      screen.getByText('Brak napraw – dodaj pierwszą!')
    ).toBeInTheDocument();
  });

  // ── AC-1: Lista napraw ──
  it('powinien wyświetlić listę napraw z formatowanymi danymi', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-1
    const mockService = createMockRepairService({
      repairs: signal([mockRepair, mockRepair2]),
    });

    await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockService },
      ],
    });

    // Dates
    expect(screen.getByText('15.10.2026')).toBeInTheDocument();
    expect(screen.getByText('01.09.2026')).toBeInTheDocument();

    // Amounts
    expect(screen.getByText('500,00 zł')).toBeInTheDocument();
    expect(screen.getByText('1200,00 zł')).toBeInTheDocument();

    // Mileage (formatted with thousands separator based on locale)
    expect(screen.getByText(/65[,.\s]?000 km/)).toBeInTheDocument();
    expect(screen.getByText(/62[,.\s]?000 km/)).toBeInTheDocument();

    // Locations
    expect(screen.getByText('AutoSerwis Kraków')).toBeInTheDocument();
    expect(screen.getByText('ASO Toyota')).toBeInTheDocument();

    // Descriptions (truncated at 50 chars with ellipsis)
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
    const mockService = createMockRepairService({
      repairs: signal([longDescRepair]),
    });

    await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockService },
      ],
    });

    // Should show truncated text with ellipsis
    const expected =
      'Bardzo długi opis naprawy który powinien zostać ob…';
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  // ── AC-2: Usuwanie naprawy ──
  it('powinien wywołać delete() po kliknięciu Usuń', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-2
    const mockService = createMockRepairService({
      repairs: signal([mockRepair]),
    });
    const user = userEvent.setup();

    await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockService },
      ],
    });

    const deleteButton = screen.getByTestId('delete-repair-button');
    await user.click(deleteButton);

    expect(mockService.delete).toHaveBeenCalledWith('r1', 'default-car');
  });

  // ── AC-1: Przycisk + ──
  it('powinien mieć przycisk do nawigacji do formularza dodawania', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-1
    const mockService = createMockRepairService();

    await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockService },
      ],
    });

    const addButton = screen.getByTestId('add-repair-button');
    expect(addButton).toBeInTheDocument();
  });

  // ── OnInit / OnDestroy ──
  it('powinien wywołać startListening przy inicjalizacji i stopListening przy niszczeniu', async () => {
    const mockService = createMockRepairService();

    const { fixture } = await render(RepairListPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: RepairService, useValue: mockService },
      ],
    });

    expect(mockService.startListening).toHaveBeenCalledWith('default-car');

    fixture.destroy();
    expect(mockService.stopListening).toHaveBeenCalled();
  });
});