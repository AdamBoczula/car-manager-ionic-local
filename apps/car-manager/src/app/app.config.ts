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

// ── Firebase: side-effect import initializes the SDK before DI starts ──
import './core/firebase';

import { appRoutes } from './app.routes';
import { StorageService } from './core/services/storage.service';

function initializeStorage(storageService: StorageService): () => Promise<void> {
  return () => storageService.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
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
    {
      provide: APP_INITIALIZER,
      useFactory: initializeStorage,
      deps: [StorageService],
      multi: true,
    },
  ],
};