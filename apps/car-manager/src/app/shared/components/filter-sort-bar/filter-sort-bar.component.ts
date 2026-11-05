// spec: docs/specs/04-filter-sort-lists.md
import { Component, input, output, computed } from '@angular/core';
import {
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronUp, chevronDown } from 'ionicons/icons';

/** Filter and sort preferences for a list. Persisted in Ionic Storage. */
export interface ListPreferences {
  /** Month filter: 0-11 (0 = January) or 'all' for no filter. */
  selectedMonth: number | 'all';
  /** Year filter: numeric year or 'all' for no filter. */
  selectedYear: number | 'all';
  /** Sort criterion. */
  sortBy: 'date' | 'amount';
  /** Sort direction. */
  sortDirection: 'asc' | 'desc';
}

/** Emitted when the user changes any filter or sort setting. */
export interface FilterSortChange {
  month: number | 'all';
  year: number | 'all';
  sortBy: 'date' | 'amount';
  sortDirection: 'asc' | 'desc';
}

/** Polish month abbreviations for the scrollable segment. */
const MONTH_LABELS: string[] = [
  'Sty',
  'Lut',
  'Mar',
  'Kwi',
  'Maj',
  'Cze',
  'Lip',
  'Sie',
  'Wrz',
  'Paź',
  'Lis',
  'Gru',
];

@Component({
  selector: 'app-filter-sort-bar',
  standalone: true,
  imports: [IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonButton, IonIcon, IonLabel],
  template: `
    <div class="filter-sort-bar">
      <!-- Month filter: scrollable segment -->
      <ion-segment
        [value]="segmentValue()"
        (ionChange)="onMonthChange($event)"
        scrollable="true"
        class="filter-sort-bar__segment"
        aria-label="Filtruj po miesiącu"
      >
        <ion-segment-button value="all" data-testid="month-all">
          <ion-label>Wszystkie</ion-label>
        </ion-segment-button>
        @for (label of monthLabels; track $index) {
          <ion-segment-button [value]="$index.toString()" [attr.data-testid]="'month-' + $index">
            <ion-label>{{ label }}</ion-label>
          </ion-segment-button>
        }
      </ion-segment>

      <!-- Year filter + sort controls -->
      <div class="filter-sort-bar__controls">
        <ion-select
          [value]="selectedYearValue()"
          (ionChange)="onYearChange($event)"
          interface="popover"
          class="filter-sort-bar__year-select"
          aria-label="Wybierz rok"
          data-testid="year-select"
        >
          <ion-select-option value="all">Wszystkie lata</ion-select-option>
          @for (year of availableYears(); track year) {
            <ion-select-option [value]="year">{{ year }}</ion-select-option>
          }
        </ion-select>

        <ion-button
          fill="clear"
          size="small"
          (click)="toggleSortBy()"
          class="filter-sort-bar__sort-btn"
          [attr.aria-label]="'Sortuj według: ' + sortLabel()"
          data-testid="sort-by-button"
        >
          {{ sortLabel() }}
        </ion-button>

        <ion-button
          fill="clear"
          size="small"
          (click)="toggleSortDirection()"
          class="filter-sort-bar__dir-btn"
          [attr.aria-label]="prefs().sortDirection === 'asc' ? 'Sortuj malejąco' : 'Sortuj rosnąco'"
          data-testid="sort-direction-button"
        >
          <ion-icon
            [name]="prefs().sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'"
            slot="icon-only"
          />
        </ion-button>
      </div>
    </div>
  `,
  styleUrl: './filter-sort-bar.component.scss',
})
export class FilterSortBarComponent {
  /** Current filter/sort preferences. */
  readonly prefs = input.required<ListPreferences>();

  /** List of years available in the data (newest first). */
  readonly availableYears = input<number[]>([]);

  /** Emitted when user changes any filter or sort setting. */
  readonly prefsChange = output<FilterSortChange>();

  readonly monthLabels = MONTH_LABELS;

  /** Convert selectedMonth to a string for ion-segment value binding. */
  readonly segmentValue = computed(() => {
    const month = this.prefs().selectedMonth;
    return month === 'all' ? 'all' : month.toString();
  });

  /** Convert selectedYear to a value compatible with ion-select. */
  readonly selectedYearValue = computed(() => {
    const year = this.prefs().selectedYear;
    return year === 'all' ? 'all' : year;
  });

  /** Human-readable sort criterion label. */
  readonly sortLabel = computed(() => {
    return this.prefs().sortBy === 'date' ? 'Data' : 'Kwota';
  });

  constructor() {
    addIcons({ chevronUp, chevronDown });
  }

  /** Handle month segment change. */
  onMonthChange(event: { detail: { value?: string | number } }): void {
    const value = event.detail.value;
    const month: number | 'all' =
      value === 'all' || value === undefined || value === null ? 'all' : Number(value);
    this.emitChange({ month });
  }

  /** Handle year select change. */
  onYearChange(event: { detail: { value: number | 'all' } }): void {
    const value = event.detail.value;
    const year: number | 'all' = value === 'all' ? 'all' : Number(value);
    this.emitChange({ year });
  }

  /** Toggle sort criterion: date ↔ amount. */
  toggleSortBy(): void {
    const newSortBy = this.prefs().sortBy === 'date' ? 'amount' : 'date';
    this.emitChange({ sortBy: newSortBy });
  }

  /** Toggle sort direction: asc ↔ desc. */
  toggleSortDirection(): void {
    const newDir = this.prefs().sortDirection === 'asc' ? 'desc' : 'asc';
    this.emitChange({ sortDirection: newDir });
  }

  /** Emit a change, merging the partial update with current preferences. */
  private emitChange(partial: Partial<FilterSortChange>): void {
    const current = this.prefs();
    this.prefsChange.emit({
      month: partial.month ?? current.selectedMonth,
      year: partial.year ?? current.selectedYear,
      sortBy: partial.sortBy ?? current.sortBy,
      sortDirection: partial.sortDirection ?? current.sortDirection,
    });
  }
}
