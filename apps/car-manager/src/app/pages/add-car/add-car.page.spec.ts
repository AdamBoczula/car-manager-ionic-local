// spec: docs/specs/05-car-management.md
// covers: docs/specs/05-car-management.md#AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-18, AC-19, AC-20
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideRouter } from '@angular/router';
import { NavController, provideIonicAngular } from '@ionic/angular';
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
      const navigateRoot = vi.fn().mockResolvedValue(true);

      await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
          { provide: NavController, useValue: { navigateRoot } },
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

    // covers: docs/specs/05-car-management.md#AC-3
    it('should add car, set as active, and navigate to dashboard', async () => {
      const user = userEvent.setup();
      const navigateRoot = vi.fn().mockResolvedValue(true);
      const mockCarService = {
        hasCars: signal(false),
        cars: signal<Car[]>([]),
        addCar: vi.fn().mockImplementation(async (name: string) =>
          createMockCar(name, `car-${Date.now()}`)
        ),
        deleteCar: vi.fn(),
        setActiveCar: vi.fn().mockResolvedValue(undefined),
      };

      const { fixture } = await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
          { provide: NavController, useValue: { navigateRoot } },
        ],
      });

      fixture.componentInstance.newCarName.set('Toyota');
      fixture.detectChanges();

      const addBtn = screen.getByTestId('add-car-button') as HTMLButtonElement;
      expect(addBtn.disabled).toBe(false);

      await user.click(addBtn);

      expect(mockCarService.addCar).toHaveBeenCalledWith('Toyota', {});
      expect(mockCarService.setActiveCar).toHaveBeenCalled();
      expect(navigateRoot).toHaveBeenCalledWith('/dashboard', { animated: false });
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
      const navigateRoot = vi.fn().mockResolvedValue(true);

      await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
          { provide: NavController, useValue: { navigateRoot } },
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
        deleteCar: vi.fn(),
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
        deleteCar: vi.fn(),
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

    it('should add car, set as active, and navigate to dashboard', async () => {
      const user = userEvent.setup();
      const navigateRoot = vi.fn().mockResolvedValue(true);
      const mockCarService = {
        hasCars: signal(true),
        cars: signal<Car[]>([]),
        addCar: vi.fn().mockImplementation(async (name: string) =>
          createMockCar(name, `car-${Date.now()}`)
        ),
        deleteCar: vi.fn(),
        setActiveCar: vi.fn().mockResolvedValue(undefined),
      };

      const { fixture } = await render(AddCarPage, {
        providers: [
          provideRouter(routes),
          provideIonicAngular({ mode: 'md' }),
          { provide: CarService, useValue: mockCarService },
          { provide: NavController, useValue: { navigateRoot } },
        ],
      });

      fixture.componentInstance.newCarName.set('Honda');
      fixture.detectChanges();
      await user.click(screen.getByTestId('add-car-button'));

      expect(mockCarService.addCar).toHaveBeenCalledWith('Honda', {});
      expect(mockCarService.setActiveCar).toHaveBeenCalled();
      expect(navigateRoot).toHaveBeenCalledWith('/dashboard', { animated: false });
    });
  });
});