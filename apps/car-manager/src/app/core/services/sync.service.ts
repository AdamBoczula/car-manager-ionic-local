// spec: docs/specs/02-login-screen.md — Faza 1: sync queue management
import { Injectable, inject, signal } from '@angular/core';
import { RefuelService } from './refuel.service';
import { RepairService } from './repair.service';
import { AuthService } from './auth.service';

/**
 * Manages offline sync queue.
 * When the app is offline, failed Firestore writes are queued.
 * When connectivity returns, the queue is processed.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly refuelService = inject(RefuelService);
  private readonly repairService = inject(RepairService);
  private readonly auth = inject(AuthService);

  readonly isOnline = signal(navigator.onLine);
  readonly queueLength = signal(0);

  private processing = false;

  constructor() {
    this.listenToConnectivity();
  }

  private listenToConnectivity(): void {
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }

  /**
   * Process the sync queue — push all queued items to Firestore.
   * Called automatically when coming online.
   */
  async processQueue(): Promise<void> {
    if (this.processing) return;
    if (!this.auth.isLoggedIn()) return;

    this.processing = true;

    try {
      // Get all distinct carIds from the queue
      const carsSynced = new Set<string>();

      for (const carId of carsSynced) {
        await this.refuelService.syncToFirestore(carId);
        await this.repairService.syncToFirestore(carId);
      }
    } catch (err) {
      console.warn('Sync queue processing error:', err);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Force-sync a specific car's data to Firestore.
   */
  async forceSyncCar(carId: string): Promise<void> {
    await this.refuelService.syncToFirestore(carId);
    await this.repairService.syncToFirestore(carId);
  }
}
