// spec: docs/specs/02-login-screen.md — Faza 1: generic CRUD helper for offline-first Firestore services
import { Injectable, inject, type WritableSignal } from '@angular/core';
import type { Unsubscribe, Timestamp } from 'firebase/firestore';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';

export interface CrudEntry {
  id: string;
  carId: string;
  date: string;
  amount: number;
  mileage: number;
  createdBy: string;
  createdAt: Timestamp;
}

interface ListenerState {
  generation: number;
  activeCarId: string | null;
  unsubscribe: Unsubscribe | null;
  signal: WritableSignal<unknown[]> | null;
}

/**
 * Helper service providing offline-first CRUD operations for Firestore-backed collections.
 *
 * Designed for the Refuel ↔ Repair pattern where both entities have the same base fields
 * and the same offline-first CRUD flow. Each domenowy service creates its own signal
 * and passes it to `startListening()` which updates it with cached + live data.
 *
 * Usage:
 *   const signal = signal<Refuel[]>([]);
 *   crud.startListening('refuels', 'refuels', carId, signal);
 *   const entry = await crud.addBase<Refuel>('refuels', 'refuels', data);
 */
@Injectable({ providedIn: 'root' })
export class FirestoreCrudService {
  private readonly firestore = db;
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);

  /** Map of collectionName → ListenerState. Each collection has its own listener. */
  private readonly listeners = new Map<string, ListenerState>();

  // ── Lifecycle ──

  /**
   * Start listening to a Firestore collection for a given car.
   * Updates the provided signal with cached data (fast), then with live Firestore data.
   *
   * Call `stopListening(collectionName)` when navigating away.
   */
  startListening<T>(
    collectionName: string,
    storageKeyPrefix: string,
    carId: string,
    signal: WritableSignal<T[]>,
  ): void {
    // Stop any existing listener for this collection
    this.stopListening(collectionName);

    const generation = Date.now();

    this.listeners.set(collectionName, {
      generation,
      activeCarId: carId,
      unsubscribe: null,
      signal: signal,
    });

    // 1. Fast path: load from local storage
    void this.loadFromCache<T>(storageKeyPrefix, carId, signal, collectionName, generation);

    // 2. Live sync from Firestore
    const q = query(
      collection(this.firestore, collectionName),
      where('carId', '==', carId),
      orderBy('date', 'desc'),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const state = this.listeners.get(collectionName);
        if (!this.isCurrent(state, generation, carId)) return;

        const remote = snapshot.docs.map(
          (docSnap) =>
            ({
              id: docSnap.id,
              ...docSnap.data(),
            }) as unknown as T,
        );

        signal.set(remote);
        this.storage.set(`${storageKeyPrefix}:${carId}`, remote);
      },
      () => {
        // Keep showing cached data on Firestore errors
      },
    );

    const currentState = this.listeners.get(collectionName);
    if (currentState?.generation === generation) {
      currentState.unsubscribe = unsubscribe;
    } else {
      unsubscribe();
    }
  }

  /**
   * Stop the Firestore listener for a given collection.
   */
  stopListening(collectionName: string): void {
    const state = this.listeners.get(collectionName);
    if (!state) return;

    state.generation++;
    if (state.unsubscribe) {
      state.unsubscribe();
    }
    this.listeners.delete(collectionName);
  }

  private async loadFromCache<T>(
    storageKeyPrefix: string,
    carId: string,
    signal: WritableSignal<T[]>,
    collectionName: string,
    generation: number,
  ): Promise<void> {
    const cached = await this.storage.get<T[]>(`${storageKeyPrefix}:${carId}`);
    const state = this.listeners.get(collectionName);
    if (!this.isCurrent(state, generation, carId)) return;
    signal.set(cached ?? []);
  }

  private isCurrent(state: ListenerState | undefined, generation: number, carId: string): boolean {
    return state?.generation === generation && state?.activeCarId === carId;
  }

  // ── CRUD ──

  /**
   * Add a new entry. Saves locally first, then syncs to Firestore.
   * Updates the registered signal immediately.
   * Returns the created entry with the temporary ID (updated later with Firestore ID).
   */
  async addBase<T extends CrudEntry>(
    collectionName: string,
    storageKeyPrefix: string,
    data: Omit<T, 'id' | 'createdAt' | 'createdBy'>,
  ): Promise<T> {
    const { Timestamp } = await import('firebase/firestore');
    const user = this.auth.currentUser();
    if (!user) throw new Error('User must be logged in to add an entry.');

    const entry: T = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Timestamp.now() as unknown as T['createdAt'],
      createdBy: user.uid,
    } as unknown as T;

    // 1. Save to local storage immediately
    await this.saveLocal(storageKeyPrefix, entry.carId, entry);

    // 2. Update signal immediately (if active listener for this car)
    const state = this.listeners.get(collectionName);
    if (state?.activeCarId === entry.carId && state?.signal) {
      const allLocal = await this.getAllLocal<T>(storageKeyPrefix, entry.carId);
      state.signal.set(allLocal);
    }

    // 3. Sync to Firestore in background
    try {
      const docRef = await addDoc(
        collection(this.firestore, collectionName),
        this.toFirestoreData(entry),
      );
      entry.id = docRef.id;
      await this.updateLocalId(storageKeyPrefix, entry.carId, entry);
    } catch {
      // Item stays in local storage, sync service will handle later
    }

    return entry;
  }

  /**
   * Update an existing entry: local storage then Firestore.
   */
  async update<T extends CrudEntry>(
    collectionName: string,
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>> & { carId: string },
  ): Promise<void> {
    const carId = data.carId;

    // Update local
    const cached = await this.storage.get<T[]>(`${collectionName}:${carId}`);
    if (cached) {
      const updated = cached.map((r) => (r.id === id ? { ...r, ...data, id } : r));
      await this.storage.set(`${collectionName}:${carId}`, updated);

      // Update signal
      const state = this.listeners.get(collectionName);
      if (state?.activeCarId === carId && state?.signal) {
        state.signal.set(updated);
      }
    }

    // Update Firestore
    try {
      await updateDoc(doc(this.firestore, collectionName, id), data);
    } catch {
      // Will sync later
    }
  }

  /**
   * Delete an entry from local storage and Firestore.
   */
  async delete(collectionName: string, id: string, carId: string): Promise<void> {
    // Delete local
    const cached = await this.storage.get<unknown[]>(`${collectionName}:${carId}`);
    if (cached) {
      const filtered = cached.filter((r) => (r as Record<string, string>)['id'] !== id);
      await this.storage.set(`${collectionName}:${carId}`, filtered);

      // Update signal
      const state = this.listeners.get(collectionName);
      if (state?.activeCarId === carId && state?.signal) {
        state.signal.set(filtered);
      }
    }

    // Delete from Firestore
    try {
      await deleteDoc(doc(this.firestore, collectionName, id));
    } catch {
      // Will sync later
    }
  }

  // ── Sync ──

  /**
   * Force-sync all local entries for a car to Firestore.
   */
  async syncToFirestore<T extends CrudEntry>(
    collectionName: string,
    storageKeyPrefix: string,
    carId: string,
  ): Promise<void> {
    const cached = await this.storage.get<T[]>(`${storageKeyPrefix}:${carId}`);
    if (!cached?.length) return;

    const firestoreRef = collection(this.firestore, collectionName);

    for (const entry of cached) {
      try {
        if (entry.id.length === 36) {
          const docRef = await addDoc(firestoreRef, this.toFirestoreData(entry));
          entry.id = docRef.id;
        }
      } catch {
        // Will retry on next sync
      }
    }

    await this.storage.set(`${storageKeyPrefix}:${carId}`, cached);
  }

  // ── Queries ──

  /**
   * Get all entries for a car (one-shot, no listener).
   */
  async getAllLocal<T>(storageKeyPrefix: string, carId: string): Promise<T[]> {
    const cached = await this.storage.get<T[]>(`${storageKeyPrefix}:${carId}`);
    return cached ?? [];
  }

  // ── Private helpers ──

  private async saveLocal(
    storageKeyPrefix: string,
    carId: string,
    entry: CrudEntry,
  ): Promise<void> {
    const cached = await this.storage.get<CrudEntry[]>(`${storageKeyPrefix}:${carId}`);
    const list = cached ? [...cached, entry] : [entry];
    await this.storage.set(`${storageKeyPrefix}:${carId}`, list);
  }

  private async updateLocalId(
    storageKeyPrefix: string,
    carId: string,
    entry: CrudEntry,
  ): Promise<void> {
    const cached = await this.storage.get<CrudEntry[]>(`${storageKeyPrefix}:${carId}`);
    if (cached) {
      const updated = cached.map((r) => (r.id === entry.id ? { ...entry } : r));
      await this.storage.set(`${storageKeyPrefix}:${carId}`, updated);
    }
  }

  /**
   * Strip `id` and `undefined` fields before writing to Firestore.
   */
  toFirestoreData<T>(entry: T): Record<string, unknown> {
    const { id: _id, ...data } = entry as Record<string, unknown>;
    void _id;
    return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  }
}
