// spec: docs/specs/05-car-management.md
// covers: docs/specs/05-car-management.md#AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-18, AC-19, AC-20
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideRouter, Router, Routes } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { signal, Component } from '@angular/core';
import { AddCarPage } from './add-car.page';
import { CarService } from '../../core/services/car.service';
import { Timestamp } from 'firebase/firestore';
import type { Car } from '../../core/models/car.model';

vi.mock('../../core/firebase', () => ({
  auth: {} as unknown,
  db: {} as unknown,
}));

function createMockCar(name: string, id: string): Car {
  return { id, name, ownerId: 'user-1', createdAt: Timestamp.now() };
}

@Component({ standalone: true, template: '' })
class DummyDashboardComponent {}

const routes: Routes = [
  { path: 'dashboard', component: DummyDashboardComponent },
];

describe('AddCarPage', () => {
  describe('wizard mode (0 cars)', () => {
    it('should show welcome message and wizard title', async () => {
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn(),
        deleteCar: vi.fn(),
        setActiveCar: vi.fn(),
      };

      await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      expect(screen.getByText('Witaj w garażu')).toBeTruthy();
      expect(screen.getByText('🚗 Witaj w swoim garażu!')).toBeTruthy();
    });

    it('should disable "Dodaj auto" button when input is empty', async () => {
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn(),
        deleteCar: vi.fn(),
        setActiveCar: vi.fn(),
      };

      await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      const addBtn = screen.getByTestId('add-car-button') as HTMLButtonElement;
      expect(addBtn.disabled).toBe(true);
    });

    it('should add a car to pending list after setting name and clicking add', async () => {
      const user = userEvent.setup();
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn().mockImplementation(async (name: string) =>
          createMockCar(name, `car-${Date.now()}`)
        ),
        deleteCar: vi.fn().mockResolvedValue(undefined),
        setActiveCar: vi.fn().mockResolvedValue(undefined),
      };

      const { fixture } = await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      // Set name directly via signal (bypasses ionInput event issues in JSDOM)
      fixture.componentInstance.newCarName.set('Toyota');
      fixture.detectChanges();

      // Button should now be enabled
      const addBtn = screen.getByTestId('add-car-button') as HTMLButtonElement;
      expect(addBtn.disabled).toBe(false);

      await user.click(addBtn);

      // async handleAddCar should have been triggered
      expect(mockCarService.addCar).toHaveBeenCalledWith('Toyota', {});

      // pendingCars should be updated
      const pendingCars = fixture.componentInstance.pendingCars();
      expect(pendingCars.length).toBe(1);
      expect(pendingCars[0].name).toBe('Toyota');
    });

    it('should show CTA after adding a car', async () => {
      const user = userEvent.setup();
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn().mockImplementation(async (name: string) =>
          createMockCar(name, `car-${Date.now()}`)
        ),
        deleteCar: vi.fn().mockResolvedValue(undefined),
        setActiveCar: vi.fn().mockResolvedValue(undefined),
      };

      const { fixture } = await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      // CTA not visible initially
      expect(screen.queryByTestId('start-using-button')).toBeNull();

      // Add car
      fixture.componentInstance.newCarName.set('Toyota');
      fixture.detectChanges();
      await user.click(screen.getByTestId('add-car-button'));

      // CTA visible now
      expect(screen.getByTestId('start-using-button')).toBeTruthy();
    });

    it('should set first car as active and navigate on CTA click', async () => {
      const user = userEvent.setup();
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn().mockImplementation(async (name: string) =>
          createMockCar(name, `car-${Date.now()}`)
        ),
        deleteCar: vi.fn().mockResolvedValue(undefined),
        setActiveCar: vi.fn().mockResolvedValue(undefined),
      };

      const { fixture } = await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      const routerService = fixture.componentRef.injector.get(Router);
      const navigateSpy = vi.spyOn(routerService, 'navigate').mockResolvedValue(true);

      // Add car
      fixture.componentInstance.newCarName.set('Toyota');
      fixture.detectChanges();
      await user.click(screen.getByTestId('add-car-button'));

      // Click CTA
      await user.click(screen.getByTestId('start-using-button'));

      expect(mockCarService.setActiveCar).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should remove a car when X is clicked', async () => {
      const user = userEvent.setup();
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn().mockImplementation(async (name: string) =>
          createMockCar(name, `car-${Date.now()}`)
        ),
        deleteCar: vi.fn().mockResolvedValue(undefined),
        setActiveCar: vi.fn().mockResolvedValue(undefined),
      };

      const { fixture } = await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      // Add a car
      fixture.componentInstance.newCarName.set('Toyota');
      fixture.detectChanges();
      await user.click(screen.getByTestId('add-car-button'));

      // Remove it
      const removeBtn = screen.getByTestId('remove-car-button');
      await user.click(removeBtn);

      expect(mockCarService.deleteCar).toHaveBeenCalled();
      const pending = fixture.componentInstance.pendingCars();
      expect(pending.length).toBe(0);
    });

    it('should not show back button in wizard mode', async () => {
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn(),
        deleteCar: vi.fn(),
        setActiveCar: vi.fn(),
      };

      await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      expect(document.querySelectorAll('ion-back-button').length).toBe(0);
    });

    // covers: docs/specs/05-car-management.md#AC-18
    it('should render optional fields: przebieg, rocznik, VIN', async () => {
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn(),
        deleteCar: vi.fn(),
        setActiveCar: vi.fn(),
      };

      await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      expect(screen.getByTestId('car-mileage-input')).toBeTruthy();
      expect(screen.getByTestId('car-year-input')).toBeTruthy();
      expect(screen.getByTestId('car-vin-input')).toBeTruthy();
    });

    // covers: docs/specs/05-car-management.md#AC-19
    it('should copy VIN to clipboard and show "Skopiowano!"', async () => {
      const user = userEvent.setup();
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn(),
        deleteCar: vi.fn(),
        setActiveCar: vi.fn(),
      };

      const writeTextSpy = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextSpy },
        writable: true,
        configurable: true,
      });

      const { fixture } = await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      fixture.componentInstance.newCarVin.set('WBA1234567890');
      fixture.detectChanges();

      const copyBtn = screen.getByTestId('copy-vin-button');
      await user.click(copyBtn);

      expect(writeTextSpy).toHaveBeenCalledWith('WBA1234567890');
      expect(screen.getByText('Skopiowano!')).toBeTruthy();
    });

    // covers: docs/specs/05-car-management.md#AC-20
    it('should add car without optional fields when they are empty', async () => {
      const user = userEvent.setup();
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn().mockImplementation(
          async (
            name: string,
            _options?: {
              currentMileage?: number;
              year?: number;
              vin?: string;
            }
          ) => createMockCar(name, `car-${Date.now()}`)
        ),
        deleteCar: vi.fn().mockResolvedValue(undefined),
        setActiveCar: vi.fn().mockResolvedValue(undefined),
      };

      const { fixture } = await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      fixture.componentInstance.newCarName.set('Basic');
      fixture.detectChanges();
      await user.click(screen.getByTestId('add-car-button'));

      expect(mockCarService.addCar).toHaveBeenCalledWith('Basic', {});
    });

    // covers: docs/specs/05-car-management.md#AC-18
    it('should pass all optional fields to carService.addCar', async () => {
      const user = userEvent.setup();
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn().mockImplementation(
          async (
            name: string,
            _options?: {
              currentMileage?: number;
              year?: number;
              vin?: string;
            }
          ) => createMockCar(name, `car-${Date.now()}`)
        ),
        deleteCar: vi.fn().mockResolvedValue(undefined),
        setActiveCar: vi.fn().mockResolvedValue(undefined),
      };

      const { fixture } = await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      fixture.componentInstance.newCarName.set('Full');
      fixture.componentInstance.newCarMileage.set(123000);
      fixture.componentInstance.newCarYear.set(2020);
      fixture.componentInstance.newCarVin.set('WBA123');
      fixture.detectChanges();
      await user.click(screen.getByTestId('add-car-button'));

      expect(mockCarService.addCar).toHaveBeenCalledWith('Full', {
        currentMileage: 123000,
        year: 2020,
        vin: 'WBA123',
      });
    });

    it('should reset all optional fields after adding car in wizard mode', async () => {
      const user = userEvent.setup();
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn().mockImplementation(
          async (
            name: string,
            _options?: {
              currentMileage?: number;
              year?: number;
              vin?: string;
            }
          ) => createMockCar(name, `car-${Date.now()}`)
        ),
        deleteCar: vi.fn().mockResolvedValue(undefined),
        setActiveCar: vi.fn().mockResolvedValue(undefined),
      };

      const { fixture } = await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      fixture.componentInstance.newCarName.set('Test');
      fixture.componentInstance.newCarMileage.set(50000);
      fixture.componentInstance.newCarYear.set(2023);
      fixture.componentInstance.newCarVin.set('VIN');
      fixture.detectChanges();
      await user.click(screen.getByTestId('add-car-button'));

      expect(fixture.componentInstance.newCarName()).toBe('');
      expect(fixture.componentInstance.newCarMileage()).toBeUndefined();
      expect(fixture.componentInstance.newCarYear()).toBeUndefined();
      expect(fixture.componentInstance.newCarVin()).toBe('');
    });

    it('should disable VIN copy button when VIN is empty', async () => {
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn(),
        deleteCar: vi.fn(),
        setActiveCar: vi.fn(),
      };

      await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      const copyBtn = screen.getByTestId(
        'copy-vin-button'
      ) as HTMLIonButtonElement;
      expect(copyBtn.disabled).toBe(true);
    });
  });

  describe('add mode (1+ cars)', () => {
    it('should show back button and "Dodaj auto" title', async () => {
      const mockCarService = {
        hasCars: signal(true),
        cars: signal<Car[]>([]),
        addCar: vi.fn(),
        deleteCar: vi.fn(),
        setActiveCar: vi.fn(),
      };

      await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
        ],
      });

      // The page title is "Dodaj auto"
      const title = document.querySelector('ion-title');
      expect(title?.textContent?.trim()).toBe('Dodaj auto');
      expect(document.querySelectorAll('ion-back-button').length).toBeGreaterThan(0);
      expect(screen.queryByText('🚗 Witaj w swoim garażu!')).toBeNull();
    });
  });
});