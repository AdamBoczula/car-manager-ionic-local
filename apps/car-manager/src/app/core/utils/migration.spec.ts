// spec: docs/adr/003-migration-system.md
// covers: docs/adr/003-migration-system.md#Krok-2
// Testy dla konfiguracji migracji (stałe, interfejsy)

import { describe, it, expect } from 'vitest';
import { EXPECTED_SCHEMA_VERSION, SCHEMA_VERSION_KEY, MIGRATIONS, Migration } from './migration';

describe('migration configuration', () => {
  it('powinien mieć SCHEMA_VERSION_KEY = _app:schema_version', () => {
    expect(SCHEMA_VERSION_KEY).toBe('_app:schema_version');
  });

  it('powinien mieć EXPECTED_SCHEMA_VERSION >= 1', () => {
    expect(EXPECTED_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('powinien mieć integer jako EXPECTED_SCHEMA_VERSION', () => {
    expect(Number.isInteger(EXPECTED_SCHEMA_VERSION)).toBe(true);
  });

  it('powinien mieć tyle migracji ile wynika z EXPECTED_SCHEMA_VERSION - 1', () => {
    // Jeśli EXPECTED_VERSION = 1, nie ma migracji (index 0 to v1→v2).
    // Jeśli EXPECTED_VERSION = 3, oczekujemy 2 migracji (v1→v2, v2→v3).
    const expectedCount = EXPECTED_SCHEMA_VERSION - 1;
    expect(MIGRATIONS.length).toBe(expectedCount);
  });

  it('każda migracja powinna mieć description i migrate function', () => {
    for (const m of MIGRATIONS) {
      expect(m.description).toBeDefined();
      expect(typeof m.description).toBe('string');
      expect(m.description.length).toBeGreaterThan(0);
      expect(typeof m.migrate).toBe('function');
    }
  });

  it('każda migracja powinna mieć unikalny description', () => {
    const descriptions = MIGRATIONS.map((m) => m.description);
    const unique = new Set(descriptions);
    expect(unique.size).toBe(descriptions.length);
  });
});
