import type { ApplicationConfig } from '@angular/core';
import { inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
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
import { KeyboardService } from './core/services/keyboard.service';

/**
 * Startup sequence, run once before the first route activates.
 *
 * Order matters — everything happens in a single initializer:
 *
 * 1. Ionic Storage init
 * 2. Data schema migration (if needed)
 * 3. Native keyboard listeners (no-op in the browser)
 * 4. The rest of the app (Auth, CarService, Dashboard) boots afterwards
 */
function initializeApp(): Promise<void> {
  const storageService = inject(StorageService);
  const migrationService = inject(MigrationService);
  const keyboardService = inject(KeyboardService);

  return (async () => {
    await storageService.init();
    await migrationService.run();
    // bugfix: docs/bugs/10-native-keyboard-integration.md
    await keyboardService.init();
  })();
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

    // ── Startup: Storage.init() → MigrationService.run() → app ──
    provideAppInitializer(initializeApp),
  ],
};
