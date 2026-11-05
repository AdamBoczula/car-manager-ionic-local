// spec: docs/adr/003-migration-system.md
// Krok 2: MigrationService — obsługa inkrementalnych migracji danych lokalnych

import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import {
  Migration,
  SCHEMA_VERSION_KEY,
  EXPECTED_SCHEMA_VERSION,
  MIGRATIONS,
} from '../utils/migration';

/** Maximum time (ms) a single migration step may take before being aborted. */
const MIGRATION_TIMEOUT_MS = 30_000;

/**
 * Manages schema versioning and data migration for Ionic Storage.
 *
 * Lifecycle:
 *   1. Call `run()` after `StorageService.init()` completes.
 *   2. Reads current version from `_app:schema_version`.
 *   3. Runs all pending migrations sequentially (v1→v2→v3…).
 *   4. Updates `_app:schema_version` after each successful step.
 *   5. If any migration fails, version is NOT updated — retry on next startup.
 *
 * Idempotent: safe to call `run()` multiple times. Subsequent calls are no-ops
 * when the schema is already up-to-date.
 *
 * Thread-safe: `isRunning` guard prevents concurrent execution.
 */
@Injectable({ providedIn: 'root' })
export class MigrationService {
  private readonly storage = inject(StorageService);
  private isRunning = false;

  /** True while a migration is in progress. */
  readonly migrating = signal(false);

  /**
   * Run pending migrations (if any). Must be called after StorageService.init().
   * Idempotent — safe to call multiple times.
   *
   * @throws {Error} if a migration fails or times out.
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      console.warn('[MigrationService] Already running — skipping duplicate call.');
      return;
    }

    this.isRunning = true;
    this.migrating.set(true);

    try {
      await this.runMigrations();
    } finally {
      this.isRunning = false;
      this.migrating.set(false);
    }
  }

  private async runMigrations(): Promise<void> {
    const storedVersion = await this.readSchemaVersion();

    if (storedVersion === EXPECTED_SCHEMA_VERSION) {
      console.info(`[MigrationService] Schema is up-to-date (v${storedVersion}).`);
      return;
    }

    if (storedVersion > EXPECTED_SCHEMA_VERSION) {
      // Użytkownik ma nowszą wersję danych niż kod (cofnął update).
      // Nie możemy migrować w dół — zatrzymujemy startup.
      throw new Error(
        `[MigrationService] Schema version mismatch: storage v${storedVersion} > ` +
        `app v${EXPECTED_SCHEMA_VERSION}. Please update the app to the latest version.`
      );
    }

    const migrations = MIGRATIONS;

    // Iterate from storedVersion up to (but not including) EXPECTED_SCHEMA_VERSION.
    // migrationIndex = current - 1 (e.g., v1→v2 uses migrations[0]).
    for (let current = storedVersion; current < EXPECTED_SCHEMA_VERSION; current++) {
      const migrationIndex = current - 1;

      // Guard: migrationIndex must be within bounds and non-negative.
      if (migrationIndex < 0 || migrationIndex >= migrations.length) {
        const migrationsDefined = migrations.length;
        throw new Error(
          `[MigrationService] Cannot migrate v${current}→v${current + 1}: ` +
          `migration index ${migrationIndex} is out of bounds. ` +
          `Expected ${EXPECTED_SCHEMA_VERSION - 1} migration(s), found ${migrationsDefined}.`
        );
      }

      const migration = migrations[migrationIndex];
      await this.executeMigration(current, current + 1, migration);

      // Update version AFTER successful migration.
      await this.storage.set(SCHEMA_VERSION_KEY, current + 1);
    }

    console.info(
      `[MigrationService] All migrations complete. Schema is now v${EXPECTED_SCHEMA_VERSION}.`
    );
  }

  private async executeMigration(
    from: number,
    to: number,
    migration: Migration,
  ): Promise<void> {
    console.info(
      `[MigrationService] Running migration v${from}→v${to}: ${migration.description}`
    );

    // Timeout: prevent infinite loops or hung migrations.
    await Promise.race([
      migration.migrate(this.storage),
      this.timeout(from, to),
    ]);
  }

  private async timeout(from: number, to: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `[MigrationService] Migration v${from}→v${to} timed out after ${MIGRATION_TIMEOUT_MS}ms.`
          )
        );
      }, MIGRATION_TIMEOUT_MS);
    });
  }

  /**
   * Read the stored schema version, with validation.
   * - If missing / null / undefined → data is at v1 (initial schema).
   * - If not a number → treat as missing (reset to v1).
   */
  private async readSchemaVersion(): Promise<number> {
    const raw = await this.storage.get<unknown>(SCHEMA_VERSION_KEY);

    if (raw === null || raw === undefined) {
      // First run: schema doesn't exist yet. Seed as v1.
      await this.storage.set(SCHEMA_VERSION_KEY, 1);
      return 1;
    }

    if (typeof raw !== 'number' || isNaN(raw) || raw < 0) {
      console.warn(
        `[MigrationService] Invalid schema_version value: ${JSON.stringify(raw)}. Resetting to 1.`
      );
      await this.storage.set(SCHEMA_VERSION_KEY, 1);
      return 1;
    }

    // Clamp to integer flooring (e.g., 2.7 → 2).
    const version = Math.floor(raw);
    if (version !== raw) {
      await this.storage.set(SCHEMA_VERSION_KEY, version);
    }

    return Math.max(version, 1);
  }
}