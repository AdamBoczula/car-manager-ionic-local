// spec: docs/specs/05-car-management.md
// spec: docs/specs/04-filter-sort-lists.md
// bugfix: docs/bugs/02-router-navigate-in-ionic.md
// bugfix: docs/bugs/03-list-car-switcher-and-repair-back.md
import type { OnDestroy } from '@angular/core';
import { Component, inject, effect, DestroyRef, NgZone, computed, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { NavController } from '@ionic/angular';
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
} from '@ionic/angular';
import { RepairService } from '../../core/services/repair.service';
import { CarService } from '../../core/services/car.service';
import { StorageService } from '../../core/services/storage.service';
import { CarSwitcherComponent } from '../../shared/components/car-switcher/car-switcher.component';
import {
  FilterSortBarComponent,
  type ListPreferences,
  type FilterSortChange,
} from '../../shared/components/filter-sort-bar/filter-sort-bar.component';
import { formatPln } from '../../core/utils/consumption.util';
import type { Repair } from '../../core/models/repair.model';

@Component({
  selector: 'app-repair-list',
  host: { class: 'ion-page' },
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
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
            aria-label="Dodaj naprawę"
            data-testid="add-repair-button"
          >
            <ion-icon name="add" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Filter & Sort Bar (hidden when no data) -->
      @if (hasRepairs()) {
        <app-filter-sort-bar
          [prefs]="preferences()"
          [availableYears]="availableYears()"
          (prefsChange)="handlePrefsChange($event)"
        />
      }

      @if (repairs().length === 0) {
        <div class="repair-list__empty" role="status">
          <ion-icon name="construct-outline" class="repair-list__empty-icon" />
          <p>Brak napraw – dodaj pierwszą!</p>
        </div>
      } @else if (filteredRepairs().length === 0) {
        <div class="repair-list__empty" role="status">
          <ion-icon name="search-outline" class="repair-list__empty-icon" />
          <p>Brak wpisów w wybranym okresie.</p>
          <p>Zmień filtr lub dodaj nowy wpis.</p>
        </div>
      } @else {
        <ion-list>
          @for (repair of filteredRepairs(); track repair.id) {
            <ion-item-sliding>
              <ion-item [button]="true">
                <ion-label>
                  <h2>{{ repair.date | date: 'dd.MM.yyyy' }}</h2>
                  <p>
                    <span class="repair-list__amount">{{ formatAmount(repair.amount) }}</span>
                    &nbsp;·&nbsp;
                    {{ repair.mileage | number }} km
                  </p>
                  <p class="repair-list__location">{{ repair.location }}</p>
                  <p class="repair-list__description">
                    {{ truncate(repair.description, 50) }}
                  </p>
                </ion-label>
              </ion-item>
              <ion-item-options side="end">
                <ion-item-option
                  color="danger"
                  (click)="deleteRepair(repair.id)"
                  aria-label="Usuń naprawę"
                  data-testid="delete-repair-button"
                >
                  <ion-icon name="trash" slot="icon-only" />
                  Usuń
                </ion-item-option>
              </ion-item-options>
            </ion-item-sliding>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styleUrl: './repair-list.page.scss',
})
export class RepairListPage implements OnDestroy {
  private readonly repairService = inject(RepairService);
  readonly carService = inject(CarService);
  private readonly storageService = inject(StorageService);
  private readonly navController = inject(NavController);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private readonly STORAGE_KEY = 'list_prefs:repair';

  readonly repairs = this.repairService.repairs;

  readonly preferences = signal<ListPreferences>({
    selectedMonth: 'all',
    selectedYear: 'all',
    sortBy: 'date',
    sortDirection: 'desc',
  });

  readonly hasRepairs = computed(() => this.repairs().length > 0);

  /** Years present in the data, newest first. */
  readonly availableYears = computed(() => {
    const years = new Set<number>();
    for (const r of this.repairs()) {
      years.add(new Date(r.date).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  });

  /** Filtered and sorted list derived from repairs() + preferences(). */
  readonly filteredRepairs = computed(() => {
    const list = [...this.repairs()];
    const { selectedMonth, selectedYear, sortBy, sortDirection } = this.preferences();

    // Filter by month
    if (selectedMonth !== 'all') {
      const filtered = list.filter((r) => new Date(r.date).getMonth() === selectedMonth);
      list.length = 0;
      list.push(...filtered);
    }

    // Filter by year
    if (selectedYear !== 'all') {
      const filtered = list.filter((r) => new Date(r.date).getFullYear() === selectedYear);
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

  constructor() {
    // Load persisted preferences
    this.loadPreferences();

    // React to active car changes
    const carListener = effect(() => {
      const carId = this.carService.activeCarId();
      if (carId) {
        this.repairService.startListening(carId);
      }
    });

    this.destroyRef.onDestroy(() => {
      carListener.destroy();
    });
  }

  ngOnDestroy(): void {
    this.repairService.stopListening();
  }

  /** Load persisted filter/sort preferences from Ionic Storage. */
  private async loadPreferences(): Promise<void> {
    try {
      const saved = await this.storageService.get<ListPreferences>(this.STORAGE_KEY);
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
    this.storageService.set(this.STORAGE_KEY, this.preferences()).catch(() => false);
  }

  navigateToForm(): void {
    this.zone.run(() => {
      this.navController.navigateForward('/repair-form');
    });
  }

  async handleCarSelected(id: string): Promise<void> {
    await this.carService.setActiveCar(id);
    await this.zone.run(() => this.navController.navigateRoot('/repair-list', { animated: false }));
  }

  async deleteRepair(id: string): Promise<void> {
    const carId = this.carService.activeCarId();
    if (carId) {
      this.repairService.delete(id, carId);
    }
  }

  formatAmount(amount: number): string {
    return formatPln(amount);
  }

  truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
  }

  trackById(_index: number, repair: Repair): string {
    return repair.id;
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
      console.error('Failed to add car from repair list:', err);
    }
  }
}
