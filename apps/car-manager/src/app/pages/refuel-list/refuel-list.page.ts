// spec: docs/specs/05-car-management.md
// spec: docs/specs/04-filter-sort-lists.md
// bugfix: docs/bugs/02-router-navigate-in-ionic.md
// bugfix: docs/bugs/03-list-car-switcher-and-repair-back.md
import {
  Component,
  inject,
  OnDestroy,
  computed,
  effect,
  DestroyRef,
  NgZone,
  signal,
} from '@angular/core';
import { NavController } from '@ionic/angular';
import { DatePipe } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
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
import { add, trash, searchOutline } from 'ionicons/icons';
import { RefuelService } from '../../core/services/refuel.service';
import { CarService } from '../../core/services/car.service';
import { StorageService } from '../../core/services/storage.service';
import { CarSwitcherComponent } from '../../shared/components/car-switcher/car-switcher.component';
import {
  FilterSortBarComponent,
  type ListPreferences,
  type FilterSortChange,
} from '../../shared/components/filter-sort-bar/filter-sort-bar.component';
import { formatPln } from '../../core/utils/consumption.util';

@Component({
  selector: 'app-refuel-list',
  host: { class: 'ion-page' },
  standalone: true,
  imports: [
    DatePipe,
    IonHeader,
    IonToolbar,
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
    FilterSortBarComponent,
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
          (carSelected)="handleCarSelected($event)"
          (carAdded)="handleCarAdded($event)"
        />
        <ion-buttons slot="end">
          <ion-button
            (click)="navigateToForm()"
            aria-label="Dodaj tankowanie"
            data-testid="add-refuel-button"
          >
            <ion-icon name="add" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Filter & Sort Bar (hidden when no data) -->
      @if (hasRefuels()) {
        <app-filter-sort-bar
          [prefs]="preferences()"
          [availableYears]="availableYears()"
          (prefsChange)="handlePrefsChange($event)"
        />
      }

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
      } @else if (!hasFilteredRefuels()) {
        <div class="refuel-list__empty" role="status">
          <ion-icon name="search-outline" class="refuel-list__empty-icon" />
          <ion-text color="medium">
            <p>Brak wpisów w wybranym okresie.</p>
            <p>Zmień filtr lub dodaj nowy wpis.</p>
          </ion-text>
        </div>
      } @else {
        <ion-list>
          @for (refuel of filteredRefuels(); track refuel.id) {
            <ion-item-sliding>
              <ion-item [button]="true" (click)="navigateToForm()">
                <ion-label>
                  <h3>{{ refuel.date | date: 'dd.MM.yyyy' }}</h3>
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
export class RefuelListPage implements OnDestroy {
  private readonly refuelService = inject(RefuelService);
  readonly carService = inject(CarService);
  private readonly storageService = inject(StorageService);
  private readonly navController = inject(NavController);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private readonly STORAGE_KEY = 'list_prefs:refuel';

  readonly refuels = this.refuelService.refuels;
  readonly isLoading = this.refuelService.isLoading;

  readonly preferences = signal<ListPreferences>({
    selectedMonth: 'all',
    selectedYear: 'all',
    sortBy: 'date',
    sortDirection: 'desc',
  });

  readonly hasRefuels = computed(() => this.refuels().length > 0);

  /** Years present in the data, newest first. */
  readonly availableYears = computed(() => {
    const years = new Set<number>();
    for (const r of this.refuels()) {
      years.add(new Date(r.date).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  });

  /** Filtered and sorted list derived from refuels() + preferences(). */
  readonly filteredRefuels = computed(() => {
    const list = [...this.refuels()];
    const { selectedMonth, selectedYear, sortBy, sortDirection } =
      this.preferences();

    // Filter by month
    if (selectedMonth !== 'all') {
      const filtered = list.filter(
        (r) => new Date(r.date).getMonth() === selectedMonth
      );
      list.length = 0;
      list.push(...filtered);
    }

    // Filter by year
    if (selectedYear !== 'all') {
      const filtered = list.filter(
        (r) => new Date(r.date).getFullYear() === selectedYear
      );
      list.length = 0;
      list.push(...filtered);
    }

    // Sort
    list.sort((a, b) => {
      let cmp: number;
      if (sortBy === 'date') {
        cmp = a.date.localeCompare(b.date);
      } else {
        cmp = a.amount - b.amount;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  });

  readonly hasFilteredRefuels = computed(
    () => this.filteredRefuels().length > 0
  );

  constructor() {
    addIcons({ add, trash, searchOutline });

    // Load persisted preferences
    this.loadPreferences();

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

  ngOnDestroy(): void {
    this.refuelService.stopListening();
  }

  /** Load persisted filter/sort preferences from Ionic Storage. */
  private async loadPreferences(): Promise<void> {
    try {
      const saved =
        await this.storageService.get<ListPreferences>(this.STORAGE_KEY);
      if (saved) {
        this.preferences.set(saved);
      }
    } catch {
      // Storage not ready – use defaults
    }
  }

  /** Handle filter/sort changes: update signal and persist to storage. */
  handlePrefsChange(change: FilterSortChange): void {
    this.preferences.update((p) => ({ ...p, ...change }));
    this.storageService
      .set(this.STORAGE_KEY, this.preferences())
      .catch(() => false);
  }

  navigateToForm(): void {
    this.zone.run(() => {
      this.navController.navigateForward('/refuel-form');
    });
  }

  async handleCarSelected(id: string): Promise<void> {
    await this.carService.setActiveCar(id);
    await this.zone.run(() =>
      this.navController.navigateRoot('/refuel-list', { animated: false })
    );
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
