import { Timestamp } from 'firebase/firestore';

/**
 * Naprawa – pojedynczy wpis naprawy / serwisu.
 */
export interface Repair {
  id: string;
  carId: string;
  date: string; // ISO 8601
  amount: number; // zapłacona kwota (PLN)
  mileage: number; // przebieg (km)
  location: string; // gdzie robiono (warsztat, adres)
  description: string; // co robiono (textarea, dużo tekstu)
  mechanicNote: string; // komentarz o wykonawcy (textarea)
  createdBy: string; // uid użytkownika
  createdAt: Timestamp;
}