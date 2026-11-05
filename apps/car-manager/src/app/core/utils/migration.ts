// spec: docs/adr/003-migration-system.md
// covers: docs/adr/003-migration-system.md#Krok-2
// Core interfaces for the migration system.

import type { StorageService } from '../services/storage.service';

/**
 * Each migration transforms storage from version N to N+1.
 * Every migration MUST be idempotent — running it twice on the same data
 * must produce the same result.
 */
export interface Migration {
  /** Human-readable description for logging. */
  readonly description: string;
  /** Execute the migration. Receives StorageService for read/write. */
  migrate(storage: StorageService): Promise<void>;
}

/**
 * Registry of all known schema versions and migrations.
 * Update this file when adding a new migration.
 */
export const SCHEMA_VERSION_KEY = '_app:schema_version';

/** The schema version this version of the app expects. Increment when adding migrations. */
export const EXPECTED_SCHEMA_VERSION = 1;

/**
 * All migrations in order.
 *
 * - Index 0: upgrades data from v1 → v2
 * - Index 1: upgrades data from v2 → v3
 * - …
 */
export const MIGRATIONS: readonly Migration[] = [
  // v1 → v2: placeholder for future migrations
  // { description: 'Dodanie pola fuelStation do Refuel', migrate: migrateV1ToV2 },
];
