// spec: docs/specs/05-car-management.md
// bugfix: docs/bugs/03-list-car-switcher-and-repair-back.md
// bugfix: docs/bugs/06-sheet-modal-offscreen-submit.md
// bugfix: docs/bugs/10-native-keyboard-integration.md
import { Component, inject, input, output, signal, viewChild, NgZone } from '@angular/core';
import {
  AlertController,
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
  IonNote,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDown, checkmark, add, copyOutline, create, trash } from 'ionicons/icons';
import type { Car } from '../../../core/models/car.model';
import { KeyboardService } from '../../../core/services/keyboard.service';

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
    IonNote,
  ],
  template: `
    <ion-button
      class="car-switcher__button"
      fill="clear"
      (click)="openPopover($event)"
      aria-label="Wybierz auto"
      data-testid="car-switcher-button"
    >
      <span class="car-switcher__name">{{ activeCarName() }}</span>
      <ion-icon name="chevron-down" slot="end" />
    </ion-button>

    <!-- Car selection popover -->
    <ion-popover
      [isOpen]="isPopoverOpen()"
      [event]="popoverEvent()"
      (ionPopoverDidDismiss)="popoverDismissed()"
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
              <ion-button
                slot="end"
                fill="clear"
                (click)="openEditModal(car, $event); $event.stopPropagation()"
                aria-label="Edytuj auto"
                data-testid="edit-car-button"
              >
                <ion-icon name="create" slot="icon-only" />
              </ion-button>
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
    <!-- bugfix: docs/bugs/10-native-keyboard-integration.md
         Rendered as a self-sizing card modal, not a bottom sheet: a sheet keeps
         ion-content at the full wrapper height and only translates the wrapper,
         so it either leaves dead space under the submit button or pushes the
         button off-screen. The card is exactly as tall as the form, and the
         native keyboard resize (adjustResize + resizeOnFullScreen) keeps it
         above the keyboard. -->
    <ion-modal
      #addCarModal
      [isOpen]="isModalOpen()"
      (ionModalDidDismiss)="modalDismissed()"
      aria-label="Dodaj nowe auto"
      class="car-switcher__card-modal"
    >
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Dodaj nowe auto</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="cancelModal()" aria-label="Anuluj">Anuluj</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="car-switcher__modal-content">
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

          <ion-button
            expand="block"
            [disabled]="!newCarName().trim()"
            (click)="addCar()"
            class="car-switcher__submit"
            data-testid="add-car-submit"
          >
            Dodaj auto
          </ion-button>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- Edit car modal -->
    <!-- bugfix: docs/bugs/10-native-keyboard-integration.md — same self-sizing
         card layout as the add-car modal. -->
    <ion-modal
      #editCarModal
      [isOpen]="isEditModalOpen()"
      (ionModalDidDismiss)="editModalDismissed()"
      aria-label="Edytuj auto"
      class="car-switcher__card-modal"
    >
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Edytuj auto</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="cancelEditModal()" aria-label="Zamknij">Zamknij</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="car-switcher__modal-content">
          <ion-input
            label="Nazwa auta"
            labelPlacement="stacked"
            placeholder="np. Toyota Corolla"
            [maxlength]="50"
            [value]="editCarName()"
            (ionInput)="editCarName.set($any($event).detail.value ?? '')"
            aria-label="Nazwa auta"
            data-testid="edit-car-name-input"
          />
          <ion-input
            label="Przebieg (km)"
            labelPlacement="stacked"
            type="number"
            placeholder="np. 123000"
            [value]="editCarMileage() ?? ''"
            (ionInput)="editCarMileage.set(toNumber($any($event).detail.value))"
            class="car-switcher__field"
            aria-label="Przebieg (km)"
            data-testid="edit-car-mileage-input"
          />
          <ion-input
            label="Rocznik"
            labelPlacement="stacked"
            type="number"
            placeholder="np. 2020"
            [value]="editCarYear() ?? ''"
            (ionInput)="editCarYear.set(toNumber($any($event).detail.value))"
            class="car-switcher__field"
            aria-label="Rocznik"
            data-testid="edit-car-year-input"
          />
          <ion-input
            label="Numer VIN"
            labelPlacement="stacked"
            type="text"
            placeholder="np. WBA..."
            [value]="editCarVin()"
            (ionInput)="editCarVin.set($any($event).detail.value ?? '')"
            class="car-switcher__field"
            aria-label="Numer VIN"
            data-testid="edit-car-vin-input"
          />

          <div class="car-switcher__form-actions">
            <ion-button
              fill="clear"
              color="danger"
              size="small"
              (click)="deleteEditingCar()"
              data-testid="delete-car-button"
            >
              <ion-icon name="trash" slot="start" />
              Usuń auto
            </ion-button>
            <ion-button
              [disabled]="!editCarName().trim()"
              (click)="saveEdit()"
              data-testid="save-edit-button"
            >
              Zapisz
            </ion-button>
          </div>
        </ion-content>
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

  /** Emitted when user updates a car via the edit modal. */
  readonly carUpdated = output<{
    id: string;
    name: string;
    currentMileage?: number;
    year?: number;
    vin?: string;
  }>();

  /** Emitted when user deletes a car via the edit modal. */
  readonly carDeleted = output<string>();

  // ── Popover state ──

  readonly isPopoverOpen = signal(false);
  readonly popoverEvent = signal<Event | undefined>(undefined);
  private readonly popover = viewChild(IonPopover);

  private readonly alertController = inject(AlertController);
  private readonly ngZone = inject(NgZone);
  private readonly keyboard = inject(KeyboardService);

  // ── Add car modal state ──

  readonly isModalOpen = signal(false);
  readonly newCarName = signal('');
  readonly newCarMileage = signal<number | undefined>(undefined);
  readonly newCarYear = signal<number | undefined>(undefined);
  readonly newCarVin = signal('');
  readonly vinCopied = signal(false);

  // ── Edit car modal state ──

  readonly isEditModalOpen = signal(false);
  readonly editingCarId = signal<string | null>(null);
  readonly editCarName = signal('');
  readonly editCarMileage = signal<number | undefined>(undefined);
  readonly editCarYear = signal<number | undefined>(undefined);
  readonly editCarVin = signal('');

  constructor() {
    addIcons({ chevronDown, checkmark, add, copyOutline, create, trash });
  }

  /** Display name for the active car in the header button. */
  activeCarName(): string {
    return this.activeCar()?.name ?? 'Brak aut';
  }

  // ── Popover ──

  /** Open the car selection popover. */
  openPopover(event: Event): void {
    this.popoverEvent.set(event);
    this.isPopoverOpen.set(true);
  }

  /** Handles popover dismissal. */
  popoverDismissed(): void {
    this.isPopoverOpen.set(false);
    this.popoverEvent.set(undefined);
  }

  /** Select a car — shows confirmation alert for different car, emits immediately for same car. */
  // bugfix: docs/bugs/01-car-switcher-confirmation-redirect.md
  async selectCar(id: string): Promise<void> {
    const activeCar = this.activeCar();

    // Same car — close the selector without emitting or reloading the page.
    if (activeCar?.id === id) {
      await this.dismissPopover();
      return;
    }

    // Different car — dismiss popover first, then show confirmation alert
    await this.dismissPopover();

    const selectedCar = this.cars().find((c) => c.id === id);
    const carName = selectedCar?.name ?? 'wybrane auto';

    const alert = await this.alertController.create({
      header: 'Zmień auto',
      message: `Czy na pewno chcesz zmienić auto na ${carName}?`,
      buttons: [
        {
          text: 'Nie',
          role: 'cancel',
        },
        {
          text: 'Tak',
          role: 'confirm',
          handler: () => {
            this.ngZone.run(() => {
              this.carSelected.emit(id);
            });
          },
        },
      ],
    });

    await alert.present();
  }

  // ── Add car modal ──

  /** Open the add car modal. */
  openAddModal(): void {
    this.closePopover();
    this.isModalOpen.set(true);
    this.resetNewCarForm();
  }

  /**
   * Dismiss the native keyboard.
   *
   * bugfix: docs/bugs/10-native-keyboard-integration.md
   *
   * Called from the `ionModalDidDismiss` handlers, which fire on every close
   * path — Anuluj / Zamknij, a backdrop tap, save and delete — so the keyboard
   * never stays on screen above the dashboard. No-op on web, where closing the
   * dialog already blurs the field.
   */
  async dismissKeyboard(): Promise<void> {
    await this.keyboard.hide();
  }

  /** Cancel the add car modal. */
  cancelModal(): void {
    this.isModalOpen.set(false);
    this.resetNewCarForm();
  }

  /** Handles modal dismissal (backdrop, or after a successful save). */
  modalDismissed(): void {
    this.isModalOpen.set(false);
    this.resetNewCarForm();
    void this.dismissKeyboard();
  }

  /** Set new car name from ionInput event. */
  setNewCarName(value: string | undefined): void {
    this.newCarName.set(value ?? '');
  }

  /** Set new car mileage from ionInput event. */
  setNewCarMileage(value: string | undefined): void {
    this.newCarMileage.set(this.toNumber(value));
  }

  /** Set new car year from ionInput event. */
  setNewCarYear(value: string | undefined): void {
    this.newCarYear.set(this.toNumber(value));
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

  // ── Edit car modal ──

  /** Open the edit modal, pre-filled with the selected car's data. */
  openEditModal(car: Car, event: Event): void {
    event.stopPropagation();
    this.editingCarId.set(car.id);
    this.editCarName.set(car.name);
    this.editCarMileage.set(car.currentMileage);
    this.editCarYear.set(car.year);
    this.editCarVin.set(car.vin ?? '');
    this.isEditModalOpen.set(true);
  }

  /** Cancel the edit modal (no save). */
  cancelEditModal(): void {
    this.isEditModalOpen.set(false);
    this.resetEditForm();
  }

  /** Handles edit modal dismissal (backdrop, or after a successful save/delete). */
  editModalDismissed(): void {
    this.isEditModalOpen.set(false);
    this.resetEditForm();
    void this.dismissKeyboard();
  }

  /** Save the edited car data and emit. */
  saveEdit(): void {
    const id = this.editingCarId();
    const name = this.editCarName().trim();
    if (!id || !name) return;

    this.carUpdated.emit({
      id,
      name,
      currentMileage: this.editCarMileage(),
      year: this.editCarYear(),
      vin: this.editCarVin().trim() || undefined,
    });
    this.isEditModalOpen.set(false);
    this.resetEditForm();
  }

  /** Delete the car being edited and emit. */
  deleteEditingCar(): void {
    const id = this.editingCarId();
    if (!id) return;

    this.carDeleted.emit(id);
    this.isEditModalOpen.set(false);
    this.resetEditForm();
  }

  // ── Shared helpers ──

  /** Convert an ionInput string value to number or undefined. */
  toNumber(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
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

  // ── Private reset helpers ──

  private resetNewCarForm(): void {
    this.newCarName.set('');
    this.newCarMileage.set(undefined);
    this.newCarYear.set(undefined);
    this.newCarVin.set('');
    this.vinCopied.set(false);
  }

  private resetEditForm(): void {
    this.editingCarId.set(null);
    this.editCarName.set('');
    this.editCarMileage.set(undefined);
    this.editCarYear.set(undefined);
    this.editCarVin.set('');
  }

  private closePopover(): void {
    this.isPopoverOpen.set(false);
    this.popoverEvent.set(undefined);
  }

  private async dismissPopover(): Promise<void> {
    const popover = this.popover();
    this.closePopover();
    if (popover) {
      await popover.dismiss().catch(() => false);
    }
  }
}
