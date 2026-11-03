// spec: docs/specs/05-car-management.md
import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonButton,
  IonContent,
  IonInput,
  IonList,
  IonItem,
  IonIcon,
  IonLabel,
  IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { close, carSport, copyOutline } from 'ionicons/icons';
import { CarService } from '../../core/services/car.service';
import type { Car } from '../../core/models/car.model';

@Component({
  selector: 'app-add-car',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonInput,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        @if (!isWizardMode()) {
          <ion-buttons slot="start">
            <ion-back-button defaultHref="/dashboard" />
          </ion-buttons>
        }
        <ion-title>{{ isWizardMode() ? 'Witaj w garażu' : 'Dodaj auto' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="add-car__content">
        <!-- Wizard welcome message -->
        @if (isWizardMode()) {
          <div class="add-car__welcome" role="status">
            <ion-icon name="car-sport" class="add-car__welcome-icon" />
            <h1>🚗 Witaj w swoim garażu!</h1>
            <p class="add-car__subtitle">
              Dodaj swoje pierwsze auto, aby zacząć śledzić tankowania i naprawy.
            </p>
          </div>
        }

        <!-- Car name input -->
        <div class="add-car__form">
          <ion-input
            label="Nazwa auta"
            labelPlacement="stacked"
            placeholder="np. Toyota Corolla"
            [maxlength]="50"
            [value]="newCarName()"
            (ionInput)="newCarName.set($any($event).detail.value ?? '')"
            (keyup.enter)="handleAddCar()"
            aria-label="Nazwa auta"
            data-testid="car-name-input"
          />

          <!-- Optional: Przebieg -->
          <ion-input
            label="Przebieg (km)"
            labelPlacement="stacked"
            type="number"
            placeholder="np. 123000"
            [value]="newCarMileage() ?? ''"
            (ionInput)="newCarMileage.set(parseIonNumber($any($event).detail.value))"
            class="add-car__field"
            aria-label="Przebieg (km)"
            data-testid="car-mileage-input"
          />

          <!-- Optional: Rocznik -->
          <ion-input
            label="Rocznik"
            labelPlacement="stacked"
            type="number"
            placeholder="np. 2020"
            [value]="newCarYear() ?? ''"
            (ionInput)="newCarYear.set(parseIonNumber($any($event).detail.value))"
            class="add-car__field"
            aria-label="Rocznik"
            data-testid="car-year-input"
          />

          <!-- Optional: Numer VIN -->
          <div class="add-car__field--vin">
            <ion-input
              label="Numer VIN"
              labelPlacement="stacked"
              type="text"
              placeholder="np. WBA..."
              [value]="newCarVin()"
              (ionInput)="newCarVin.set($any($event).detail.value ?? '')"
              class="add-car__vin-input"
              aria-label="Numer VIN"
              data-testid="car-vin-input"
            />
            <ion-button
              fill="clear"
              size="small"
              [disabled]="!newCarVin().trim()"
              (click)="copyVin()"
              class="add-car__vin-copy-btn"
              aria-label="Kopiuj VIN"
              data-testid="copy-vin-button"
            >
              <ion-icon name="copy-outline" slot="icon-only" />
            </ion-button>
            @if (vinCopied()) {
              <span class="add-car__vin-copied" role="status">Skopiowano!</span>
            }
          </div>

          <ion-button
            expand="block"
            [disabled]="!newCarName().trim()"
            (click)="handleAddCar()"
            class="add-car__add-btn"
            data-testid="add-car-button"
          >
            Dodaj auto
          </ion-button>
        </div>

        <!-- Added cars list -->
        @if (pendingCars().length > 0) {
          <div class="add-car__list-section">
            <p class="add-car__list-title">Twoje auta</p>
            <ion-list>
              @for (car of pendingCars(); track car.id) {
                <ion-item>
                  <ion-icon name="car-sport" slot="start" aria-hidden="true" />
                  <ion-label>{{ car.name }}</ion-label>
                  <ion-button
                    slot="end"
                    fill="clear"
                    color="danger"
                    (click)="removePendingCar(car.id)"
                    aria-label="Usuń auto"
                    data-testid="remove-car-button"
                  >
                    <ion-icon name="close" slot="icon-only" />
                  </ion-button>
                </ion-item>
              }
            </ion-list>
          </div>
        }

        <!-- CTA: Start using the app (wizard only, shown when 1+ car) -->
        @if (isWizardMode() && pendingCars().length > 0) {
          <div class="add-car__cta">
            <div class="add-car__cta-divider"></div>
            <ion-button
              expand="block"
              color="primary"
              size="large"
              (click)="handleStartUsing()"
              data-testid="start-using-button"
            >
              ✅ Zacznij korzystać z aplikacji
            </ion-button>
          </div>
        }
      </div>
    </ion-content>
  `,
  styleUrl: './add-car.page.scss',
})
export class AddCarPage {
  private readonly carService = inject(CarService);
  private readonly router = inject(Router);

  readonly newCarName = signal('');
  readonly newCarMileage = signal<number | undefined>(undefined);
  readonly newCarYear = signal<number | undefined>(undefined);
  readonly newCarVin = signal('');
  readonly vinCopied = signal(false);
  readonly pendingCars = signal<Car[]>([]);

  /** Wizard mode: shown when the garage is empty (first use). */
  readonly isWizardMode = computed(() => !this.carService.hasCars());

  constructor() {
    addIcons({ close, carSport, copyOutline });
  }

  /**
   * Add a car. In wizard mode, adds to the pending list.
   * In add mode, saves directly and navigates back.
   */
  async handleAddCar(): Promise<void> {
    const name = this.newCarName().trim();
    if (!name) return;

    const options = this.buildCarOptions();

    if (this.isWizardMode()) {
      // Wizard mode: add to pending list (save to storage + Firestore later)
      try {
        const car = await this.carService.addCar(name, options);
        this.pendingCars.update((cars) => [...cars, car]);
        this.resetForm();
      } catch (err) {
        console.error('Failed to add car in wizard:', err);
      }
    } else {
      // Add mode: save and navigate back
      try {
        const car = await this.carService.addCar(name, options);
        await this.carService.setActiveCar(car.id);
        this.router.navigate(['/dashboard']);
      } catch (err) {
        console.error('Failed to add car:', err);
      }
    }
  }

  /** Remove a car from the pending list. */
  async removePendingCar(id: string): Promise<void> {
    this.pendingCars.update((cars) => cars.filter((c) => c.id !== id));

    // Also remove from CarService storage
    try {
      await this.carService.deleteCar(id);
    } catch (err) {
      console.error('Failed to remove car:', err);
    }
  }

  /** Build the optional fields object for addCar. */
  private buildCarOptions(): {
    currentMileage?: number;
    year?: number;
    vin?: string;
  } {
    const options: {
      currentMileage?: number;
      year?: number;
      vin?: string;
    } = {};
    const mileage = this.newCarMileage();
    if (mileage !== undefined) options.currentMileage = mileage;
    const year = this.newCarYear();
    if (year !== undefined) options.year = year;
    const vin = this.newCarVin().trim();
    if (vin) options.vin = vin;
    return options;
  }

  /** Reset all form fields. */
  private resetForm(): void {
    this.newCarName.set('');
    this.newCarMileage.set(undefined);
    this.newCarYear.set(undefined);
    this.newCarVin.set('');
    this.vinCopied.set(false);
  }

  /** Copy VIN to clipboard and show "Skopiowano!" feedback. */
  async copyVin(): Promise<void> {
    const vin = this.newCarVin().trim();
    if (!vin) return;
    try {
      await navigator.clipboard.writeText(vin);
      this.vinCopied.set(true);
      setTimeout(() => this.vinCopied.set(false), 2000);
    } catch {
      // Clipboard API not available — silently ignore
    }
  }

  /**
   * Parse a string value from an ionInput event into a number or undefined.
   * Used in template to avoid referencing global `Number` which is unavailable at runtime.
   */
  parseIonNumber(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Start using the app. Sets the first car as active and navigates to dashboard.
   * This is only shown in wizard mode when at least one car has been added.
   *
   * covers: docs/specs/05-car-management.md#AC-3, AC-5
   */
  async handleStartUsing(): Promise<void> {
    const cars = this.pendingCars();
    if (cars.length === 0) return;

    // Set the first added car as active
    await this.carService.setActiveCar(cars[0].id);
    this.router.navigate(['/dashboard']);
  }
}