// covers: docs/specs/repair/02-repair-crud.md#AC-5
// spec: docs/specs/repair/02-repair-crud.md
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SpeechService } from './speech.service';

interface MockRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onresult: ((event: Record<string, unknown>) => void) | null;
  onerror: ((event: Record<string, unknown>) => void) | null;
  onend: (() => void) | null;
}

function createMockRecognition(): MockRecognition {
  return {
    lang: '',
    interimResults: false,
    maxAlternatives: 1,
    start: vi.fn(),
    stop: vi.fn(),
    onresult: null,
    onerror: null,
    onend: null,
  };
}

describe('SpeechService', () => {
  let service: SpeechService;
  let mockRecognition: MockRecognition;

  beforeEach(() => {
    mockRecognition = createMockRecognition();

    // Constructor returns mockRecognition directly so all
    // property mutations (onresult, onerror, onend) are visible

    const SR: any = function (this: any) {
      return mockRecognition;
    };

    (window as unknown as Record<string, unknown>).SpeechRecognition = SR;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    TestBed.configureTestingModule({
      providers: [SpeechService],
    });

    service = TestBed.inject(SpeechService);
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });

  // ── AC-5: isSupported ──

  it('powinien wykryć wsparcie dla SpeechRecognition', () => {
    expect(service.isSupported()).toBe(true);
  });

  it('powinien ustawić isSupported na false gdy SpeechRecognition nie istnieje', () => {
    const win = window as unknown as Record<string, unknown>;
    delete win.SpeechRecognition;
    const svc = new SpeechService();
    expect(svc.isSupported()).toBe(false);
  });

  it('powinien obsłużyć webkitSpeechRecognition jako fallback', () => {
    const win = window as unknown as Record<string, unknown>;
    delete win.SpeechRecognition;
    const fallbackRecognition = createMockRecognition();

    const SR: any = function (this: any) {
      return fallbackRecognition;
    };
    win.webkitSpeechRecognition = SR;
    const svc = new SpeechService();
    expect(svc.isSupported()).toBe(true);
    delete win.webkitSpeechRecognition;
  });

  // ── AC-5: startListening ──

  it('powinien ustawić isListening na true przy starcie nasłuchiwania', () => {
    service.startListening().subscribe();
    expect(service.isListening()).toBe(true);
    expect(mockRecognition.start).toHaveBeenCalled();
  });

  it('powinien emitować transkrypt po rozpoznaniu mowy', async () => {
    const transcriptPromise = firstValueFrom(service.startListening());

    mockRecognition.onresult?.({
      results: [[{ transcript: 'Wymiana oleju' }]],
    } as unknown as Record<string, unknown>);

    await expect(transcriptPromise).resolves.toBe('Wymiana oleju');
    expect(service.isListening()).toBe(false);
  });

  it('powinien obsłużyć błąd rozpoznawania', async () => {
    const transcriptPromise = firstValueFrom(service.startListening());

    mockRecognition.onerror?.({
      error: 'no-speech',
    } as unknown as Record<string, unknown>);

    await expect(transcriptPromise).rejects.toBe('no-speech');
    expect(service.isListening()).toBe(false);
  });

  it('powinien zwrócić błąd gdy SpeechRecognition nie jest wspierane', async () => {
    const win = window as unknown as Record<string, unknown>;
    delete win.SpeechRecognition;
    const svc = new SpeechService();

    await expect(firstValueFrom(svc.startListening())).rejects.toBe(
      'Speech recognition not supported',
    );
  });

  // ── AC-5: stopListening ──

  it('powinien zatrzymać nasłuchiwanie i ustawić isListening na false', () => {
    service.startListening().subscribe();
    expect(service.isListening()).toBe(true);

    service.stopListening();
    expect(mockRecognition.stop).toHaveBeenCalled();
    expect(service.isListening()).toBe(false);
  });

  it('powinien ustawić isListening na false gdy rozpoznawanie się kończy', () => {
    service.startListening().subscribe();

    mockRecognition.onend?.();
    expect(service.isListening()).toBe(false);
  });
});
