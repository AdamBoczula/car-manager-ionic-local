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
  IonTextarea,
  IonLabel,
  IonButton,
  IonIcon,
  IonToast,
  IonFooter,
  IonNote,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mic } from 'ionicons/icons';
import { RepairService } from '../../core/services/repair.service';
import { CarService } from '../../core/services/car.service';
import { SpeechService } from '../../core/services/speech.service';
import { CarSwitcherComponent } from '../../shared/components/car-switcher/car-switcher.component';

addIcons({ mic });

@Component({
  selector: 'app-repair-form',
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
    IonTextarea,
    IonLabel,
    IonButton,
    IonIcon,
    IonToast,
    IonFooter,
    IonNote,
    CarSwitcherComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/repair-list" />
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
      <form class="repair-form" (submit)="handleSubmit($event)">
        <ion-list>
          <!-- Data -->
          <ion-item>
            <ion-label position="stacked">Data</ion-label>
            <ion-input
              type="date"
              [value]="date()"
              (ionInput)="date.set($any($event).detail.value)"
              aria-label="Data naprawy"
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
            <ion-note color="danger" class="repair-form__error-note">
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
            <ion-note color="danger" class="repair-form__error-note">
              {{ mileageError() }}
            </ion-note>
          }

          <!-- Miejsce -->
          <ion-item>
            <ion-label position="stacked">Miejsce</ion-label>
            <ion-input
              [value]="location()"
              (ionInput)="location.set($any($event).detail.value ?? '')"
              placeholder="np. AutoSerwis Kraków"
              aria-label="Miejsce naprawy"
            />
          </ion-item>
          @if (locationError()) {
            <ion-note color="danger" class="repair-form__error-note">
              {{ locationError() }}
            </ion-note>
          }

          <!-- Opis prac -->
          <ion-item class="repair-form__textarea-item">
            <ion-label position="stacked">
              Opis prac
              <ion-button
                fill="clear"
                size="small"
                (click)="startSpeechRecognition()"
                [disabled]="!speechService.isSupported() || speechService.isListening()"
                aria-label="Dyktuj opis prac"
                data-testid="mic-button"
                class="repair-form__mic-button"
              >
                <ion-icon
                  [name]="speechService.isListening() ? 'mic' : 'mic-outline'"
                  [color]="speechService.isListening() ? 'danger' : 'primary'"
                />
              </ion-button>
            </ion-label>
            <ion-textarea
              [value]="description()"
              (ionInput)="description.set($any($event).detail.value ?? '')"
              placeholder="Opisz wykonane prace..."
              rows="6"
              aria-label="Opis wykonanych prac"
            />
          </ion-item>
          @if (descriptionError()) {
            <ion-note color="danger" class="repair-form__error-note">
              {{ descriptionError() }}
            </ion-note>
          }

          <!-- Komentarz o wykonawcy -->
          <ion-item class="repair-form__textarea-item">
            <ion-label position="stacked">Komentarz o wykonawcy</ion-label>
            <ion-textarea
              [value]="mechanicNote()"
              (ionInput)="mechanicNote.set($any($event).detail.value ?? '')"
              placeholder="Opcjonalny komentarz..."
              rows="4"
              aria-label="Komentarz o wykonawcy"
            />
          </ion-item>
        </ion-list>
      </form>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-button
          expand="block"
          [disabled]="!isFormValid()"
          (click)="handleSubmit()"
          data-testid="submit-repair-button"
        >
          Zapisz naprawę
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
  styleUrl: './repair-form.page.scss',
})
export class RepairFormPage {
  private readonly repairService = inject(RepairService);
  readonly carService = inject(CarService);
  private readonly navController = inject(NavController);
  private readonly zone = inject(NgZone);
  readonly speechService = inject(SpeechService);

  // Form fields
  readonly date = signal(new Date().toISOString().split('T')[0]);
  readonly amount = signal(0);
  readonly mileage = signal(0);
  readonly location = signal('');
  readonly description = signal('');
  readonly mechanicNote = signal('');

  // Toast
  readonly toastOpen = signal(false);
  readonly toastMessage = signal('');
  readonly toastColor = signal<'success' | 'danger'>('success');

  // Validation errors (computed)
  readonly amountError = computed(() =>
    this.amount() <= 0 ? 'Kwota musi być większa od 0' : null,
  );

  readonly mileageError = computed(() =>
    this.mileage() <= 0 ? 'Przebieg musi być większy od 0' : null,
  );

  readonly locationError = computed(() =>
    this.location().trim() === '' ? 'Miejsce jest wymagane' : null,
  );

  readonly descriptionError = computed(() =>
    this.description().trim() === '' ? 'Opis prac jest wymagany' : null,
  );

  readonly isFormValid = computed(
    () =>
      !this.amountError() &&
      !this.mileageError() &&
      !this.locationError() &&
      !this.descriptionError(),
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
      await this.repairService.add({
        carId,
        date: this.date(),
        amount: this.amount(),
        mileage: this.mileage(),
        location: this.location().trim(),
        description: this.description().trim(),
        mechanicNote: this.mechanicNote().trim(),
      });

      this.showToast('Naprawa zapisana!', 'success');
      this.zone.run(() => this.navController.navigateForward('/dashboard'));
    } catch (err) {
      console.error('Failed to save repair:', err);
      this.showToast('Nie udało się zapisać naprawy.', 'danger');
    }
  }

  startSpeechRecognition(): void {
    if (!this.speechService.isSupported() || this.speechService.isListening()) return;

    this.speechService.startListening().subscribe({
      next: (transcript) => {
        const current = this.description();
        const separator = current.trim() ? ' ' : '';
        this.description.set(current + separator + transcript);
      },
      error: (err) => {
        console.warn('Speech recognition error:', err);
      },
    });
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
      console.error('Failed to add car from repair form:', err);
    }
  }

  private showToast(message: string, color: 'success' | 'danger'): void {
    this.toastMessage.set(message);
    this.toastColor.set(color);
    this.toastOpen.set(true);
  }
}
