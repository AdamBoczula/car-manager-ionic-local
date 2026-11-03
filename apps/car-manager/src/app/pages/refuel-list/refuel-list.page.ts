// spec: docs/specs/05-car-management.md
import { Component, inject, OnInit, OnDestroy, computed, effect, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonBackButton,
  IonContent,
  IonList,
  IonItem,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonSpinner,
  IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, trash } from 'ionicons/icons';
import { RefuelService } from '../../core/services/refuel.service';
import { CarService } from '../../core/services/car.service';
import { CarSwitcherComponent } from '../../shared/components/car-switcher/car-switcher.component';
import { formatPln } from '../../core/utils/consumption.util';

@Component({
  selector: 'app-refuel-list',
  standalone: true,
  imports: [
    DatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonLabel,
    IonSpinner,
    IonText,
    CarSwitcherComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/dashboard" />
        </ion-buttons>
        <app-car-switcher
          [cars]="carService.cars()"
          [activeCar]="carService.activeCar()"
          (carSelected)="carService.setActiveCar($event)"
          (carAdded)="handleCarAdded($event)"
        />
        <ion-buttons slot="end">
          <ion-button (click)="navigateToForm()" aria-label="Dodaj tankowanie" data-testid="add-refuel-button">
            <ion-icon name="add" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (isLoading()) {
        <div class="refuel-list__loading" role="status">
          <ion-spinner name="crescent" />
          <ion-text color="medium">Ładowanie tankowań...</ion-text>
        </div>
      } @else if (!hasRefuels()) {
        <div class="refuel-list__empty" role="status">
          <ion-icon name="car-sport-outline" class="refuel-list__empty-icon" />
          <ion-text color="medium">
            <p>Brak tankowań – dodaj pierwsze!</p>
          </ion-text>
        </div>
      } @else {
        <ion-list>
          @for (refuel of refuels(); track refuel.id) {
            <ion-item-sliding>
              <ion-item [button]="true" (click)="navigateToForm()">
                <ion-label>
                  <h3>{{ refuel.date | date:'dd.MM.yyyy' }}</h3>
                  <p>{{ formatAmount(refuel.amount) }}</p>
                  <p>{{ refuel.mileage }} km</p>
                  @if (refuel.liters != null) {
                    <p>{{ refuel.liters }} L</p>
                  }
                  @if (refuel.consumption != null) {
                    <p>Spalanie: {{ refuel.consumption }} L/100km</p>
                  }
                  @if (refuel.isVerva) {
                    <p class="refuel-list__verva">Verva</p>
                  }
                </ion-label>
              </ion-item>

              <ion-item-options side="end">
                <ion-item-option
                  color="danger"
                  (click)="deleteRefuel(refuel.id)"
                  aria-label="Usuń tankowanie"
                  data-testid="delete-refuel-button"
                >
                  <ion-icon name="trash" slot="icon-only" />
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styleUrl: './refuel-list.page.scss',
})
export class RefuelListPage implements OnInit, OnDestroy {
  private readonly refuelService = inject(RefuelService);
  readonly carService = inject(CarService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly refuels = this.refuelService.refuels;
  readonly isLoading = this.refuelService.isLoading;

  readonly hasRefuels = computed(() => this.refuels().length > 0);

  constructor() {
    addIcons({ add, trash });

    // React to active car changes
    const carListener = effect(() => {
      const carId = this.carService.activeCarId();
      if (carId) {
        this.refuelService.startListening(carId);
      }
    });

    this.destroyRef.onDestroy(() => {
      carListener.destroy();
    });
  }

  ngOnInit(): void {
    // Initial load — if active car already set, start listening
    const carId = this.carService.activeCarId();
    if (carId) {
      this.refuelService.startListening(carId);
    }
  }

  ngOnDestroy(): void {
    this.refuelService.stopListening();
  }

  navigateToForm(): void {
    this.router.navigate(['/refuel-form']);
  }

  formatAmount(amount: number): string {
    return formatPln(amount);
  }

  async deleteRefuel(id: string): Promise<void> {
    const carId = this.carService.activeCarId();
    if (carId) {
      this.refuelService.delete(id, carId);
    }
  }

  /** Handle a new car added from the car-switcher modal. */
  async handleCarAdded(data: {
    name: string;
    currentMileage?: number;
    year?: number;
    vin?: string;
  }): Promise<void> {
    try {
      const car = await this.carService.addCar(data.name, {
        currentMileage: data.currentMileage,
        year: data.year,
        vin: data.vin,
      });
      await this.carService.setActiveCar(car.id);
    } catch (err) {
      console.error('Failed to add car from refuel list:', err);
    }
  }
}