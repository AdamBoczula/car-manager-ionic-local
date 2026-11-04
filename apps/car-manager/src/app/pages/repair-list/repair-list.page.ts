// spec: docs/specs/05-car-management.md
import { Component, inject, OnInit, OnDestroy, effect, DestroyRef } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
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
import { CarSwitcherComponent } from '../../shared/components/car-switcher/car-switcher.component';
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
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonLabel,
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
      @if (repairs().length === 0) {
        <div class="repair-list__empty" role="status">
          <ion-icon name="construct-outline" class="repair-list__empty-icon" />
          <p>Brak napraw – dodaj pierwszą!</p>
        </div>
      } @else {
        <ion-list>
          @for (repair of repairs(); track repair.id) {
            <ion-item-sliding>
              <ion-item [button]="true">
                <ion-label>
                  <h2>{{ repair.date | date:'dd.MM.yyyy' }}</h2>
                  <p>
                    <span class="repair-list__amount">{{ formatAmount(repair.amount) }}</span>
                    &nbsp;·&nbsp;
                    {{ repair.mileage | number }} km
                  </p>
                  <p class="repair-list__location">{{ repair.location }}</p>
                  <p class="repair-list__description">{{ truncate(repair.description, 50) }}</p>
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
export class RepairListPage implements OnInit, OnDestroy {
  private readonly repairService = inject(RepairService);
  readonly carService = inject(CarService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly repairs = this.repairService.repairs;

  constructor() {
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

  ngOnInit(): void {
    const carId = this.carService.activeCarId();
    if (carId) {
      this.repairService.startListening(carId);
    }
  }

  ngOnDestroy(): void {
    this.repairService.stopListening();
  }

  navigateToForm(): void {
    this.router.navigate(['/repair-form']);
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