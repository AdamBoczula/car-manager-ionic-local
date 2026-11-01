// covers: docs/specs/repair/02-repair-crud.md#AC-3, docs/specs/repair/02-repair-crud.md#AC-4, docs/specs/repair/02-repair-crud.md#AC-5
// spec: docs/specs/repair/02-repair-crud.md
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideRouter, Router } from '@angular/router';
import { provideIonicAngular, NavController } from '@ionic/angular';
import { RepairFormPage } from './repair-form.page';
import { RepairService } from '../../core/services/repair.service';
import { SpeechService } from '../../core/services/speech.service';
import { of, throwError } from 'rxjs';
import type { Repair } from '../../core/models/repair.model';

/** Mock NavController to avoid the `subscribe` error from IonBackButton. */
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

function createMockRepairService(overrides?: Partial<RepairService>) {
  return {
    add: vi.fn().mockResolvedValue({
      id: 'new-repair',
      carId: 'default-car',
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

function createMockSpeechService(overrides?: Partial<SpeechService>) {
  return {
    isListening: vi.fn(() => false),
    isSupported: vi.fn(() => true),
    startListening: vi.fn(() => of('dyktowany tekst')),
    stopListening: vi.fn(),
    ...overrides,
  } as unknown as SpeechService;
}

describe('RepairFormPage', () => {
  // ── AC-3: Formularz — pola ──
  it('powinien wyświetlić wszystkie pola formularza z polskimi etykietami', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-3
    const mockService = createMockRepairService();
    const mockSpeech = createMockSpeechService();

    await render(RepairFormPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: NavController, useValue: mockNavController },
        { provide: RepairService, useValue: mockService },
        { provide: SpeechService, useValue: mockSpeech },
      ],
    });

    expect(screen.getByText('Dodaj naprawę')).toBeInTheDocument();
    expect(screen.getByLabelText('Data naprawy')).toBeInTheDocument();
    expect(screen.getByLabelText('Kwota w PLN')).toBeInTheDocument();
    expect(screen.getByLabelText('Przebieg w kilometrach')).toBeInTheDocument();
    expect(screen.getByLabelText('Miejsce naprawy')).toBeInTheDocument();
    expect(screen.getByLabelText('Opis wykonanych prac')).toBeInTheDocument();
    expect(screen.getByLabelText('Komentarz o wykonawcy')).toBeInTheDocument();
    expect(screen.getByText('Zapisz naprawę')).toBeInTheDocument();
  });

  // ── AC-4: Walidacja — pusta forma niedozwolona ──
  it('powinien mieć nieaktywny przycisk Zapisz gdy forma jest pusta', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-4
    const mockService = createMockRepairService();
    const mockSpeech = createMockSpeechService();

    await render(RepairFormPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: NavController, useValue: mockNavController },
        { provide: RepairService, useValue: mockService },
        { provide: SpeechService, useValue: mockSpeech },
      ],
    });

    const submitButton = screen.getByTestId('submit-repair-button');
    expect((submitButton as HTMLIonButtonElement).disabled).toBe(true);
  });

  // ── AC-3: Submit — zapis naprawy ──
  it('powinien wywołać repairService.add() i nawigować po zapisie', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-3
    const mockService = createMockRepairService();
    const mockSpeech = createMockSpeechService();
    const navigateSpy = vi.fn();
    const user = userEvent.setup();

    await render(RepairFormPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: NavController, useValue: mockNavController },
        { provide: RepairService, useValue: mockService },
        { provide: SpeechService, useValue: mockSpeech },
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    });

    // Wypełnij wymagane pola (submit+nav test)
    await user.type(screen.getByLabelText('Kwota w PLN'), '500');
    await user.type(screen.getByLabelText('Przebieg w kilometrach'), '65000');
    await user.type(
      screen.getByLabelText('Miejsce naprawy'),
      'AutoSerwis Kraków'
    );
    await user.type(
      screen.getByLabelText('Opis wykonanych prac'),
      'Wymiana klocków hamulcowych'
    );

    await user.click(screen.getByText('Zapisz naprawę'));

    expect(mockService.add).toHaveBeenCalledWith(
      expect.objectContaining({
        carId: 'default-car',
        amount: 500,
        mileage: 65000,
        location: 'AutoSerwis Kraków',
        description: 'Wymiana klocków hamulcowych',
      })
    );

    await vi.waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith(['/repair-list']);
    });
  });

  // ── AC-3: Submit — nie wywołuje add gdy forma niepoprawna ──
  it('nie powinien wywołać add gdy forma jest niepoprawna', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-3
    const mockService = createMockRepairService();
    const mockSpeech = createMockSpeechService();
    const user = userEvent.setup();

    await render(RepairFormPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: NavController, useValue: mockNavController },
        { provide: RepairService, useValue: mockService },
        { provide: SpeechService, useValue: mockSpeech },
      ],
    });

    await user.click(screen.getByText('Zapisz naprawę'));

    expect(mockService.add).not.toHaveBeenCalled();
  });

  // ── AC-5: Speech-to-text ──
  it('powinien wyświetlić przycisk mikrofonu', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-5
    const mockService = createMockRepairService();
    const mockSpeech = createMockSpeechService();

    await render(RepairFormPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: NavController, useValue: mockNavController },
        { provide: RepairService, useValue: mockService },
        { provide: SpeechService, useValue: mockSpeech },
      ],
    });

    expect(screen.getByTestId('mic-button')).toBeInTheDocument();
  });

  it('powinien wywołać speechService.startListening() po kliknięciu mikrofonu', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-5
    const mockService = createMockRepairService();
    const mockSpeech = createMockSpeechService();
    const user = userEvent.setup();

    await render(RepairFormPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: NavController, useValue: mockNavController },
        { provide: RepairService, useValue: mockService },
        { provide: SpeechService, useValue: mockSpeech },
      ],
    });

    const micButton = screen.getByTestId('mic-button');
    await user.click(micButton);

    expect(mockSpeech.startListening).toHaveBeenCalled();
  });

  // ── AC-4: Błędy walidacji ──
  it('powinien aktywować przycisk po wypełnieniu wymaganych pól', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-4
    const mockService = createMockRepairService();
    const mockSpeech = createMockSpeechService();
    const user = userEvent.setup();

    await render(RepairFormPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: NavController, useValue: mockNavController },
        { provide: RepairService, useValue: mockService },
        { provide: SpeechService, useValue: mockSpeech },
      ],
    });

    await user.type(screen.getByLabelText('Kwota w PLN'), '500');
    await user.type(screen.getByLabelText('Przebieg w kilometrach'), '65000');
    await user.type(
      screen.getByLabelText('Miejsce naprawy'),
      'AutoSerwis Kraków'
    );
    await user.type(
      screen.getByLabelText('Opis wykonanych prac'),
      'Wymiana klocków hamulcowych'
    );

    const submitButton = screen.getByTestId('submit-repair-button');
    expect((submitButton as HTMLIonButtonElement).disabled).toBe(false);
  });

  it('powinien pokazywać błędy walidacji dla niepoprawnych wartości', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-4
    const mockService = createMockRepairService();
    const mockSpeech = createMockSpeechService();
    const user = userEvent.setup();

    await render(RepairFormPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: NavController, useValue: mockNavController },
        { provide: RepairService, useValue: mockService },
        { provide: SpeechService, useValue: mockSpeech },
      ],
    });

    // Type invalid amount and mileage
    await user.type(screen.getByLabelText('Kwota w PLN'), '0');
    await user.type(screen.getByLabelText('Przebieg w kilometrach'), '0');

    expect(screen.getByText('Kwota musi być większa od 0')).toBeInTheDocument();
    expect(
      screen.getByText('Przebieg musi być większy od 0')
    ).toBeInTheDocument();
    expect(screen.getByText('Miejsce jest wymagane')).toBeInTheDocument();
    expect(screen.getByText('Opis prac jest wymagany')).toBeInTheDocument();
  });

  it('powinien obsłużyć błąd zapisu bez nawigowania', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-3
    const mockService = createMockRepairService({
      add: vi.fn().mockRejectedValue(new Error('Firestore offline')),
    });
    const mockSpeech = createMockSpeechService();
    const navigateSpy = vi.fn();
    const user = userEvent.setup();

    await render(RepairFormPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: NavController, useValue: mockNavController },
        { provide: RepairService, useValue: mockService },
        { provide: SpeechService, useValue: mockSpeech },
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    });

    await user.type(screen.getByLabelText('Kwota w PLN'), '500'); // error handling test
    await user.type(screen.getByLabelText('Przebieg w kilometrach'), '65000');
    await user.type(
      screen.getByLabelText('Miejsce naprawy'),
      'AutoSerwis Kraków'
    );
    await user.type(
      screen.getByLabelText('Opis wykonanych prac'),
      'Wymiana klocków hamulcowych'
    );

    await user.click(screen.getByText('Zapisz naprawę'));

    await vi.waitFor(() => {
      expect(mockService.add).toHaveBeenCalled();
    });

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('powinien obsłużyć błąd rozpoznawania mowy bez przerywania', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-5
    const mockService = createMockRepairService();
    const mockSpeech = createMockSpeechService({
      startListening: vi.fn(() =>
        throwError(() => 'no-speech')
      ),
    });
    const user = userEvent.setup();

    await render(RepairFormPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: NavController, useValue: mockNavController },
        { provide: RepairService, useValue: mockService },
        { provide: SpeechService, useValue: mockSpeech },
      ],
    });

    // Should not throw
    const micButton = screen.getByTestId('mic-button');
    await expect(user.click(micButton)).resolves.toBeUndefined();
  });

  it('powinien wyłączyć przycisk mikrofonu gdy speech nie jest wspierany', async () => {
    // covers: docs/specs/repair/02-repair-crud.md#AC-5
    const mockService = createMockRepairService();
    const mockSpeech = createMockSpeechService({
      isSupported: vi.fn(() => false),
    });

    await render(RepairFormPage, {
      providers: [
        provideRouter([]),
        provideIonicAngular({ mode: 'md' }),
        { provide: NavController, useValue: mockNavController },
        { provide: RepairService, useValue: mockService },
        { provide: SpeechService, useValue: mockSpeech },
      ],
    });

    const micButton = screen.getByTestId('mic-button');
    expect((micButton as HTMLIonButtonElement).disabled).toBe(true);
  });
});