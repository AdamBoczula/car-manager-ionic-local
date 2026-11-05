import { Component, inject, effect, DestroyRef } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { AuthService } from './core/services/auth.service';
import { CarService } from './core/services/car.service';
import { E2eService } from './core/services/e2e.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet /></ion-app>`,
})
export class AppComponent {
  private readonly authService = inject(AuthService);
  private readonly carService = inject(CarService);
  private readonly destroyRef = inject(DestroyRef);

  // Eagerly instantiate E2eService to expose window.__e2e__ helpers.
  // Injected here (not via ENVIRONMENT_INITIALIZER) to ensure Firebase
  // is already initialized by the time the service constructor runs.
  private readonly _e2e = inject(E2eService);

  constructor() {
    // Start car listener when user logs in
    const carInit = effect(() => {
      if (this.authService.isLoggedIn()) {
        this.carService.startListening();
      } else {
        this.carService.stopListening();
      }
    });

    this.destroyRef.onDestroy(() => {
      carInit.destroy();
    });
  }
}
