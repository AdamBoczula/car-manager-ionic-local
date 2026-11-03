// spec: docs/specs/05-car-management.md
import { Injectable, inject, signal, computed } from '@angular/core';
import {
  collection,
  addDoc,
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
import { Car } from '../models/car.model';

const CARS_COLLECTION = 'cars';
const STORAGE_PREFIX = 'cars';

@Injectable({ providedIn: 'root' })
export class CarService {
  private readonly firestore = db;
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);

  /** Signal with all cars in the garage. */
  readonly cars = signal<Car[]>([]);

  /** The currently active car ID (persisted to storage). */
  readonly activeCarId = signal<string | null>(null);

  /** Computed: the active Car object, or null if none selected. */
  readonly activeCar = computed<Car | null>(() => {
    const id = this.activeCarId();
    if (!id) return null;
    return this.cars().find((c) => c.id === id) ?? null;
  });

  /** Computed: whether the garage has at least one car. */
  readonly hasCars = computed<boolean>(() => this.cars().length > 0);

  /** Whether the initial load from storage + Firestore subscription is in progress. */
  readonly isLoading = signal<boolean>(false);

  private firestoreUnsubscribe: Unsubscribe | null = null;
  private _started = false;

  /**
   * Start listening to cars for the current user.
   * Loads from Ionic Storage first (fast), then syncs with Firestore.
   * Idempotent — calling again is a no-op.
   */
  async startListening(): Promise<void> {
    if (this._started) return;
    this._started = true;

    const user = this.auth.currentUser();
    if (!user) return;

    this.isLoading.set(true);

    // 1. Fast path: load from local storage
    const cached = await this.storage.get<Car[]>(this.storageKey(user.uid));
    if (cached?.length) {
      this.cars.set(cached);
    }

    // Restore active car from storage
    const savedActiveId = await this.storage.get<string>(
      this.activeCarKey(user.uid)
    );
    if (savedActiveId && cached?.some((c) => c.id === savedActiveId)) {
      this.activeCarId.set(savedActiveId);
    } else if (cached?.length) {
      // Fallback: first car is active
      this.activeCarId.set(cached[0].id);
      await this.storage.set(this.activeCarKey(user.uid), cached[0].id);
    }

    // 2. Live sync from Firestore
    const q = query(
      collection(this.firestore, CARS_COLLECTION),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'asc')
    );

    this.firestoreUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remote = snapshot.docs.map(
          (docSnap) =>
            ({
              id: docSnap.id,
              ...docSnap.data(),
            }) as Car
        );

        this.cars.set(remote);
        // Keep local cache in sync
        this.storage.set(this.storageKey(user.uid), remote);

        // If active car was deleted, pick the first available
        const activeId = this.activeCarId();
        if (activeId && !remote.some((c) => c.id === activeId)) {
          const newActiveId = remote.length > 0 ? remote[0].id : null;
          this.activeCarId.set(newActiveId);
          if (newActiveId) {
            this.storage.set(this.activeCarKey(user.uid), newActiveId);
          } else {
            this.storage.remove(this.activeCarKey(user.uid));
          }
        }

        // If no active car but we have cars, set first as active
        if (!this.activeCarId() && remote.length > 0) {
          this.activeCarId.set(remote[0].id);
          this.storage.set(this.activeCarKey(user.uid), remote[0].id);
        }

        this.isLoading.set(false);
      },
      (error) => {
        console.warn('Car Firestore listener error (offline?):', error);
        this.isLoading.set(false);
      }
    );
  }

  /** Stop the Firestore listener. */
  stopListening(): void {
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }
    this._started = false;
  }

  /**
   * Add a new car. Saves locally first, then syncs to Firestore.
   * Optional fields: currentMileage, year, vin.
   */
  async addCar(
    name: string,
    options?: {
      currentMileage?: number;
      year?: number;
      vin?: string;
    }
  ): Promise<Car> {
    const user = this.auth.currentUser();
    if (!user) throw new Error('User must be logged in to add a car.');

    const car: Car = {
      id: crypto.randomUUID(),
      name: name.trim(),
      ownerId: user.uid,
      ...(options?.currentMileage !== undefined && {
        currentMileage: options.currentMileage,
      }),
      ...(options?.year !== undefined && { year: options.year }),
      ...(options?.vin?.trim() && { vin: options.vin.trim() }),
      createdAt: Timestamp.now(),
    };

    // 1. Save to local storage immediately
    const cached = await this.storage.get<Car[]>(this.storageKey(user.uid));
    const list = cached ? [...cached, car] : [car];
    await this.storage.set(this.storageKey(user.uid), list);

    // 2. Sync to Firestore in background
    try {
      const docRef = await addDoc(
        collection(this.firestore, CARS_COLLECTION),
        this.toFirestoreData(car)
      );
      // Update local with real Firestore ID
      car.id = docRef.id;
      await this.updateLocalId(user.uid, car);

      // Update the cars signal with the new ID
      const updated = list.map((c) => (c.id === car.id ? car : c));
      await this.storage.set(this.storageKey(user.uid), updated);
    } catch (err) {
      console.warn('Failed to sync car to Firestore (offline?):', err);
      // Item stays in local storage, listener will sync later
    }

    // If this is the first car, set it as active
    if (!this.activeCarId()) {
      await this.setActiveCar(car.id);
    }

    return car;
  }

  /**
   * Delete a car. Removes from local storage and Firestore.
   * If the deleted car was active, switches to the first available car.
   */
  async deleteCar(id: string): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) throw new Error('User must be logged in to delete a car.');

    // Update local
    const cached = await this.storage.get<Car[]>(this.storageKey(user.uid));
    if (cached) {
      const filtered = cached.filter((c) => c.id !== id);
      await this.storage.set(this.storageKey(user.uid), filtered);
    }

    // If deleting active car, switch to another
    if (this.activeCarId() === id) {
      const remaining = cached?.filter((c) => c.id !== id) ?? [];
      if (remaining.length > 0) {
        await this.setActiveCar(remaining[0].id);
      } else {
        this.activeCarId.set(null);
        await this.storage.remove(this.activeCarKey(user.uid));
      }
    }

    // Delete from Firestore
    try {
      await deleteDoc(doc(this.firestore, CARS_COLLECTION, id));
    } catch (err) {
      console.warn('Failed to delete car from Firestore:', err);
    }
  }

  /**
   * Set the active car. Persists the choice to Ionic Storage.
   */
  async setActiveCar(id: string): Promise<void> {
    const user = this.auth.currentUser();
    if (!user) return;

    this.activeCarId.set(id);
    await this.storage.set(this.activeCarKey(user.uid), id);
  }

  // ── Private helpers ──

  private storageKey(uid: string): string {
    return `${STORAGE_PREFIX}:${uid}`;
  }

  private activeCarKey(uid: string): string {
    return `active_car:${uid}`;
  }

  private async updateLocalId(uid: string, car: Car): Promise<void> {
    const cached = await this.storage.get<Car[]>(this.storageKey(uid));
    if (cached) {
      const updated = cached.map((c) =>
        // Match by temp UUID (36 chars) or by name+ownerId+createdAt
        c.id === car.id || (c.name === car.name && c.ownerId === car.ownerId)
          ? car
          : c
      );
      await this.storage.set(this.storageKey(uid), updated);
    }
  }

  private toFirestoreData(car: Car): Omit<Car, 'id'> {
    const { id: _id, ...data } = car;
    void _id; // explicitly unused — stripped before Firestore write
    return data;
  }
}