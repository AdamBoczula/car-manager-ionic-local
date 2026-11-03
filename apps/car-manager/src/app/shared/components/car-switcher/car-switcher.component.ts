// spec: docs/specs/05-car-management.md
import { Component, input, output, signal } from '@angular/core';
import {
  IonButton,
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonInput,
  IonFooter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDown, checkmark, add, copyOutline } from 'ionicons/icons';
import type { Car } from '../../../core/models/car.model';

@Component({
  selector: 'app-car-switcher',
  standalone: true,
  imports: [
    IonButton,
    IonIcon,
    IonPopover,
    IonList,
    IonItem,
    IonLabel,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonInput,
    IonFooter,
  ],
  template: `
    <ion-button
      (click)="openPopover($event)"
      class="car-switcher__button"
      fill="clear"
      aria-label="Wybierz auto"
      data-testid="car-switcher-button"
    >
      <span class="car-switcher__name">{{ activeCarName() }}</span>
      <ion-icon name="chevron-down" slot="end" />
    </ion-button>

    <!-- Car selection popover -->
    <ion-popover
      [isOpen]="isPopoverOpen"
      (ionPopoverDidDismiss)="popoverDismissed()"
      [dismissOnSelect]="true"
      class="car-switcher__popover"
    >
      <ng-template>
        <ion-list>
          @for (car of cars(); track car.id) {
            <ion-item
              [button]="true"
              [lines]="'none'"
              (click)="selectCar(car.id)"
              data-testid="car-option"
            >
              <ion-label>{{ car.name }}</ion-label>
              @if (car.id === activeCar()?.id) {
                <ion-icon name="checkmark" slot="end" color="primary" aria-label="Aktywne auto" />
              }
            </ion-item>
          }
        </ion-list>

        <div class="car-switcher__divider"></div>

        <ion-item
          [button]="true"
          [lines]="'none'"
          (click)="openAddModal()"
          data-testid="add-car-option"
        >
          <ion-icon name="add" slot="start" color="primary" />
          <ion-label color="primary">Dodaj auto</ion-label>
        </ion-item>
      </ng-template>
    </ion-popover>

    <!-- Add car modal -->
    <ion-modal
      [isOpen]="isModalOpen"
      (ionModalDidDismiss)="modalDismissed()"
      [initialBreakpoint]="0.55"
      [breakpoints]="[0, 0.55]"
    >
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Dodaj nowe auto</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="cancelModal()" aria-label="Anuluj">
                Anuluj
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-input
            label="Nazwa auta"
            labelPlacement="stacked"
            placeholder="np. Toyota Corolla"
            [maxlength]="50"
            [value]="newCarName()"
            (ionInput)="setNewCarName($any($event).detail.value)"
            aria-label="Nazwa auta"
            data-testid="new-car-name-input"
          />
          <ion-input
            label="Przebieg (km)"
            labelPlacement="stacked"
            type="number"
            placeholder="np. 123000"
            [value]="newCarMileage() ?? ''"
            (ionInput)="setNewCarMileage($any($event).detail.value)"
            class="car-switcher__field"
            aria-label="Przebieg (km)"
            data-testid="new-car-mileage-input"
          />
          <ion-input
            label="Rocznik"
            labelPlacement="stacked"
            type="number"
            placeholder="np. 2020"
            [value]="newCarYear() ?? ''"
            (ionInput)="setNewCarYear($any($event).detail.value)"
            class="car-switcher__field"
            aria-label="Rocznik"
            data-testid="new-car-year-input"
          />
          <div class="car-switcher__field--vin">
            <ion-input
              label="Numer VIN"
              labelPlacement="stacked"
              type="text"
              placeholder="np. WBA..."
              [value]="newCarVin()"
              (ionInput)="setNewCarVin($any($event).detail.value)"
              class="car-switcher__vin-input"
              aria-label="Numer VIN"
              data-testid="new-car-vin-input"
            />
            <ion-button
              fill="clear"
              size="small"
              [disabled]="!newCarVin().trim()"
              (click)="copyVin()"
              class="car-switcher__vin-copy-btn"
              aria-label="Kopiuj VIN"
              data-testid="copy-vin-button"
            >
              <ion-icon name="copy-outline" slot="icon-only" />
            </ion-button>
            @if (vinCopied()) {
              <span class="car-switcher__vin-copied" role="status">Skopiowano!</span>
            }
          </div>
        </ion-content>
        <ion-footer>
          <ion-toolbar>
            <ion-button
              expand="block"
              [disabled]="!newCarName().trim()"
              (click)="addCar()"
              data-testid="add-car-submit"
            >
              Dodaj auto
            </ion-button>
          </ion-toolbar>
        </ion-footer>
      </ng-template>
    </ion-modal>
  `,
  styleUrl: './car-switcher.component.scss',
})
export class CarSwitcherComponent {
  /** All cars in the garage. */
  readonly cars = input.required<Car[]>();

