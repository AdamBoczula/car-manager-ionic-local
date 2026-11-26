// spec: docs/specs/05-car-management.md
// spec: docs/specs/refuel/03-receipt-ocr.md
// bugfix: docs/bugs/02-router-navigate-in-ionic.md
// bugfix: docs/bugs/05-decimal-input-comma-dot.md
import type { OnInit } from '@angular/core';
import { Component, inject, signal, computed, NgZone } from '@angular/core';
import { NavController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
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
  IonIcon,
  IonSpinner,
  IonFooter,
  IonToast,
  IonNote,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { camera } from 'ionicons/icons';
import { RefuelService } from '../../core/services/refuel.service';
import { CarService } from '../../core/services/car.service';
import { ReceiptOcrService } from '../../core/services/receipt-ocr.service';
import { RefuelDraftService } from '../../core/services/refuel-draft.service';
import type { RefuelDraft } from '../../core/models/refuel.model';
import { CarSwitcherComponent } from '../../shared/components/car-switcher/car-switcher.component';
import {
  formatDecimalInput,
  parseDecimal,
  handleDecimalKeyDown,
} from '../../core/utils/decimal-input.util';

@Component({
  selector: 'app-refuel-form',
  host: { class: 'ion-page' },
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
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
    IonIcon,
    IonSpinner,
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
        @if (receiptOcrService.isSupported()) {
          <div class="refuel-form__scan-bar">
            <ion-button
              type="button"
              expand="block"
              fill="outline"
              [disabled]="receiptOcrService.isScanning()"
              (click)="handleScanReceipt()"
              aria-label="Skanuj paragon za tankowanie"
              data-testid="scan-receipt-button"
            >
              @if (receiptOcrService.isScanning()) {
                <ion-spinner name="crescent" slot="start" />
                Skanowanie paragonu...
              } @else {
                <ion-icon name="camera" slot="start" />
                Skanuj paragon
              }
            </ion-button>
          </div>
        }
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
              type="text"
              inputmode="decimal"
              [value]="amountRaw()"
              (ionInput)="onAmountInput($any($event).detail.value)"
              (keydown)="onDecimalKeyDown($event)"
              placeholder="0,00"
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
              [value]="mileage() || ''"
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
              type="text"
              inputmode="decimal"
              [value]="litersRaw()"
              (ionInput)="onLitersInput($any($event).detail.value)"
              (keydown)="onDecimalKeyDown($event)"
              placeholder="0,00"
              aria-label="Ilość litrów (opcjonalnie)"
            />
          </ion-item>

          <!-- Paliwo premium -->
          <ion-item>
            <ion-label>Paliwo premium?</ion-label>
            <ion-toggle
              [checked]="isPremium()"
              (ionChange)="isPremium.set($any($event).detail.checked)"
              justify="space-between"
              aria-label="Paliwo premium?"
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
export class RefuelFormPage implements OnInit {
  // Public dependencies & state (member-ordering: public before private)
  readonly carService = inject(CarService);
  readonly receiptOcrService = inject(ReceiptOcrService);

  // Form fields — signals
  readonly date = signal(new Date().toISOString().split('T')[0]);
  readonly amountRaw = signal('');
  readonly litersRaw = signal('');
  readonly mileage = signal(0);
  readonly isPremium = signal(false);
  readonly isSkipped = signal(false);
  readonly skippedReason = signal('');

  // Parsed decimal values
  readonly amount = computed(() => parseDecimal(this.amountRaw()));
  readonly liters = computed(() => parseDecimal(this.litersRaw()));

  // Toast
  readonly toastOpen = signal(false);
  readonly toastMessage = signal('');
  readonly toastColor = signal<'success' | 'warning' | 'danger'>('success');

  // Validation errors (computed)
  readonly amountError = computed(() =>
    this.amount() <= 0 ? 'Kwota musi być większa od 0' : null,
  );

  readonly mileageError = computed(() =>
    this.mileage() <= 0 ? 'Przebieg musi być większy od 0' : null,
  );

  readonly isFormValid = computed(() => !this.amountError() && !this.mileageError());

  // Private dependencies
  private readonly refuelService = inject(RefuelService);
  private readonly refuelDraftService = inject(RefuelDraftService);
  private readonly navController = inject(NavController);
  private readonly zone = inject(NgZone);

  constructor() {
    addIcons({ camera });
  }

  ngOnInit(): void {
    this.applyPendingDraft();
  }

  ionViewWillEnter(): void {
    this.applyPendingDraft();
  }

  async handleScanReceipt(): Promise<void> {
    const outcome = await this.receiptOcrService.scanReceipt();
    if (outcome.status === 'cancelled') return;

    if (outcome.status === 'empty') {
      this.showToast(outcome.message, 'warning');
      return;
    }

    if (outcome.status === 'error') {
      this.showToast(outcome.message, 'danger');
      return;
    }

    this.applyDraft(outcome.result.draft);
    this.showToast(outcome.message, outcome.status === 'success' ? 'success' : 'warning');
  }

  onAmountInput(value: string | null | undefined): void {
    this.amountRaw.set(formatDecimalInput(value, 2));
  }

  onLitersInput(value: string | null | undefined): void {
    this.litersRaw.set(formatDecimalInput(value, 2));
  }

  onDecimalKeyDown(event: KeyboardEvent): void {
    handleDecimalKeyDown(event);
  }

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
        isPremium: this.isPremium(),
        isSkipped: this.isSkipped(),
        skippedReason: this.isSkipped() ? this.skippedReason().trim() || undefined : undefined,
      });

      this.showToast('Tankowanie zapisane!', 'success');
      this.zone.run(() => {
        void this.navController.navigateForward('/dashboard');
      });
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

  private applyPendingDraft(): void {
    const pending = this.refuelDraftService.consumeDraft();
    if (!pending) return;

    this.applyDraft(pending.draft);
    if (pending.message) {
      this.showToast(pending.message, pending.toastColor ?? 'success');
    }
  }

  private applyDraft(draft: RefuelDraft): void {
    if (draft.date) {
      this.date.set(draft.date);
    }
    if (draft.amount != null && draft.amount > 0) {
      this.amountRaw.set(formatDecimalInput(draft.amount.toFixed(2), 2));
    }
    if (draft.liters != null && draft.liters > 0) {
      this.litersRaw.set(formatDecimalInput(draft.liters.toFixed(2), 2));
    }
    if (draft.isPremium != null) {
      this.isPremium.set(draft.isPremium);
    }
  }

  private showToast(message: string, color: 'success' | 'warning' | 'danger'): void {
    this.toastMessage.set(message);
    this.toastColor.set(color);
    this.toastOpen.set(true);
  }
}
