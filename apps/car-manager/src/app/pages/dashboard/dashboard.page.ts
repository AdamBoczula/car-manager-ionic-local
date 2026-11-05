// spec: docs/specs/05-car-management.md
// bugfix: docs/bugs/02-router-navigate-in-ionic.md
import type { OnInit, OnDestroy } from '@angular/core';
import { Component, inject, signal, computed, effect, DestroyRef, NgZone } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NavController } from '@ionic/angular';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFab,
  IonFabButton,
  IonFabList,
  IonLabel,
  IonSpinner,
  IonText,
  IonList,
  IonItem,
  IonNote,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, carSport, construct, logOut, chevronForward } from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { SyncService } from '../../core/services/sync.service';
import { CarService } from '../../core/services/car.service';
import { RefuelService } from '../../core/services/refuel.service';
import { RepairService } from '../../core/services/repair.service';
import { CarSwitcherComponent } from '../../shared/components/car-switcher/car-switcher.component';
import { formatPln } from '../../core/utils/consumption.util';

@Component({
  selector: 'app-dashboard',
  host: { class: 'ion-page' },
  standalone: true,
  imports: [
    DatePipe,
    IonContent,
    IonFab,
    IonFabButton,
    IonFabList,
    IonHeader,
    IonIcon,
    IonLabel,
    IonButton,
    IonButtons,
    IonTitle,
    IonToolbar,
    IonSpinner,
    IonText,
    IonList,
    IonItem,
    IonNote,
    CarSwitcherComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <app-car-switcher
          [cars]="carService.cars()"
          [activeCar]="carService.activeCar()"
          (carSelected)="handleCarSelected($event)"
          (carAdded)="handleCarAdded($event)"
          (carUpdated)="handleCarUpdated($event)"
          (carDeleted)="handleCarDeleted($event)"
        />
        <ion-buttons slot="end">
          <ion-button
            (click)="handleLogout()"
            aria-label="Wyloguj si&#x119;"
            data-testid="logout-button"
          >
            <ion-icon name="log-out" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (storageReady()) {
        <div class="dashboard-content">
          <!-- Add action buttons -->
          <div class="action-row">
            <ion-button
              expand="block"
              (click)="navigateTo('/refuel-form')"
              data-testid="btn-add-refuel"
            >
              <ion-icon name="car-sport" slot="start" />
              Dodaj tankowanie
            </ion-button>
            <ion-button
              expand="block"
              color="tertiary"
              (click)="navigateTo('/repair-form')"
              data-testid="btn-add-repair"
            >
              <ion-icon name="construct" slot="start" />
              Dodaj napraw&#x119;
            </ion-button>
          </div>

          <!-- Recent refuels -->
          <div class="recent-section">
            <div class="section-header">
              <h3>Ostatnie tankowania</h3>
              @if (recentRefuels().length) {
                <ion-button
                  fill="clear"
                  size="small"
                  (click)="navigateTo('/refuel-list')"
                  data-testid="link-all-refuels"
                >
                  Zobacz wszystkie
                  <ion-icon name="chevron-forward" slot="end" />
                </ion-button>
              }
            </div>
            @if (recentRefuels().length) {
              <ion-list class="recent-list" data-testid="recent-refuels-list">
                @for (refuel of recentRefuels(); track refuel.id) {
                  <ion-item
                    [button]="true"
                    (click)="navigateTo('/refuel-list')"
                    detail="false"
                    data-testid="recent-refuel-item"
                  >
                    <ion-label>
                      <h3>{{ refuel.date | date: 'dd.MM.yyyy' }}</h3>
                      <p>{{ formatAmount(refuel.amount) }} &middot; {{ refuel.mileage }} km</p>
                      @if (refuel.consumption != null) {
                        <p class="consumption-info">Spalanie: {{ refuel.consumption }} L/100km</p>
                      }
                    </ion-label>
                    @if (refuel.isVerva) {
                      <ion-note slot="end" color="primary">Verva</ion-note>
                    }
                  </ion-item>
                }
              </ion-list>
            } @else {
              <p class="empty-hint" data-testid="empty-refuels">
                Brak tankowa&#x144; &ndash; dodaj pierwsze!
              </p>
            }
          </div>

          <!-- Recent repairs -->
          <div class="recent-section">
            <div class="section-header">
              <h3>Ostatnie naprawy</h3>
              @if (recentRepairs().length) {
                <ion-button
                  fill="clear"
                  size="small"
                  (click)="navigateTo('/repair-list')"
                  data-testid="link-all-repairs"
                >
                  Zobacz wszystkie
                  <ion-icon name="chevron-forward" slot="end" />
                </ion-button>
              }
            </div>
            @if (recentRepairs().length) {
              <ion-list class="recent-list" data-testid="recent-repairs-list">
                @for (repair of recentRepairs(); track repair.id) {
                  <ion-item
                    [button]="true"
                    (click)="navigateTo('/repair-list')"
                    detail="false"
                    data-testid="recent-repair-item"
                  >
                    <ion-label>
                      <h3>{{ repair.date | date: 'dd.MM.yyyy' }}</h3>
                      <p>{{ formatAmount(repair.amount) }} &middot; {{ repair.mileage }} km</p>
                      @if (repair.location) {
                        <p>{{ repair.location }}</p>
                      }
                    </ion-label>
                  </ion-item>
                }
              </ion-list>
            } @else {
              <p class="empty-hint" data-testid="empty-repairs">
                Brak napraw &ndash; dodaj pierwsz&#x105;!
              </p>
            }
          </div>
        </div>
      } @else {
        <div class="loading-container">
          <ion-spinner name="crescent" />
          <ion-text color="medium">Ładowanie danych...</ion-text>
        </div>
      }

      <!-- FAB – Floating Action Button -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button data-testid="fab-main" aria-label="Dodaj">
          <ion-icon name="add" />
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button
            (click)="navigateTo('/refuel-form')"
            color="primary"
            data-testid="fab-refuel"
            aria-label="Dodaj tankowanie"
          >
            <ion-icon name="car-sport" />
          </ion-fab-button>
          <ion-fab-button
            (click)="navigateTo('/repair-form')"
            color="tertiary"
            data-testid="fab-repair"
            aria-label="Dodaj napraw&#x119;"
          >
            <ion-icon name="construct" />
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>
    </ion-content>
  `,
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  private readonly storage = inject(StorageService);
  readonly sync = inject(SyncService);
  readonly carService = inject(CarService);
  readonly refuelService = inject(RefuelService);
  readonly repairService = inject(RepairService);
  private readonly navController = inject(NavController);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  readonly storageReady = signal(false);

  /** Last 5 refuels sorted by date descending (newest first). */
  readonly recentRefuels = computed(() => this.refuelService.refuels().slice(0, 5));

  /** Last 5 repairs sorted by date descending (newest first). */
  readonly recentRepairs = computed(() => this.repairService.repairs().slice(0, 5));

  constructor() {
    addIcons({
      add,
      carSport,
      construct,
      logOut,
      chevronForward,
    });

    // React to active car changes – start listening for refuels & repairs
    const carListener = effect(() => {
      const carId = this.carService.activeCarId();
      if (carId) {
        this.refuelService.startListening(carId);
        this.repairService.startListening(carId);
      }
    });

    this.destroyRef.onDestroy(() => {
      carListener.destroy();
    });
  }

  async ngOnInit(): Promise<void> {
    await this.storage.init();
    this.storageReady.set(true);

    // Safety net: ensure listeners are started even if the effect above
    // ran before activeCarId was available (race condition during first load).
    const carId = this.carService.activeCarId();
    if (carId) {
      this.refuelService.startListening(carId);
      this.repairService.startListening(carId);
    }
  }

  ngOnDestroy(): void {
    // DO NOT call stopListening() here – it would increment the generation counter
    // and race with the next page's startListening(), causing data to never load.
    // The next page's startListening() calls stopListening() internally before starting.
  }

  /** Format PLN amount for display (e.g. 145.5 => "145,50 zł"). */
  formatAmount(amount: number): string {
    return formatPln(amount);
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
      console.error('Failed to add car from dashboard:', err);
    }
  }

  /** Handle a car update from the car-switcher edit modal. */
  async handleCarUpdated(data: {
    id: string;
    name: string;
    currentMileage?: number;
    year?: number;
    vin?: string;
  }): Promise<void> {
    try {
      await this.carService.updateCar(data.id, {
        name: data.name,
        currentMileage: data.currentMileage,
        year: data.year,
        vin: data.vin,
      });
    } catch (err) {
      console.error('Failed to update car from dashboard:', err);
    }
  }

  /** Handle a car deletion from the car-switcher edit modal. */
  async handleCarDeleted(id: string): Promise<void> {
    try {
      await this.carService.deleteCar(id);
    } catch (err) {
      console.error('Failed to delete car from dashboard:', err);
    }
  }

  /** Handle car selection with redirect to force dashboard re-render. */
  // bugfix: docs/bugs/01-car-switcher-confirmation-redirect.md
  async handleCarSelected(id: string): Promise<void> {
    await this.carService.setActiveCar(id);
    await this.zone.run(() => this.navController.navigateRoot('/dashboard', { animated: false }));
  }

  navigateTo(path: string): void {
    this.zone.run(() => {
      this.navController.navigateForward(path);
    });
  }

  async handleLogout(): Promise<void> {
    await this.authService.logout();
  }
}
