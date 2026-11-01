import {
  ApplicationConfig,
  provideZoneChangeDetection,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { IonicRouteStrategy } from '@ionic/angular';
import { RouteReuseStrategy } from '@angular/router';
import { Drivers, Storage } from '@ionic/storage';

import { appRoutes } from './app.routes';
import { StorageService } from './core/services/storage.service';

// Import wywołuje inicjalizację Firebase (side-effect import)
// To musi być zaimportowane przed użyciem db/auth w serwisach
import './core/firebase';

/**
 * Initialize Ionic Storage before the app renders.
 * Ensures offline-first services can read/write immediately.
 */
function initializeStorage(storageService: StorageService): () => Promise<void> {
  return () => storageService.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideIonicAngular({ mode: 'md' }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: Storage,
      useFactory: () =>
        new Storage({
          name: '__car_manager_db',
          driverOrder: [Drivers.IndexedDB, Drivers.LocalStorage],
        }),
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeStorage,
      deps: [StorageService],
      multi: true,
    },
  ],
};