  /** The currently active car (or null if none). */
  readonly activeCar = input<Car | null>(null);

  /** Emitted when user selects a car from the popover. */
  readonly carSelected = output<string>();

  /** Emitted when user adds a new car via the modal. */
  readonly carAdded = output<{
    name: string;
    currentMileage?: number;
    year?: number;
    vin?: string;
  }>();

  // Internal UI state
  readonly isPopoverOpen = signal(false);
  readonly isModalOpen = signal(false);
  readonly newCarName = signal('');
  readonly newCarMileage = signal<number | undefined>(undefined);
  readonly newCarYear = signal<number | undefined>(undefined);
  readonly newCarVin = signal('');
  readonly vinCopied = signal(false);

  constructor() {
    addIcons({ chevronDown, checkmark, add, copyOutline });
  }

  /** Display name for the active car in the header button. */
  activeCarName(): string {
    return this.activeCar()?.name ?? 'Brak aut';
  }

  /** Open the car selection popover. */
  openPopover(_event: Event): void {
    this.isPopoverOpen.set(true);
  }

  /** Handles popover dismissal. */
  popoverDismissed(): void {
    this.isPopoverOpen.set(false);
  }

  /** Select a car and emit the event. */
  selectCar(id: string): void {
    this.isPopoverOpen.set(false);
    this.carSelected.emit(id);
  }

  /** Open the add car modal. */
  openAddModal(): void {
    this.isPopoverOpen.set(false);
    this.isModalOpen.set(true);
    this.newCarName.set('');
    this.newCarMileage.set(undefined);
    this.newCarYear.set(undefined);
    this.newCarVin.set('');
    this.vinCopied.set(false);
  }

  /** Cancel the add car modal. */
  cancelModal(): void {
    this.isModalOpen.set(false);
    this.resetNewCarForm();
  }

  /** Handles modal dismissal (backdrop). */
  modalDismissed(): void {
    this.isModalOpen.set(false);
    this.resetNewCarForm();
  }

  /** Set new car name from ionInput event. */
  setNewCarName(value: string | undefined): void {
    this.newCarName.set(value ?? '');
  }

  /** Set new car mileage from ionInput event. */
  setNewCarMileage(value: string | undefined): void {
    const num = value ? Number(value) : undefined;
    this.newCarMileage.set(num !== undefined && !isNaN(num) ? num : undefined);
  }

  /** Set new car year from ionInput event. */
  setNewCarYear(value: string | undefined): void {
    const num = value ? Number(value) : undefined;
    this.newCarYear.set(num !== undefined && !isNaN(num) ? num : undefined);
  }

  /** Set new car VIN from ionInput event. */
  setNewCarVin(value: string | undefined): void {
    this.newCarVin.set(value ?? '');
  }

  /** Add a new car from the modal input. */
  addCar(): void {
    const name = this.newCarName().trim();
    if (!name) return;

    const payload: {
      name: string;
      currentMileage?: number;
      year?: number;
      vin?: string;
    } = { name };
    const mileage = this.newCarMileage();
    if (mileage !== undefined) payload.currentMileage = mileage;
    const year = this.newCarYear();
    if (year !== undefined) payload.year = year;
    const vin = this.newCarVin().trim();
    if (vin) payload.vin = vin;

    this.carAdded.emit(payload);
    this.isModalOpen.set(false);
    this.resetNewCarForm();
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

  /** Reset all form fields in the modal. */
  private resetNewCarForm(): void {
    this.newCarName.set('');
    this.newCarMileage.set(undefined);
    this.newCarYear.set(undefined);
    this.newCarVin.set('');
    this.vinCopied.set(false);
  }
}