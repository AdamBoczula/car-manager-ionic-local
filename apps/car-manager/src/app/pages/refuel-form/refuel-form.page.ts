// spec: docs/specs/05-car-management.md
// bugfix: docs/bugs/02-router-navigate-in-ionic.md
import { Component, inject, signal, computed, NgZone } from '@angular/core';
import { NavController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonToggle,
  IonCheckbox,
  IonTextarea,
  IonLabel,
  IonButton,
  IonFooter,
  IonToast,
  IonNote,
} from '@ionic/angular';
import { RefuelService } from '../../core/services/refuel.service';
import { CarService } from '../../core/services/car.service';
import { CarSwitcherComponent } from '../../shared/components/car-switcher/car-switcher.component';

@Component({
  selector: 'app-refuel-form',
  host: { class: 'ion-page' },
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonToggle,
    IonCheckbox,
    IonTextarea,
    IonLabel,
    IonButton,
    IonFooter,
    IonToast,
    IonNote,
    CarSwitcherComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/refuel-list" />
        </ion-buttons>
        <app-car-switcher
          [cars]="carService.cars()"
          [activeCar]="carService.activeCar()"
          (carSelected)="carService.setActiveCar($event)"
          (carAdded)="handleCarAdded($event)"
        />
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <form class="refuel-form" (submit)="handleSubmit($event)">
        <ion-list>
          <!-- Data -->
          <ion-item>
            <ion-label position="stacked">Data</ion-label>
            <ion-input
              type="date"
              [value]="date()"
              (ionInput)="date.set($any($event).detail.value)"
              aria-label="Data tankowania"
            />
          </ion-item>

          <!-- Kwota -->
          <ion-item>
            <ion-label position="stacked">Kwota (PLN)</ion-label>
            <ion-input
              type="number"
              [value]="amount()"
              (ionInput)="amount.set($any($event).detail.value ? +$any($event).detail.value : 0)"
              placeholder="0.00"
              aria-label="Kwota w PLN"
            />
          </ion-item>
          @if (amountError()) {
            <ion-note color="danger" class="refuel-form__error-note">
              {{ amountError() }}
            </ion-note>
          }

          <!-- Przebieg -->
          <ion-item>
            <ion-label position="stacked">Przebieg (km)</ion-label>
            <ion-input
              type="number"
              [value]="mileage()"
              (ionInput)="mileage.set($any($event).detail.value ? +$any($event).detail.value : 0)"
              placeholder="0"
              aria-label="Przebieg w kilometrach"
            />
          </ion-item>
          @if (mileageError()) {
            <ion-note color="danger" class="refuel-form__error-note">
              {{ mileageError() }}
            </ion-note>
          }

          <!-- Ilość litrów -->
          <ion-item>
            <ion-label position="stacked">Ilość litrów (opcjonalnie)</ion-label>
            <ion-input
              type="number"
              [value]="liters()"
              (ionInput)="liters.set($any($event).detail.value ? +$any($event).detail.value : 0)"
              placeholder="0.00"
              aria-label="Ilość litrów (opcjonalnie)"
            />
          </ion-item>

          <!-- Verva -->
          <ion-item>
            <ion-label>Verva?</ion-label>
            <ion-toggle
              [checked]="isVerva()"
              (ionChange)="isVerva.set($any($event).detail.checked)"
              justify="space-between"
              aria-label="Verva?"
            />
          </ion-item>

          <!-- Pomiń wpis -->
          <ion-item>
            <ion-checkbox
              [checked]="isSkipped()"
              (ionChange)="isSkipped.set($any($event).detail.checked)"
              justify="start"
            >
              Pomiń wpis
            </ion-checkbox>
          </ion-item>

          <!-- Powód pominięcia -->
          @if (isSkipped()) {
            <ion-item class="refuel-form__textarea-item">
              <ion-label position="stacked">Powód pominięcia</ion-label>
              <ion-textarea
                [value]="skippedReason()"
                (ionInput)="skippedReason.set($any($event).detail.value ?? '')"
                placeholder="Np. ktoś inny zatankował"
                rows="3"
                aria-label="Powód pominięcia"
              />
            </ion-item>
          }
        </ion-list>
      </form>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-button
          expand="block"
          [disabled]="!isFormValid()"
          (click)="handleSubmit()"
          data-testid="submit-refuel-button"
        >
          Zapisz tankowanie
        </ion-button>
      </ion-toolbar>
    </ion-footer>

    <ion-toast
      [isOpen]="toastOpen()"
      [message]="toastMessage()"
      [color]="toastColor()"
      [duration]="3000"
      (didDismiss)="toastOpen.set(false)"
    />
  `,
  styleUrl: './refuel-form.page.scss',
})
export class RefuelFormPage {
  private readonly refuelService = inject(RefuelService);
  readonly carService = inject(CarService);
  private readonly navController = inject(NavController);
  private readonly zone = inject(NgZone);

  // Form fields — signals
  readonly date = signal(new Date().toISOString().split('T')[0]);
  readonly amount = signal(0);
  readonly mileage = signal(0);
  readonly liters = signal(0);
  readonly isVerva = signal(false);
  readonly isSkipped = signal(false);
  readonly skippedReason = signal('');

  // Toast
  readonly toastOpen = signal(false);
  readonly toastMessage = signal('');
  readonly toastColor = signal<'success' | 'danger'>('success');

  // Validation errors (computed)
  readonly amountError = computed(() =>
    this.amount() <= 0 ? 'Kwota musi być większa od 0' : null
  );

  readonly mileageError = computed(() =>
    this.mileage() <= 0 ? 'Przebieg musi być większy od 0' : null
  );

  readonly isFormValid = computed(
    () => !this.amountError() && !this.mileageError()
  );

  async handleSubmit(event?: Event): Promise<void> {
    event?.preventDefault();

    if (!this.isFormValid()) return;

    const carId = this.carService.activeCarId();
    if (!carId) {
      this.showToast('Brak aktywnego auta. Dodaj auto w kreatorze.', 'danger');
      return;
    }

    try {
      await this.refuelService.add({
        carId,
        date: this.date(),
        amount: this.amount(),
        mileage: this.mileage(),
        liters: this.liters() > 0 ? this.liters() : undefined,
        isVerva: this.isVerva(),
        isSkipped: this.isSkipped(),
        skippedReason: this.isSkipped()
          ? this.skippedReason().trim() || undefined
          : undefined,
      });

      this.showToast('Tankowanie zapisane!', 'success');
      this.zone.run(() => this.navController.navigateForward('/dashboard'));
    } catch (err) {
      console.error('Failed to save refuel:', err);
      this.showToast('Nie udało się zapisać tankowania.', 'danger');
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
      console.error('Failed to add car from refuel form:', err);
    }
  }

  private showToast(message: string, color: 'success' | 'danger'): void {
    this.toastMessage.set(message);
    this.toastColor.set(color);
    this.toastOpen.set(true);
  }
}