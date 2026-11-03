// spec: docs/specs/05-car-management.md
import { Timestamp } from 'firebase/firestore';

/**
 * Samochód – encja nadrzędna.
 * ADR-002: jeden garaż na konto. Pole sharedWith usunięte.
 */
export interface Car {
  id: string;
  name: string; // np. "Toyota Corolla"
  ownerId: string; // uid użytkownika (garaż)
  currentMileage?: number; // optional – aktualny przebieg
  year?: number; // optional – rocznik auta
  vin?: string; // optional – numer VIN
  createdAt: Timestamp;
}