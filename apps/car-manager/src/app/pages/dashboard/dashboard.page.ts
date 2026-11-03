// spec: docs/specs/05-car-management.md
import { Component, inject, signal, OnInit, OnDestroy, effect, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
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
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add,
  carSport,
  construct,
  logOut,
  wifi,
  cloudOffline,
} from 'ionicons/icons';
import { AuthService } from '../../core/services/auth.service';
import { StorageService } from '../../core/services/storage.service';
import { SyncService } from '../../core/services/sync.service';
import { CarService } from '../../core/services/car.service';
import { CarSwitcherComponent } from '../../shared/components/car-switcher/car-switcher.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
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
    CarSwitcherComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <app-car-switcher
          [cars]="carService.cars()"
          [activeCar]="carService.activeCar()"
          (carSelected)="carService.setActiveCar($event)"
          (carAdded)="handleCarAdded($event)"
        />
        <ion-buttons slot="end">
          <ion-button (click)="handleLogout()" aria-label="Wyloguj się" data-testid="logout-button">
            <ion-icon name="log-out" slot="icon-only" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (storageReady()) {
        <div class="dashboard-content">
          <!-- Welcome + status -->
          <div class="dashboard-header">
            <h1>Witaj!</h1>
            @if (userEmail) {
              <p class="user-email">{{ userEmail }}</p>
            }
            <div class="status-row">
              <ion-icon
                [name]="isOnline ? 'wifi' : 'cloud-offline'"
                [color]="isOnline ? 'success' : 'warning'"
                class="status-icon"
              />
              <ion-text [color]="isOnline ? 'success' : 'warning'">
                {{ isOnline ? 'Online' : 'Offline' }}
              </ion-text>
            </div>
          </div>

          <!-- Quick-action cards -->
          <button class="card card-refuel" (click)="navigateTo('/refuel-list')" data-testid="card-refuel">
            <ion-icon name="car-sport" class="card-icon" />
            <h2>Tankowania</h2>
            <p>Przeglądaj i dodawaj tankowania</p>
          </button>

          <button class="card card-repair" (click)="navigateTo('/repair-list')" data-testid="card-repair">
            <ion-icon name="construct" class="card-icon" />
            <h2>Naprawy</h2>
            <p>Zarządzaj naprawami i serwisem</p>
          </button>
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
            aria-label="Dodaj naprawę"
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
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly storageReady = signal(false);

  constructor() {
    addIcons({
      add,
      carSport,
      construct,
      logOut,
      wifi,
      cloudOffline,
    });
  }

  get userEmail(): string {
    return this.authService.currentUser()?.email ?? '';
  }

  get isOnline(): boolean {
    return this.sync.isOnline();
  }

  async ngOnInit(): Promise<void> {
    await this.storage.init();
    this.storageReady.set(true);

    if (this.sync.isOnline()) {
      this.sync.processQueue();
    }
  }

  ngOnDestroy(): void {
    // Cleanup handled by services
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

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  async handleLogout(): Promise<void> {
    await this.authService.logout();
  }
}