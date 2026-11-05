// spec: docs/specs/02-login-screen.md — Faza 1: offline-first storage wrapper
import { Injectable, inject } from '@angular/core';
import { Storage } from '@ionic/storage';

/**
 * Thin wrapper around @ionic/storage.
 * Handles initialization and provides typed get/set/remove operations.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storage = inject(Storage);
  private ready = false;

  /**
   * Initialize storage. Must be called once before any read/write.
   * Idempotent — subsequent calls are no-ops.
   */
  async init(): Promise<void> {
    if (this.ready) return;
    await this.storage.create();
    this.ready = true;
  }

  async get<T>(key: string): Promise<T | null> {
    await this.ensureReady();
    return this.storage.get(key) as Promise<T | null>;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.ensureReady();
    await this.storage.set(key, value);
  }

  async remove(key: string): Promise<void> {
    await this.ensureReady();
    await this.storage.remove(key);
  }

  async keys(): Promise<string[]> {
    await this.ensureReady();
    return this.storage.keys();
  }

  async clear(): Promise<void> {
    await this.ensureReady();
    await this.storage.clear();
  }

  private async ensureReady(): Promise<void> {
    if (!this.ready) {
      await this.init();
    }
  }
}
