// spec: docs/specs/02-login-screen.md — Faza 1: offline-first refuel CRUD
// bugfix: docs/bugs/03-list-car-switcher-and-repair-back.md
// bugfix: docs/bugs/04-add-not-refreshing-list.md
import { Injectable, inject, signal } from '@angular/core';
import type { Refuel } from '../models/refuel.model';
import { FirestoreCrudService } from './firestore-crud.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

const REFUELS_COLLECTION = 'refuels';
const STORAGE_KEY = 'refuels';

@Injectable({ providedIn: 'root' })
export class RefuelService {
  private readonly crud = inject(FirestoreCrudService);
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);

  /** Signal with all refuels for the currently displayed car. */
  readonly refuels = signal<Refuel[]>([]);
  readonly isLoading = signal(false);

  /**
   * Start listening to refuels for a given car.
   * Updates `this.refuels` with cached data (fast), then with live Firestore data.
   * Call `stopListening()` when navigating away.
   */
  startListening(carId: string): void {
    this.isLoading.set(true);
    this.crud.startListening<Refuel>(REFUELS_COLLECTION, STORAGE_KEY, carId, this.refuels);
    this.isLoading.set(false);
  }

  /** Stop the Firestore listener. */
  stopListening(): void {
    this.crud.stopListening(REFUELS_COLLECTION);
  }

  /**
   * Add a new refuel. Delegates to FirestoreCrudService for persistence,
   * then calculates consumption if previous refuel data is available.
   */
  async add(data: Omit<Refuel, 'id' | 'createdAt' | 'createdBy'>): Promise<Refuel> {
    const user = this.auth.currentUser();
    if (!user) throw new Error('User must be logged in to add a refuel.');

    const refuel = await this.crud.addBase<Refuel>(REFUELS_COLLECTION, STORAGE_KEY, data);

    // Calculate consumption if possible
    const consumption = await this.tryCalculateConsumption(refuel.carId, refuel);
    if (consumption !== null) {
      refuel.consumption = consumption;
    }

    return refuel;
  }

  async update(
    id: string,
    data: Partial<Omit<Refuel, 'id' | 'createdAt' | 'createdBy'>> & { carId: string },
  ): Promise<void> {
    await this.crud.update<Refuel>(REFUELS_COLLECTION, id, data);
  }

  async delete(id: string, carId: string): Promise<void> {
    await this.crud.delete(REFUELS_COLLECTION, id, carId);
  }

  async syncToFirestore(carId: string): Promise<void> {
    await this.crud.syncToFirestore<Refuel>(REFUELS_COLLECTION, STORAGE_KEY, carId);
  }

  async getAllLocal(carId: string): Promise<Refuel[]> {
    return this.crud.getAllLocal<Refuel>(STORAGE_KEY, carId);
  }

  /**
   * Try to calculate consumption by finding the last non-skipped refuel
   * for the same car before the given refuel.
   */
  private async tryCalculateConsumption(carId: string, refuel: Refuel): Promise<number | null> {
    if (refuel.isSkipped || refuel.liters == null || refuel.liters <= 0) {
      return null;
    }

    const cached = await this.storage.get<Refuel[]>(`${STORAGE_KEY}:${carId}`);
    if (!cached?.length) return null;

    // Find previous refuel: sorted by date, same carId, not skipped, has mileage
    const previous = cached
      .filter(
        (r) =>
          r.carId === carId && !r.isSkipped && r.mileage < refuel.mileage && r.id !== refuel.id,
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!previous) return null;

    const { calculateConsumption } = await import('../utils/consumption.util');
    return calculateConsumption(refuel.liters, refuel.mileage, previous.mileage);
  }
}
