// spec: docs/specs/refuel/03-receipt-ocr.md
// covers: docs/specs/refuel/03-receipt-ocr.md#AC-5
import { TestBed } from '@angular/core/testing';
import { RefuelDraftService } from './refuel-draft.service';

describe('RefuelDraftService', () => {
  let service: RefuelDraftService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [RefuelDraftService] });
    service = TestBed.inject(RefuelDraftService);
  });

  it('returns null when no draft was set', () => {
    expect(service.consumeDraft()).toBeNull();
  });

  it('stores and consumes a draft only once', () => {
    service.setDraft({ amount: 250, liters: 40, isPremium: true }, 'Odczytano paragon', 'success');

    const first = service.consumeDraft();
    expect(first).toEqual({
      draft: { amount: 250, liters: 40, isPremium: true },
      message: 'Odczytano paragon',
      toastColor: 'success',
    });

    expect(service.consumeDraft()).toBeNull();
  });
});
