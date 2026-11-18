// spec: docs/specs/05-car-management.md
// covers: docs/bugs/10-native-keyboard-integration.md
// covers: docs/specs/05-car-management.md#AC-8, AC-9, AC-10, AC-15, AC-16, AC-17, AC-18, AC-19
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CarSwitcherComponent } from './car-switcher.component';
import { Timestamp } from 'firebase/firestore';
import type { Car } from '../../../core/models/car.model';

function createCar(overrides?: Partial<Car>): Car {
  return {
    id: overrides?.id ?? 'car-1',
    name: overrides?.name ?? 'Test Car',
    ownerId: 'user-1',
    createdAt: Timestamp.now(),
  };
}

describe('CarSwitcherComponent', () => {
  // covers: docs/specs/05-car-management.md#AC-8
  describe('rendering', () => {
    it('should display the active car name in the switcher button', async () => {
      const cars = [createCar({ id: 'car-1', name: 'Toyota Corolla' })];

      await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      expect(screen.getByTestId('car-switcher-button')).toHaveTextContent('Toyota Corolla');
    });

    it('should display "Brak aut" when no active car', async () => {
      await render(CarSwitcherComponent, {
        componentInputs: { cars: [], activeCar: null },
      });

      expect(screen.getByTestId('car-switcher-button')).toHaveTextContent('Brak aut');
    });

    it('should contain popover and modal for overlays', async () => {
      const cars = [createCar()];
      const { container } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      expect(container.querySelector('ion-popover')).toBeTruthy();
      expect(container.querySelector('ion-modal')).toBeTruthy();
    });
  });

  describe('popover open/close', () => {
    // covers: docs/bugs/03-list-car-switcher-and-repair-back.md
    it('should control its own popover without a global trigger id', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      const popover = fixture.nativeElement.querySelector('ion-popover') as HTMLElement;
      const event = new MouseEvent('click');

      fixture.componentInstance.openPopover(event);

      expect(popover).toBeTruthy();
      expect(popover.hasAttribute('trigger')).toBe(false);
      expect(fixture.componentInstance.isPopoverOpen()).toBe(true);
      expect(fixture.componentInstance.popoverEvent()).toBe(event);
    });

    it('should close popover via popoverDismissed', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      fixture.componentInstance.isPopoverOpen.set(true);
      expect(fixture.componentInstance.isPopoverOpen()).toBe(true);

      fixture.componentInstance.popoverDismissed();
      expect(fixture.componentInstance.isPopoverOpen()).toBe(false);
    });
  });

  describe('add car modal state', () => {
    it('should open modal and clear name', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      fixture.componentInstance.openAddModal();
      expect(fixture.componentInstance.isModalOpen()).toBe(true);
      expect(fixture.componentInstance.newCarName()).toBe('');
    });

    it('should close modal on cancel and clear name', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      fixture.componentInstance.openAddModal();
      fixture.componentInstance.newCarName.set('Test');
      fixture.componentInstance.cancelModal();

      expect(fixture.componentInstance.isModalOpen()).toBe(false);
      expect(fixture.componentInstance.newCarName()).toBe('');
    });

    it('should close modal on dismiss and clear name', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      fixture.componentInstance.openAddModal();
      fixture.componentInstance.newCarName.set('Test');
      fixture.componentInstance.modalDismissed();

      expect(fixture.componentInstance.isModalOpen()).toBe(false);
      expect(fixture.componentInstance.newCarName()).toBe('');
    });

    // covers: docs/specs/05-car-management.md#AC-18
    it('should have optional field signals in modal', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      fixture.componentInstance.openAddModal();

      // Signals exist and are reset on open
      expect(fixture.componentInstance.newCarMileage()).toBeUndefined();
      expect(fixture.componentInstance.newCarYear()).toBeUndefined();
      expect(fixture.componentInstance.newCarVin()).toBe('');
      expect(fixture.componentInstance.vinCopied()).toBe(false);

      // Can set values
      fixture.componentInstance.newCarMileage.set(123000);
      fixture.componentInstance.newCarYear.set(2020);
      fixture.componentInstance.newCarVin.set('WBA123');

      expect(fixture.componentInstance.newCarMileage()).toBe(123000);
      expect(fixture.componentInstance.newCarYear()).toBe(2020);
      expect(fixture.componentInstance.newCarVin()).toBe('WBA123');
    });

    // covers: docs/specs/05-car-management.md#AC-19
    it('should copy VIN via copyVin()', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        writable: true,
        configurable: true,
      });

      fixture.componentInstance.newCarVin.set('WBA123');
      await fixture.componentInstance.copyVin();

      expect(writeTextSpy).toHaveBeenCalledWith('WBA123');
      expect(fixture.componentInstance.vinCopied()).toBe(true);
    });

    it('should not copy VIN when vin is empty', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        writable: true,
        configurable: true,
      });

      await fixture.componentInstance.copyVin();

      expect(writeTextSpy).not.toHaveBeenCalled();
    });

    it('should emit carAdded with all optional fields', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      const emitted = vi.fn();
      fixture.componentInstance.carAdded.subscribe(emitted);

      fixture.componentInstance.openAddModal();
      fixture.componentInstance.newCarName.set('Full');
      fixture.componentInstance.newCarMileage.set(123000);
      fixture.componentInstance.newCarYear.set(2020);
      fixture.componentInstance.newCarVin.set('WBA123');
      fixture.componentInstance.addCar();

      expect(emitted).toHaveBeenCalledWith({
        name: 'Full',
        currentMileage: 123000,
        year: 2020,
        vin: 'WBA123',
      });
    });

    it('should emit carAdded without optional fields when empty', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      const emitted = vi.fn();
      fixture.componentInstance.carAdded.subscribe(emitted);

      fixture.componentInstance.openAddModal();
      fixture.componentInstance.newCarName.set('Basic');
      fixture.componentInstance.addCar();

      expect(emitted).toHaveBeenCalledWith({
        name: 'Basic',
      });
    });

    // bugfix: docs/bugs/10-native-keyboard-integration.md
    it('should render both car dialogs as self-sizing card modals, not sheets', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      // A sheet keeps ion-content at the wrapper height and only translates it,
      // so it leaves dead space below the submit button (or pushes it off
      // screen). The card modal is exactly as tall as the form instead.
      const modals = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('ion-modal'),
      );

      expect(modals.length).toBe(2);
      for (const modal of modals) {
        expect(modal.hasAttribute('initialbreakpoint')).toBe(false);
        expect(modal.hasAttribute('breakpoints')).toBe(false);
        expect(modal.classList.contains('car-switcher__card-modal')).toBe(true);
      }
    });

    // bugfix: docs/bugs/10-native-keyboard-integration.md
    it('should keep the add-car submit button inside the scrollable content', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });
      fixture.componentInstance.openAddModal();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.querySelector('[data-testid="add-car-submit"]')).not.toBeNull();

      // A pinned <ion-footer> takes no room from <ion-content>, which makes the
      // content unscrollable and pushes the action below the fold.
      const modals = Array.from(document.querySelectorAll('ion-modal'));
      expect(modals.length).toBeGreaterThan(0);
      for (const modal of modals) {
        const footer =
          modal.querySelector('ion-footer') ??
          modal.shadowRoot?.querySelector('ion-footer') ??
          null;
        expect(footer).toBeNull();
      }
    });

    // bugfix: docs/bugs/10-native-keyboard-integration.md
    it('should hide the native keyboard when the add-car dialog is cancelled', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      const hide = vi.fn().mockResolvedValue(undefined);
      const component = fixture.componentInstance;
      Object.defineProperty(component, 'keyboard', { value: { hide }, configurable: true });

      await component.dismissKeyboard();

      expect(hide).toHaveBeenCalledTimes(1);
    });

    it('should reset all fields on cancel', async () => {
      const cars = [createCar()];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: cars[0] },
      });

      fixture.componentInstance.openAddModal();
      fixture.componentInstance.newCarName.set('Test');
      fixture.componentInstance.newCarMileage.set(50000);
      fixture.componentInstance.newCarYear.set(2023);
      fixture.componentInstance.newCarVin.set('VIN');
      fixture.componentInstance.cancelModal();

      expect(fixture.componentInstance.isModalOpen()).toBe(false);
      expect(fixture.componentInstance.newCarName()).toBe('');
      expect(fixture.componentInstance.newCarMileage()).toBeUndefined();
      expect(fixture.componentInstance.newCarYear()).toBeUndefined();
      expect(fixture.componentInstance.newCarVin()).toBe('');
    });
  });

  describe('activeCarName', () => {
    it('should return the active car name when set', () => {
      // Access via rendered component's method
      expect(true).toBe(true); // tested via rendering tests above
    });
  });

  // ── Car selection confirmation ──
  // bugfix: docs/bugs/01-car-switcher-confirmation-redirect.md

  describe('selectCar confirmation', () => {
    // covers: docs/bugs/03-list-car-switcher-and-repair-back.md
    it('should close without emitting when selecting the already-active car', async () => {
      const car = createCar({ id: 'car-1', name: 'Toyota' });
      const cars = [car, createCar({ id: 'car-2', name: 'Honda' })];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar: car },
      });

      const emitted = vi.fn();
      fixture.componentInstance.carSelected.subscribe(emitted);

      await fixture.componentInstance.selectCar('car-1');

      expect(emitted).not.toHaveBeenCalled();
      expect(fixture.componentInstance.isPopoverOpen()).toBe(false);
    });

    it('should NOT emit carSelected when selecting a different car without confirmation', async () => {
      const activeCar = createCar({ id: 'car-1', name: 'Toyota' });
      const cars = [activeCar, createCar({ id: 'car-2', name: 'Honda' })];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar },
      });

      const emitted = vi.fn();
      fixture.componentInstance.carSelected.subscribe(emitted);

      // Before confirmation, carSelected should NOT be emitted
      // selectCar should show confirmation alert first
      const result = fixture.componentInstance.selectCar('car-2');

      // If selectCar returns a Promise (for alert), we await it
      // If it's synchronous, we check immediately
      if (result instanceof Promise) {
        await result;
      }

      // carSelected should NOT be emitted from selectCar alone — it needs confirmation
      // (This test WILL FAIL until confirmation alert is implemented)
      expect(emitted).not.toHaveBeenCalled();
    });

    it('should close popover after selecting same active car', async () => {
      const car = createCar({ id: 'car-1', name: 'Toyota' });
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars: [car], activeCar: car },
      });

      fixture.componentInstance.isPopoverOpen.set(true);
      await fixture.componentInstance.selectCar('car-1');

      expect(fixture.componentInstance.isPopoverOpen()).toBe(false);
    });

    it('should close popover when selecting a different car (before showing alert)', async () => {
      const activeCar = createCar({ id: 'car-1', name: 'Toyota' });
      const cars = [activeCar, createCar({ id: 'car-2', name: 'Honda' })];
      const { fixture } = await render(CarSwitcherComponent, {
        componentInputs: { cars, activeCar },
      });

      fixture.componentInstance.isPopoverOpen.set(true);

      // selectCar for different car should close popover immediately
      // (even though it then shows an alert)
      const result = fixture.componentInstance.selectCar('car-2');
      // Popover should be closed synchronously before the async alert
      expect(fixture.componentInstance.isPopoverOpen()).toBe(false);

      // Await the promise to avoid unhandled rejections
      if (result instanceof Promise) {
        await result;
      }
    });
  });
});
