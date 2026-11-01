// spec: docs/specs/dashboard/02-dashboard.md
import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonFabList,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import { RefuelService } from '../../core/services/refuel.service';
import { RepairService } from '../../core/services/repair.service';
import { StorageService } from '../../core/services/storage.service';
import { SyncService } from '../../core/services/sync.service';
import { formatPln } from '../../core/utils/consumption.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    IonButton,
    IonButtons,
    IonContent,
    IonFab,
    IonFabButton,
    IonFabList,
    IonHeader,
    IonIcon,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Car Manager 🚗</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear" (click)="handleLogout()" aria-label="Wyloguj się">
            <ion-icon slot="icon-only" name="log-out-outline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="dashboard-content">
        @if (storageReady()) {
          <!-- Welcome + email -->
          <div class="welcome-section">
            <h1>Witaj!</h1>
            @if (userEmail()) {
              <p class="user-email">{{ userEmail() }}</p>
            }
          </div>

          <!-- Online/Offline status -->
          <div class="status-section">
            <div class="status-badge" [class.online]="isOnline()" [class.offline]="!isOnline()">
              <ion-icon [name]="isOnline() ? 'cloud-done-outline' : 'cloud-offline-outline'" />
              <span>{{ isOnline() ? 'Online' : 'Offline' }}</span>
            </div>
          </div>

          @if (isRefuelsLoading() || isRepairsLoading()) {
            <!-- Loading state -->
            <div class="loading-container">
              <ion-spinner name="crescent" />
              <p>Ładowanie danych...</p>
            </div>
          } @else {
            <!-- Latest refuel card -->
            <section class="cards-section" aria-labelledby="latest-refuel-heading">
              <h2 id="latest-refuel-heading" class="section-heading">Ostatnie tankowanie</h2>
              @if (latestRefuel(); as refuel) {
                <div class="card card-refuel">
                  <ion-icon name="fuel-outline" class="card-icon" />
                  <div class="card-details">
                    <p class="card-date">{{ refuel.date | date:'dd.MM.yyyy' }}</p>
                    <p class="card-amount">{{ formatAmount(refuel.amount) }}</p>
                    <p class="card-mileage">{{ refuel.mileage | number }} km</p>
                    @if (refuel.consumption != null) {
                      <p class="card-consumption">
                        Spalanie: {{ refuel.consumption | number:'1.2-2' }} L/100km
                      </p>
                    }
                    @if (refuel.isVerva) {
                      <p class="card-verva">⛽ Verva</p>
                    }
                  </div>
                </div>
              } @else {
                <div class="card card-refuel card--empty" role="status">
                  <ion-icon name="fuel-outline" class="card-icon" />
                  <p>Brak danych o tankowaniach</p>
                  <p class="card-hint">Dodaj pierwsze tankowanie!</p>
                </div>
              }
            </section>

            <!-- Monthly spending card -->
            <section class="cards-section" aria-labelledby="monthly-spending-heading">
              <h2 id="monthly-spending-heading" class="section-heading">
                Wydatki w tym miesiącu
              </h2>
              <div class="card card-spending">
                <ion-icon name="wallet-outline" class="card-icon" />
                <div class="card-details">
                  <p class="card-total">{{ formatAmount(monthlyTotalSpending()) }}</p>
                  <div class="spending-breakdown">
                    <span class="spending-refuel">
                      ⛽ Tankowania: {{ formatAmount(monthlyRefuelSpending()) }}
                    </span>
                    <span class="spending-repair">
                      🔧 Naprawy: {{ formatAmount(monthlyRepairSpending()) }}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          }
        } @else {
          <!-- Storage not ready -->
          <div class="loading-container">
            <ion-spinner name="crescent" />
            <p>Ładowanie danych...</p>
          </div>
        }
      </div>

      <!-- FAB for quick actions -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button data-testid="fab-main" title="Szybkie akcje">
          <ion-icon name="add" />
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button data-testid="fab-add-refuel" (click)="navigateToRefuelForm()" title="Dodaj tankowanie" color="primary">
            <ion-icon name="fuel-outline" />
          </ion-fab-button>
          <ion-fab-button data-testid="fab-add-repair" (click)="navigateToRepairForm()" title="Dodaj naprawę" color="tertiary">
            <ion-icon name="construct-outline" />
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>
    </ion-content>
  `,
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly refuelService = inject(RefuelService);
  private readonly repairService = inject(RepairService);
  private readonly storage = inject(StorageService);
  private readonly sync = inject(SyncService);
  private readonly router = inject(Router);

  readonly storageReady = signal(false);

  readonly userEmail = computed(() => this.authService.currentUser()?.email ?? '');
  readonly isOnline = this.sync.isOnline;

  readonly isRefuelsLoading = this.refuelService.isLoading;
  readonly isRepairsLoading = this.repairService.isLoading;

  /** Latest refuel from the signal (already sorted desc by date). */
  readonly latestRefuel = computed(() => {
    const refuels = this.refuelService.refuels();
    if (!refuels.length) return null;
    // Find the latest non-skipped refuel
    const nonSkipped = refuels.filter((r) => !r.isSkipped);
    return nonSkipped.length > 0 ? nonSkipped[0] : null;
  });

  /** Sum of refuel amounts for the current month. */
  readonly monthlyRefuelSpending = computed(() => {
    return this.sumCurrentMonth(this.refuelService.refuels());
  });

  /** Sum of repair amounts for the current month. */
  readonly monthlyRepairSpending = computed(() => {
    return this.sumCurrentMonth(this.repairService.repairs());
  });

  /** Total spending for the current month (refuels + repairs). */
  readonly monthlyTotalSpending = computed(() => {
    return this.monthlyRefuelSpending() + this.monthlyRepairSpending();
  });

  async ngOnInit(): Promise<void> {
    await this.storage.init();
    this.storageReady.set(true);

    // Start listening for real-time data
    await this.refuelService.startListening('default-car');
    await this.repairService.startListening('default-car');

    // Force sync when dashboard loads (if online)
    if (this.sync.isOnline()) {
      this.sync.processQueue();
    }
  }

  ngOnDestroy(): void {
    this.refuelService.stopListening();
    this.repairService.stopListening();
  }

  formatAmount(amount: number): string {
    return formatPln(amount);
  }

  async handleLogout(): Promise<void> {
    await this.authService.logout();
  }

  navigateToRefuelForm(): void {
    this.router.navigate(['/refuel-form']);
  }

  navigateToRepairForm(): void {
    this.router.navigate(['/repair-form']);
  }

  /** Sum amounts for entries whose date falls in the current month. */
  private sumCurrentMonth<T extends { date: string; amount: number }>(items: T[]): number {
    if (!items.length) return 0;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based

    return items
      .filter((item) => {
        const d = new Date(item.date);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, item) => sum + item.amount, 0);
  }
}