// spec: docs/specs/02-login-screen.md — Faza 1: offline-first repair CRUD
import { Injectable, inject, signal } from '@angular/core';
import {
  collection,
  Firestore,
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
import { Repair } from '../models/repair.model';

const REPAIRS_COLLECTION = 'repairs';
const STORAGE_KEY = 'repairs';

@Injectable({ providedIn: 'root' })
export class RepairService {
  private readonly firestore: Firestore = db;
  private readonly storage = inject(StorageService);
  private readonly auth = inject(AuthService);

  readonly repairs = signal<Repair[]>([]);
  readonly isLoading = signal(false);

  private firestoreUnsubscribe: Unsubscribe | null = null;
  private activeCarId: string | null = null;

  async startListening(carId: string): Promise<void> {
    this.stopListening();
    this.activeCarId = carId;
    this.isLoading.set(true);

    // Fast path: local cache
    const cached = await this.storage.get<Repair[]>(this.storageKey(carId));
    if (cached?.length) {
      this.repairs.set(cached);
    }

    // Firestore listener
    const q = query(
      collection(this.firestore, REPAIRS_COLLECTION),
      where('carId', '==', carId),
      orderBy('date', 'desc')
    );

    this.firestoreUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remote = snapshot.docs.map(
          (docSnap) =>
            ({
              id: docSnap.id,
              ...docSnap.data(),
            }) as Repair
        );

        this.repairs.set(remote);
        this.storage.set(this.storageKey(carId), remote);
        this.isLoading.set(false);
      },
      (error) => {
        console.warn('Repair Firestore listener error (offline?):', error);
        this.isLoading.set(false);
      }
    );
  }

  stopListening(): void {
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }
    this.activeCarId = null;
  }

  async add(data: Omit<Repair, 'id' | 'createdAt' | 'createdBy'>): Promise<Repair> {
    const user = this.auth.currentUser();
    if (!user) throw new Error('User must be logged in to add a repair.');

    const repair: Repair = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Timestamp.now(),
      createdBy: user.uid,
    };

    // Save local first
    await this.saveLocal(repair.carId, repair);

    // Sync to Firestore
    try {
      const docRef = await addDoc(
        collection(this.firestore, REPAIRS_COLLECTION),
        this.toFirestoreData(repair)
      );
      repair.id = docRef.id;
      await this.updateLocalId(repair.carId, repair);
    } catch (err) {
      console.warn('Failed to sync repair to Firestore (offline?):', err);
    }

    return repair;
  }

  async update(id: string, data: Partial<Omit<Repair, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> {
    const carId = data.carId || this.activeCarId;
    if (!carId) throw new Error('carId is required to update a repair.');

    // Update local
    const cached = await this.storage.get<Repair[]>(this.storageKey(carId));
    if (cached) {
      const updated = cached.map((r) =>
        r.id === id ? { ...r, ...data, id } : r
      );
      await this.storage.set(this.storageKey(carId), updated);
    }

    // Update Firestore
    try {
      await updateDoc(doc(this.firestore, REPAIRS_COLLECTION, id), data);
    } catch (err) {
      console.warn('Failed to sync repair update to Firestore:', err);
    }
  }

  async delete(id: string, carId: string): Promise<void> {
    const cached = await this.storage.get<Repair[]>(this.storageKey(carId));
    if (cached) {
      const filtered = cached.filter((r) => r.id !== id);
      await this.storage.set(this.storageKey(carId), filtered);
    }

    try {
      await deleteDoc(doc(this.firestore, REPAIRS_COLLECTION, id));
    } catch (err) {
      console.warn('Failed to delete repair from Firestore:', err);
    }
  }

  async syncToFirestore(carId: string): Promise<void> {
    const cached = await this.storage.get<Repair[]>(this.storageKey(carId));
    if (!cached?.length) return;

    const firestoreRepairs = collection(this.firestore, REPAIRS_COLLECTION);

    for (const repair of cached) {
      try {
        if (repair.id.length === 36) {
          const docRef = await addDoc(firestoreRepairs, this.toFirestoreData(repair));
          repair.id = docRef.id;
        }
      } catch (err) {
        console.warn(`Failed to sync repair ${repair.id}:`, err);
      }
    }

    await this.storage.set(this.storageKey(carId), cached);
  }

  async getAllLocal(carId: string): Promise<Repair[]> {
    const cached = await this.storage.get<Repair[]>(this.storageKey(carId));
    return cached || [];
  }

  // ── Private helpers ──

  private storageKey(carId: string): string {
    return `${STORAGE_KEY}:${carId}`;
  }

  private async saveLocal(carId: string, repair: Repair): Promise<void> {
    const cached = await this.storage.get<Repair[]>(this.storageKey(carId));
    const list = cached ? [...cached, repair] : [repair];
    await this.storage.set(this.storageKey(carId), list);
  }

  private async updateLocalId(carId: string, repair: Repair): Promise<void> {
    const cached = await this.storage.get<Repair[]>(this.storageKey(carId));
    if (cached) {
      const updated = cached.map((r) => (r.id === repair.id ? { ...repair } : r));
      await this.storage.set(this.storageKey(carId), updated);
    }
  }

  private toFirestoreData(repair: Repair): Omit<Repair, 'id'> {
    const { id: _id, ...data } = repair;
    void _id; // explicitly unused — stripped before Firestore write
    return data;
  }
}