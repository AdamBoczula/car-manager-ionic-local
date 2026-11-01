// spec: docs/specs/refuel/02-refuel-crud.md
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
  IonToggle,
  IonCheckbox,
  IonTextarea,
  IonButton,
  IonFooter,
  IonToast,
} from '@ionic/angular';
import { RefuelService } from '../../core/services/refuel.service';

const DEFAULT_CAR_ID = 'default-car';

@Component({
  selector: 'app-refuel-form',
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonToggle,
    IonCheckbox,
    IonTextarea,
    IonButton,
    IonFooter,
    IonToast,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/refuel-list" />
        </ion-buttons>
        <ion-title>Dodaj tankowanie</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form (ngSubmit)="handleSubmit()" #refuelForm="ngForm">
        <ion-list>
          <!-- Data -->
          <ion-item>
            <ion-input
              label="Data"
              labelPlacement="stacked"
              type="date"
              [(ngModel)]="date"
              name="date"
              required
            />
          </ion-item>

          <!-- Kwota -->
          <ion-item>
            <ion-input
              label="Kwota (PLN)"
              labelPlacement="stacked"
              type="number"
              [(ngModel)]="amount"
              name="amount"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
          </ion-item>

          <!-- Przebieg -->
          <ion-item>
            <ion-input
              label="Przebieg (km)"
              labelPlacement="stacked"
              type="number"
              [(ngModel)]="mileage"
              name="mileage"
              placeholder="0"
              min="0"
              required
            />
          </ion-item>

          <!-- Ilość litrów -->
          <ion-item>
            <ion-input
              label="Ilość litrów (opcjonalnie)"
              labelPlacement="stacked"
              type="number"
              [(ngModel)]="liters"
              name="liters"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </ion-item>

          <!-- Verva -->
          <ion-item>
            <ion-toggle [(ngModel)]="isVerva" name="isVerva" justify="space-between">
              Verva?
            </ion-toggle>
          </ion-item>

          <!-- Pomiń wpis -->
          <ion-item>
            <ion-checkbox [(ngModel)]="isSkipped" name="isSkipped" justify="start">
              Pomiń wpis
            </ion-checkbox>
          </ion-item>

          <!-- Powód pominięcia -->
          @if (isSkipped) {
            <ion-item>
              <ion-textarea
                label="Powód pominięcia"
                labelPlacement="stacked"
                [(ngModel)]="skippedReason"
                name="skippedReason"
                placeholder="Np. ktoś inny zatankował"
                rows="3"
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
          [disabled]="!refuelForm.form.valid"
          (click)="handleSubmit()"
        >
          Zapisz tankowanie
        </ion-button>
      </ion-toolbar>
    </ion-footer>

    <ion-toast
      [isOpen]="isToastOpen"
      [message]="toastMessage"
      [color]="toastColor"
      [duration]="3000"
      (ionToastDidDismiss)="isToastOpen = false"
    />
  `,
  styleUrl: './refuel-form.page.scss',
})
export class RefuelFormPage {
  private readonly refuelService = inject(RefuelService);
  private readonly router = inject(Router);

  // Form fields — plain class properties for ngModel binding
  date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  amount: number | null = null;
  mileage: number | null = null;
  liters: number | null = null;
  isVerva = false;
  isSkipped = false;
  skippedReason = '';

  // Toast state
  isToastOpen = false;
  toastMessage = '';
  toastColor: 'success' | 'danger' = 'success';

  async handleSubmit(): Promise<void> {
    if (this.amount == null || this.mileage == null) {
      return;
    }

    try {
      await this.refuelService.add({
        carId: DEFAULT_CAR_ID,
        date: this.date,
        amount: this.amount,
        mileage: this.mileage,
        liters: this.liters ?? undefined,
        isVerva: this.isVerva,
        isSkipped: this.isSkipped,
        skippedReason: this.isSkipped ? (this.skippedReason || undefined) : undefined,
      });

      this.toastColor = 'success';
      this.toastMessage = 'Tankowanie zapisane!';
      this.isToastOpen = true;
      this.router.navigate(['/refuel-list']);
    } catch (err) {
      console.error('Failed to add refuel:', err);
      this.toastColor = 'danger';
      this.toastMessage = 'Błąd zapisywania tankowania.';
      this.isToastOpen = true;
    }
  }
}