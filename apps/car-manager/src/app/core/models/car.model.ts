import { Timestamp } from 'firebase/firestore';

/**
 * Samochód – encja nadrzędna.
 * Na start jeden samochód, później możliwość dodania kolejnych.
 */
export interface Car {
  id: string;
  name: string; // np. "Toyota Corolla"
  ownerId: string; // uid użytkownika, który stworzył auto
  sharedWith: string[]; // uid współdzielących (np. żony/męża)
  createdAt: Timestamp;
}