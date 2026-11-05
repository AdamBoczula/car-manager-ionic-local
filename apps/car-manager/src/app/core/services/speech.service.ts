// spec: docs/specs/repair/02-repair-crud.md
import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Web Speech API wrapper for speech-to-text.
 * Uses the browser's SpeechRecognition API as a fallback
 * (Capacitor speech plugin is the primary target for native builds).
 */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  readonly isListening = signal(false);
  readonly isSupported = signal(false);
  private readonly recognition: unknown = null;

  constructor() {
    const win = window as unknown as Record<string, unknown>;
    const SR = win['SpeechRecognition'] ?? win['webkitSpeechRecognition'];
    this.isSupported.set(!!SR);
    if (SR) {
      this.recognition = new (SR as new () => Record<string, unknown>)();
    }
  }

  startListening(language = 'pl-PL'): Observable<string> {
    return new Observable((observer) => {
      if (!this.recognition) {
        observer.error('Speech recognition not supported');
        return;
      }

      const rec = this.recognition as Record<string, unknown>;
      rec['lang'] = language;
      rec['interimResults'] = false;
      rec['maxAlternatives'] = 1;
      this.isListening.set(true);

      rec['onresult'] = (event: Record<string, unknown>) => {
        const results = event['results'] as { transcript: string }[][];
        const transcript = results[0][0].transcript;
        observer.next(transcript);
        observer.complete();
        this.isListening.set(false);
      };

      rec['onerror'] = (event: Record<string, unknown>) => {
        observer.error(event['error']);
        this.isListening.set(false);
      };

      rec['onend'] = () => this.isListening.set(false);

      (rec['start'] as () => void)();

      return () => this.stopListening();
    });
  }

  stopListening(): void {
    if (this.recognition) {
      const stopFn = (this.recognition as Record<string, unknown>)['stop'] as
        (() => void) | undefined;
      stopFn?.();
      this.isListening.set(false);
    }
  }
}
