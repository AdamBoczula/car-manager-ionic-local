// spec: docs/specs/02-login-screen.md — Faza 1: offline-first refuel CRUD
// bugfix: docs/bugs/03-list-car-switcher-and-repair-back.md
import { Injectable, inject, signal } from '@angular/core';
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
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { Refuel } from '../models/refuel.model';

const REFUELS_COLLECTION = 'refuels';
const STORAGE_KEY = 'refuels';

@Injectable({ providedIn: 'root' })
export class RefuelService {
  private readonly firestore = db;
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);

  /** Signal with all refuels for the currently displayed car. */
  readonly refuels = signal<Refuel[]>([]);
  readonly isLoading = signal(false);

  private firestoreUnsubscribe: Unsubscribe | null = null;
  private activeCarId: string | null = null;
  private listenerGeneration = 0;

  /**
   * Start listening to refuels for a given car.
   * Loads from Ionic Storage first (fast), then syncs with Firestore.
   * Call `stopListening()` when navigating away.
   */
  async startListening(carId: string): Promise<void> {
    this.stopListening();
    const generation = ++this.listenerGeneration;
    this.activeCarId = carId;
    this.isLoading.set(true);
    this.refuels.set([]);

    // 1. Fast path: load from local storage
    const cached = await this.storage.get<Refuel[]>(this.storageKey(carId));
    if (!this.isCurrentListener(generation, carId)) return;
    this.refuels.set(cached ?? []);

    // 2. Live sync from Firestore
    const q = query(
      collection(this.firestore, REFUELS_COLLECTION),
      where('carId', '==', carId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!this.isCurrentListener(generation, carId)) return;
        const remote = snapshot.docs.map(
          (docSnap) =>
            ({
              id: docSnap.id,
              ...docSnap.data(),
            }) as Refuel
        );

        this.refuels.set(remote);
        // Keep local cache in sync
        this.storage.set(this.storageKey(carId), remote);
        this.isLoading.set(false);
      },
      (error) => {
        if (!this.isCurrentListener(generation, carId)) return;
        console.warn('Refuel Firestore listener error (offline?):', error);
        // Keep showing cached data on Firestore errors
        this.isLoading.set(false);
      }
    );

    if (this.isCurrentListener(generation, carId)) {
      this.firestoreUnsubscribe = unsubscribe;
    } else {
      unsubscribe();
    }
  }

  /** Stop the Firestore listener. Call on component destroy. */
  stopListening(): void {
    this.listenerGeneration++;
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }
    this.activeCarId = null;
  }

  private isCurrentListener(generation: number, carId: string): boolean {
    return this.listenerGeneration === generation && this.activeCarId === carId;
  }

  /**
   * Add a new refuel. Saves locally first, then syncs to Firestore.
   * Automatically calculates consumption if previous refuel data is available.
   */
  async add(
    data: Omit<Refuel, 'id' | 'createdAt' | 'createdBy'>
  ): Promise<Refuel> {
    const user = this.auth.currentUser();
    if (!user) throw new Error('User must be logged in to add a refuel.');

    const now = Timestamp.now();
    const refuel: Refuel = {
      ...data,
      id: crypto.randomUUID(), // temporary ID before Firestore assigns one
      createdAt: now,
      createdBy: user.uid,
    };

    // Calculate consumption if possible
    const consumption = await this.tryCalculateConsumption(
      refuel.carId,
      refuel
    );
    if (consumption !== null) {
      refuel.consumption = consumption;
    }

    // 1. Save to local storage immediately
    await this.saveLocal(refuel.carId, refuel);

    // 2. Sync to Firestore in background
    try {
      const docRef = await addDoc(
        collection(this.firestore, REFUELS_COLLECTION),
        this.toFirestoreData(refuel)
      );
      // Update local with real Firestore ID
      refuel.id = docRef.id;
      await this.updateLocalId(refuel.carId, refuel);
    } catch (err) {
      console.warn('Failed to sync refuel to Firestore (offline?):', err);
      // Item stays in local storage, sync service will handle later
    }

    return refuel;
  }

  async update(
    id: string,
    data: Partial<Omit<Refuel, 'id' | 'createdAt' | 'createdBy'>>
  ): Promise<void> {
    const carId = data.carId || this.activeCarId;
    if (!carId) throw new Error('carId is required to update a refuel.');

    // Update local
    const cached = await this.storage.get<Refuel[]>(this.storageKey(carId));
    if (cached) {
      const updated = cached.map((r) =>
        r.id === id ? { ...r, ...data, id } : r
      );
      await this.storage.set(this.storageKey(carId), updated);
    }

    // Update Firestore
    try {
      await updateDoc(doc(this.firestore, REFUELS_COLLECTION, id), data);
    } catch (err) {
      console.warn('Failed to sync refuel update to Firestore:', err);
    }
  }

  async delete(id: string, carId: string): Promise<void> {
    // Delete local
    const cached = await this.storage.get<Refuel[]>(this.storageKey(carId));
    if (cached) {
      const filtered = cached.filter((r) => r.id !== id);
      await this.storage.set(this.storageKey(carId), filtered);
    }

    // Delete from Firestore
    try {
      await deleteDoc(doc(this.firestore, REFUELS_COLLECTION, id));
    } catch (err) {
      console.warn('Failed to delete refuel from Firestore:', err);
    }
  }

  /**
   * Force-sync all local refuels for a car to Firestore.
   * Used by SyncService when coming back online.
   */
  async syncToFirestore(carId: string): Promise<void> {
    const cached = await this.storage.get<Refuel[]>(this.storageKey(carId));
    if (!cached?.length) return;

    const firestoreRefuels = collection(this.firestore, REFUELS_COLLECTION);

    for (const refuel of cached) {
      try {
        // Check if this refuel already exists in Firestore (has a real ID)
        if (refuel.id.length === 36) {
          // Looks like a UUID (temp ID), create new Firestore doc
          const docRef = await addDoc(
            firestoreRefuels,
            this.toFirestoreData(refuel)
          );
          refuel.id = docRef.id;
        }
        // If it has a shorter ID, it's likely a Firestore-generated ID already
      } catch (err) {
        console.warn(`Failed to sync refuel ${refuel.id}:`, err);
      }
    }

    // Save updated IDs back to local
    await this.storage.set(this.storageKey(carId), cached);
  }

  /** Get all refuels for a car (one-shot, no listener). */
  async getAllLocal(carId: string): Promise<Refuel[]> {
    const cached = await this.storage.get<Refuel[]>(this.storageKey(carId));
    return cached || [];
  }

  // ── Private helpers ──

  private storageKey(carId: string): string {
    return `${STORAGE_KEY}:${carId}`;
  }

  private async saveLocal(carId: string, refuel: Refuel): Promise<void> {
    const cached = await this.storage.get<Refuel[]>(this.storageKey(carId));
    const list = cached ? [...cached, refuel] : [refuel];
    await this.storage.set(this.storageKey(carId), list);
  }

  private async updateLocalId(carId: string, refuel: Refuel): Promise<void> {
    const cached = await this.storage.get<Refuel[]>(this.storageKey(carId));
    if (cached) {
      const updated = cached.map((r) =>
        r.id === refuel.id ? { ...refuel } : null
      );
      // Remove nulls (old temp-ID entries) and add updated version
      const filtered = updated.filter((r): r is Refuel => r !== null);
      await this.storage.set(this.storageKey(carId), filtered);
    }
  }

  /**
   * Try to calculate consumption by finding the last non-skipped refuel
   * for the same car before the given refuel.
   */
  private async tryCalculateConsumption(
    carId: string,
    refuel: Refuel
  ): Promise<number | null> {
    if (refuel.isSkipped || refuel.liters == null || refuel.liters <= 0) {
      return null;
    }

    const cached = await this.storage.get<Refuel[]>(this.storageKey(carId));
    if (!cached?.length) return null;

    // Find previous refuel: sorted by date, same carId, not skipped, has mileage
    const previous = cached
      .filter(
        (r) =>
          r.carId === carId &&
          !r.isSkipped &&
          r.mileage < refuel.mileage &&
          r.id !== refuel.id
      )
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];

    if (!previous) return null;

    const { calculateConsumption } = await import('../utils/consumption.util');
    return calculateConsumption(
      refuel.liters,
      refuel.mileage,
      previous.mileage
    );
  }

  private toFirestoreData(refuel: Refuel): Omit<Refuel, 'id'> {
    const { id: _id, ...data } = refuel;
    void _id; // explicitly unused — stripped before Firestore write
    return data;
  }
}
