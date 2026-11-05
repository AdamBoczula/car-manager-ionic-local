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
  isVerva: boolean; // czy tankowano paliwo premium (Verva)
  isSkipped: boolean; // pominięty wpis (ktoś zatankował bez wiedzy)
  skippedReason?: string; // powód pominięcia
  consumption?: number; // l/100km – wyliczane automatycznie po zapisie
  createdBy: string; // uid użytkownika
  createdAt: Timestamp;
}
