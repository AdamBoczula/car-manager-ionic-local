// spec: docs/specs/repair/02-repair-crud.md
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
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
import { formatPln } from '../../core/utils/consumption.util';
import type { Repair } from '../../core/models/repair.model';

@Component({
  selector: 'app-repair-list',
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
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Naprawy</ion-title>
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
  private readonly router = inject(Router);

  readonly repairs = this.repairService.repairs;

  ngOnInit(): void {
    this.repairService.startListening('default-car');
  }

  ngOnDestroy(): void {
    this.repairService.stopListening();
  }

  navigateToForm(): void {
    this.router.navigate(['/repair-form']);
  }

  deleteRepair(id: string): void {
    this.repairService.delete(id, 'default-car');
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
}