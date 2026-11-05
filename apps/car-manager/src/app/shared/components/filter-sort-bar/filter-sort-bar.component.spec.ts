// spec: docs/specs/04-filter-sort-lists.md
// covers: docs/specs/04-filter-sort-lists.md#AC-1, AC-5, AC-7, AC-8, AC-9, AC-16, AC-17
import { render, screen, fireEvent } from '@testing-library/angular';
import { FilterSortBarComponent, type ListPreferences } from './filter-sort-bar.component';

const DEFAULT_PREFS: ListPreferences = {
  selectedMonth: 'all',
  selectedYear: 'all',
  sortBy: 'date',
  sortDirection: 'desc',
};

describe('FilterSortBarComponent', () => {
  // Mock scrollTo for ion-segment in jsdom
  beforeAll(() => {
    if (!HTMLElement.prototype.scrollTo) {
      Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
        value: () => {},
        writable: true,
        configurable: true,
      });
    }
  });

  async function setup(prefs: ListPreferences = DEFAULT_PREFS, availableYears: number[] = []) {
    const emitted: unknown[] = [];
    const result = await render(FilterSortBarComponent, {
      componentInputs: { prefs, availableYears },
      on: { prefsChange: (e: unknown) => emitted.push(e) },
    });
    return { ...result, emitted };
  }

  // covers: docs/specs/04-filter-sort-lists.md#AC-1
  it('should render all 12 month options plus "Wszystkie"', async () => {
    await setup();
    const buttons = document.querySelectorAll('ion-segment-button');
    expect(buttons.length).toBe(13);
    expect(buttons[0].textContent?.trim()).toBe('Wszystkie');
  });

  // covers: docs/specs/04-filter-sort-lists.md#AC-1
  it('should set segment value from selectedMonth input', async () => {
    const { fixture } = await setup({ ...DEFAULT_PREFS, selectedMonth: 2 });
    // The ion-segment receives value via Angular binding — read from component instance
    const instance = fixture.componentInstance as FilterSortBarComponent;
    expect(instance.segmentValue()).toBe('2');
  });

  // covers: docs/specs/04-filter-sort-lists.md#AC-3
  it('should emit prefsChange with month="all" when "Wszystkie" clicked', async () => {
    const { fixture, emitted } = await setup({
      ...DEFAULT_PREFS,
      selectedMonth: 5,
    });

    const segment = document.querySelector('ion-segment')!;
    fireEvent(segment, new CustomEvent('ionChange', { detail: { value: 'all' } }));
    fixture.detectChanges();

    expect(emitted).toEqual([{ month: 'all', year: 'all', sortBy: 'date', sortDirection: 'desc' }]);
  });

  // covers: docs/specs/04-filter-sort-lists.md#AC-1
  it('should emit prefsChange when a specific month is selected', async () => {
    const { fixture, emitted } = await setup();

    const segment = document.querySelector('ion-segment')!;
    fireEvent(segment, new CustomEvent('ionChange', { detail: { value: '10' } }));
    fixture.detectChanges();

    expect(emitted).toEqual([{ month: 10, year: 'all', sortBy: 'date', sortDirection: 'desc' }]);
  });

  // covers: docs/specs/04-filter-sort-lists.md#AC-2
  it('should emit prefsChange when year is selected', async () => {
    const { fixture, emitted } = await setup(DEFAULT_PREFS, [2025, 2026]);

    const select = document.querySelector('ion-select')!;
    fireEvent(select, new CustomEvent('ionChange', { detail: { value: 2025 } }));
    fixture.detectChanges();

    expect(emitted).toEqual([{ month: 'all', year: 2025, sortBy: 'date', sortDirection: 'desc' }]);
  });

  // covers: docs/specs/04-filter-sort-lists.md#AC-2
  it('should emit prefsChange when year is reset to "all"', async () => {
    const { fixture, emitted } = await setup({ ...DEFAULT_PREFS, selectedYear: 2026 }, [2026]);

    const select = document.querySelector('ion-select')!;
    fireEvent(select, new CustomEvent('ionChange', { detail: { value: 'all' } }));
    fixture.detectChanges();

    expect(emitted).toEqual([{ month: 'all', year: 'all', sortBy: 'date', sortDirection: 'desc' }]);
  });

  // covers: docs/specs/04-filter-sort-lists.md#AC-7
  it('should display "Data" as default sort label', async () => {
    await setup();
    const sortBtn = screen.getByTestId('sort-by-button');
    expect(sortBtn.textContent?.trim()).toBe('Data');
  });

  // covers: docs/specs/04-filter-sort-lists.md#AC-8, AC-9
  it('should emit sortBy=amount when toggled from date', async () => {
    const { fixture, emitted } = await setup();

    const sortBtn = screen.getByTestId('sort-by-button');
    fireEvent.click(sortBtn);
    fixture.detectChanges();

    expect(emitted).toEqual([
      { month: 'all', year: 'all', sortBy: 'amount', sortDirection: 'desc' },
    ]);
  });

  // covers: docs/specs/04-filter-sort-lists.md#AC-9
  it('should emit sortBy=date when toggled from amount', async () => {
    const { fixture, emitted } = await setup({
      ...DEFAULT_PREFS,
      sortBy: 'amount',
    });

    const sortBtn = screen.getByTestId('sort-by-button');
    fireEvent.click(sortBtn);
    fixture.detectChanges();

    expect(emitted).toEqual([{ month: 'all', year: 'all', sortBy: 'date', sortDirection: 'desc' }]);
  });

  // covers: docs/specs/04-filter-sort-lists.md#AC-8
  it('should emit sortDirection=asc when toggled from desc', async () => {
    const { fixture, emitted } = await setup();

    const dirBtn = screen.getByTestId('sort-direction-button');
    fireEvent.click(dirBtn);
    fixture.detectChanges();

    expect(emitted).toEqual([{ month: 'all', year: 'all', sortBy: 'date', sortDirection: 'asc' }]);
  });

  // covers: docs/specs/04-filter-sort-lists.md#AC-8
  it('should emit sortDirection=desc when toggled from asc', async () => {
    const { fixture, emitted } = await setup({
      ...DEFAULT_PREFS,
      sortDirection: 'asc',
    });

    const dirBtn = screen.getByTestId('sort-direction-button');
    fireEvent.click(dirBtn);
    fixture.detectChanges();

    expect(emitted).toEqual([{ month: 'all', year: 'all', sortBy: 'date', sortDirection: 'desc' }]);
  });

  // covers: docs/specs/04-filter-sort-lists.md#AC-10
  it('should show chevron-up icon when sort direction is ascending', async () => {
    await setup({ ...DEFAULT_PREFS, sortDirection: 'asc' });
    const dirBtn = screen.getByTestId('sort-direction-button');
    const icon = dirBtn.querySelector('ion-icon');
    // ion-icon's name is set as a property, not attribute
    expect((icon as HTMLElement & { name?: string }).name).toBe('chevron-up');
  });

  it('should show chevron-down icon when sort direction is descending', async () => {
    await setup({ ...DEFAULT_PREFS, sortDirection: 'desc' });
    const dirBtn = screen.getByTestId('sort-direction-button');
    const icon = dirBtn.querySelector('ion-icon');
    expect((icon as HTMLElement & { name?: string }).name).toBe('chevron-down');
  });

  it('should render available years in the select', async () => {
    await setup(DEFAULT_PREFS, [2024, 2025, 2026]);
    const options = document.querySelectorAll('ion-select-option');
    expect(options.length).toBe(4);
  });

  it('should show "Wszystkie lata" as the only option when no years available', async () => {
    await setup();
    const options = document.querySelectorAll('ion-select-option');
    expect(options.length).toBe(1);
    expect(options[0].textContent?.trim()).toBe('Wszystkie lata');
  });
});
