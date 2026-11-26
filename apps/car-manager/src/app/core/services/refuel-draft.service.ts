// spec: docs/specs/refuel/03-receipt-ocr.md
import { Injectable, signal } from '@angular/core';
import type { RefuelDraft } from '../models/refuel.model';

export interface PendingRefuelDraft {
  draft: RefuelDraft;
  message?: string;
  toastColor?: 'success' | 'warning';
}

/**
 * Holds a single-use refuel draft between pages (e.g. after scanning a receipt on Dashboard)
 * or from future browser integrations (WebMCP).
 */
@Injectable({ providedIn: 'root' })
export class RefuelDraftService {
  private readonly pendingDraft = signal<PendingRefuelDraft | null>(null);

  /** Store a draft to be consumed once by RefuelFormPage. */
  setDraft(
    draft: RefuelDraft,
    message?: string,
    toastColor: 'success' | 'warning' = 'success',
  ): void {
    this.pendingDraft.set({ draft, message, toastColor });
  }

  /** Read and clear the pending draft atomically. */
  consumeDraft(): PendingRefuelDraft | null {
    const current = this.pendingDraft();
    if (current) {
      this.pendingDraft.set(null);
    }
    return current;
  }
}
