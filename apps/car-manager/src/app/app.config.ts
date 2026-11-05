import {
  ApplicationConfig,
  provideZoneChangeDetection,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { IonicRouteStrategy } from '@ionic/angular';
import { RouteReuseStrategy } from '@angular/router';
import { Drivers, Storage } from '@ionic/storage';

// ── Firebase: side-effect import initializes the SDK before DI starts ──
import './core/firebase';

import { appRoutes } from './app.routes';
import { StorageService } from './core/services/storage.service';
import { MigrationService } from './core/services/migration.service';

/**
 * APP_INITIALIZER: sekwencja startowa aplikacji.
 * Kolejność gwarantowana — wszystkie kroki w jednej fabryce.
 *
 * 1. Inicjalizacja Ionic Storage
 * 2. Migracja schematu danych (jeśli potrzebna)
 * 3. Reszta aplikacji (Auth, CarService, Dashboard) ładuje się później
 */
function initializeApp(
  storageService: StorageService,
  migrationService: MigrationService
): () => Promise<void> {
  return async () => {
    await storageService.init();
    await migrationService.run();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, withRouterConfig({ onSameUrlNavigation: 'reload' })),
    provideIonicAngular({ mode: 'md' }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },

    // ── Ionic Storage ──
    {
      provide: Storage,
      useFactory: () =>
        new Storage({
          name: '__car_manager_db',
          driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
        }),
    },

    // ── Startup: Storage.init() → MigrationService.run() → Aplikacja ──
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [StorageService, MigrationService],
      multi: true,
    },
  ],
};