// spec: docs/specs/refuel/03-receipt-ocr.md
import type { Timestamp } from 'firebase/firestore';

/**
 * Tankowanie – pojedynczy wpis tankowania paliwa.
 */
export interface Refuel {
  id: string;
  carId: string;
  date: string; // ISO 8601
  amount: number; // zapłacona kwota (PLN)
  mileage: number; // przebieg (km)
  liters?: number; // opcjonalnie – ilość litrów
  isPremium: boolean; // czy tankowano paliwo premium
  isSkipped: boolean; // pominięty wpis (ktoś zatankował bez wiedzy)
  skippedReason?: string; // powód pominięcia
  consumption?: number; // l/100km – wyliczane automatycznie po zapisie
  createdBy: string; // uid użytkownika
  createdAt: Timestamp;
}

/**
 * Tymczasowy szkic tankowania (np. z OCR paragonu) do wstępnego wypełnienia formularza.
 */
export interface RefuelDraft {
  date?: string; // YYYY-MM-DD
  amount?: number;
  liters?: number;
  isPremium?: boolean;
}

/**
 * Wynik parsowania tekstu OCR polskiego paragonu za tankowanie.
 */
export interface ReceiptScanResult {
  draft: RefuelDraft;
  rawText: string;
  matchedFields: (keyof RefuelDraft)[];
}
