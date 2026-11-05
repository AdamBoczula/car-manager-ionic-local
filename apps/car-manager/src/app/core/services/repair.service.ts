// spec: docs/specs/02-login-screen.md — Faza 1: offline-first repair CRUD
// bugfix: docs/bugs/03-list-car-switcher-and-repair-back.md
// bugfix: docs/bugs/04-add-not-refreshing-list.md
import { Injectable, inject, signal } from '@angular/core';
import type { Repair } from '../models/repair.model';
import { FirestoreCrudService } from './firestore-crud.service';
import { AuthService } from './auth.service';

const REPAIRS_COLLECTION = 'repairs';
const STORAGE_KEY = 'repairs';

@Injectable({ providedIn: 'root' })
export class RepairService {
  private readonly crud = inject(FirestoreCrudService);
  private readonly auth = inject(AuthService);

  /** Signal with all repairs for the currently displayed car. */
  readonly repairs = signal<Repair[]>([]);

  /**
   * Start listening to repairs for a given car.
   * Updates `this.repairs` with cached data (fast), then with live Firestore data.
   * Call `stopListening()` when navigating away.
   */
  startListening(carId: string): void {
    this.crud.startListening<Repair>(REPAIRS_COLLECTION, STORAGE_KEY, carId, this.repairs);
  }

  /** Stop the Firestore listener. */
  stopListening(): void {
    this.crud.stopListening(REPAIRS_COLLECTION);
  }

  /**
   * Add a new repair. Delegates to FirestoreCrudService for persistence.
   */
  async add(data: Omit<Repair, 'id' | 'createdAt' | 'createdBy'>): Promise<Repair> {
    const user = this.auth.currentUser();
    if (!user) throw new Error('User must be logged in to add a repair.');

    return this.crud.addBase<Repair>(REPAIRS_COLLECTION, STORAGE_KEY, data);
  }

  async update(
    id: string,
    data: Partial<Omit<Repair, 'id' | 'createdAt' | 'createdBy'>> & { carId: string },
  ): Promise<void> {
    await this.crud.update<Repair>(REPAIRS_COLLECTION, id, data);
  }

  async delete(id: string, carId: string): Promise<void> {
    await this.crud.delete(REPAIRS_COLLECTION, id, carId);
  }

  async syncToFirestore(carId: string): Promise<void> {
    await this.crud.syncToFirestore<Repair>(REPAIRS_COLLECTION, STORAGE_KEY, carId);
  }

  async getAllLocal(carId: string): Promise<Repair[]> {
    return this.crud.getAllLocal<Repair>(STORAGE_KEY, carId);
  }
}
