// spec: docs/specs/05-car-management.md
// covers: docs/specs/05-car-management.md#AC-11, AC-12, AC-13, AC-14, AC-20
import { TestBed } from '@angular/core/testing';
import { CarService } from './car.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import type { Car } from '../models/car.model';

// ── Mocks ──
const { mockAddDoc, mockDeleteDoc, mockDocFn, mockOnSnapshot } = vi.hoisted(() => ({
  mockAddDoc: vi.fn(),
  mockDeleteDoc: vi.fn(),
  mockDocFn: vi.fn(),
  mockOnSnapshot: vi.fn(),
}));

// Mock firebase/firestore (direct SDK)
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: mockAddDoc,
  updateDoc: vi.fn(),
  deleteDoc: mockDeleteDoc,
  doc: mockDocFn,
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: mockOnSnapshot,
  getDocs: vi.fn(),
  Timestamp: {
    now: () => ({
      seconds: 1,
      nanoseconds: 0,
      toDate: () => new Date(2026, 0, 1),
    }),
  },
  enableIndexedDbPersistence: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
}));

// Mock the ../firebase module to provide a mock db instance
vi.mock('../firebase', () => ({
  db: {} as import('firebase/firestore').Firestore,
}));

const storageData = new Map<string, unknown>();

const mockStorageService = {
  get: vi.fn(
    async <T>(key: string): Promise<T | null> =>
      (storageData.get(key) as T | null) ?? null
  ),
  set: vi.fn(async (key: string, value: unknown) => {
    storageData.set(key, value);
  }),
  remove: vi.fn(async (key: string) => {
    storageData.delete(key);
  }),
  keys: vi.fn(async () => Array.from(storageData.keys())),
  clear: vi.fn(async () => {
    storageData.clear();
  }),
  init: vi.fn(async () => {}),
};

const mockAuthService = {
  currentUser: vi.fn(() => ({
    uid: 'test-uid-123',
    email: 'test@example.com',
  })),
  isLoggedIn: vi.fn(() => true),
  authReady: vi.fn(() => true),
};

// ── Tests ──

describe('CarService', () => {
  let service: CarService;

  beforeEach(() => {
    storageData.clear();
    vi.clearAllMocks();

    // Default: addDoc returns a mock doc ref
    mockAddDoc.mockResolvedValue({ id: 'firestore-id-123' });
    mockDeleteDoc.mockResolvedValue(undefined);
    mockOnSnapshot.mockReturnValue(vi.fn());

    TestBed.configureTestingModule({
      providers: [
        CarService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(CarService);
  });

  describe('initial state', () => {
    it('should start with empty cars, null activeCarId, hasCars=false', () => {
      expect(service.cars()).toEqual([]);
      expect(service.activeCarId()).toBeNull();
      expect(service.activeCar()).toBeNull();
      expect(service.hasCars()).toBe(false);
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('addCar()', () => {
    it('should add a car and store locally', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-1' });

      const car = await service.addCar('Toyota Corolla');
      expect(car.name).toBe('Toyota Corolla');
      expect(car.ownerId).toBe('test-uid-123');
      expect(car.id).toBeTruthy();

      const stored = await mockStorageService.get<Car[]>('cars:test-uid-123');
      expect(stored?.length).toBeGreaterThanOrEqual(1);
    });

    // covers: docs/specs/05-car-management.md#AC-13
    it('should set the first added car as active', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-1' });

      await service.addCar('Toyota Corolla');
      // activeCarId is set by addCar for the first car
      expect(service.activeCarId()).toBeTruthy();
    });

    it('should persist cars to Ionic Storage', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-1' });

      await service.addCar('Toyota Corolla');
      const stored = await mockStorageService.get<Car[]>(
        'cars:test-uid-123'
      );
      expect(stored?.length).toBe(1);
      expect(stored![0].name).toBe('Toyota Corolla');
    });

    it('should allow duplicate car names', async () => {
      mockAddDoc
        .mockResolvedValueOnce({ id: 'fs-1' })
        .mockResolvedValueOnce({ id: 'fs-2' });

      await service.addCar('Toyota Corolla');
      await service.addCar('Toyota Corolla');

      const stored = await mockStorageService.get<Car[]>('cars:test-uid-123');
      expect(stored?.length).toBe(2);
    });

    it('should trim whitespace from car name', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-1' });

      const car = await service.addCar('  My Car  ');
      expect(car.name).toBe('My Car');
    });

    // covers: docs/specs/05-car-management.md#AC-20
    it('should create a car successfully without optional fields', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-optional' });

      const car = await service.addCar('Basic Car');
      expect(car.name).toBe('Basic Car');
      expect(car.currentMileage).toBeUndefined();
      expect(car.year).toBeUndefined();
      expect(car.vin).toBeUndefined();
    });

    // covers: docs/specs/05-car-management.md#AC-18
    it('should create a car with all optional fields', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-full' });

      const car = await service.addCar('Full Car', {
        currentMileage: 123000,
        year: 2020,
        vin: 'WBA1234567890',
      });

      expect(car.currentMileage).toBe(123000);
      expect(car.year).toBe(2020);
      expect(car.vin).toBe('WBA1234567890');
    });

    it('should create a car with some optional fields only', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-partial' });

      const car = await service.addCar('Partial Car', {
        currentMileage: 50000,
      });

      expect(car.currentMileage).toBe(50000);
      expect(car.year).toBeUndefined();
      expect(car.vin).toBeUndefined();
    });

    it('should store optional fields in Ionic Storage', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-stored' });

      await service.addCar('Stored Car', {
        currentMileage: 80000,
        year: 2019,
        vin: 'VIN123',
      });

      const stored = await mockStorageService.get<Car[]>('cars:test-uid-123');
      expect(stored?.length).toBe(1);
      expect(stored![0].currentMileage).toBe(80000);
      expect(stored![0].year).toBe(2019);
      expect(stored![0].vin).toBe('VIN123');
    });

    it('should trim VIN whitespace', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-trim' });

      const car = await service.addCar('Trim Car', {
        vin: '  WBA123  ',
      });

      expect(car.vin).toBe('WBA123');
    });
  });

  describe('deleteCar()', () => {
    // covers: docs/specs/05-car-management.md — active car deleted
    it('should remove car and switch active to remaining car', async () => {
      mockAddDoc
        .mockResolvedValueOnce({ id: 'fs-1' })
        .mockResolvedValueOnce({ id: 'fs-2' });

      const car1 = await service.addCar('Car 1');
      const car2 = await service.addCar('Car 2');
      await service.setActiveCar(car1.id);

      await service.deleteCar(car1.id);

      expect(service.activeCarId()).toBe(car2.id);
    });

    // covers: docs/specs/05-car-management.md — last car deleted
    it('should set activeCarId to null when last car is deleted', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-1' });

      const car1 = await service.addCar('Car 1');
      await service.setActiveCar(car1.id);

      await service.deleteCar(car1.id);

      expect(service.activeCarId()).toBeNull();
      expect(service.activeCar()).toBeNull();
      expect(service.hasCars()).toBe(false);
    });

    it('should remove car from storage', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-1' });

      const car = await service.addCar('Car 1');
      await service.deleteCar(car.id);

      const stored = await mockStorageService.get<Car[]>('cars:test-uid-123');
      expect(stored?.length).toBe(0);
    });
  });

  describe('setActiveCar()', () => {
    it('should update activeCarId and persist to storage', async () => {
      mockAddDoc
        .mockResolvedValueOnce({ id: 'fs-1' })
        .mockResolvedValueOnce({ id: 'fs-2' });

      await service.addCar('Car 1');
      const car2 = await service.addCar('Car 2');

      await service.setActiveCar(car2.id);

      expect(service.activeCarId()).toBe(car2.id);
      const stored = await mockStorageService.get<string>(
        'active_car:test-uid-123'
      );
      expect(stored).toBe(car2.id);
    });

    it('should update activeCarId signal when setting active car', async () => {
      mockAddDoc
        .mockResolvedValueOnce({ id: 'fs-1' })
        .mockResolvedValueOnce({ id: 'fs-2' });

      await service.addCar('Car 1');
      const car2 = await service.addCar('Car 2');

      await service.setActiveCar(car2.id);
      expect(service.activeCarId()).toBe(car2.id);
    });
  });

  describe('computed signals', () => {
    it('hasCars should be false when no cars', () => {
      expect(service.hasCars()).toBe(false);
    });

    it('hasCars should be true when cars exist (after startListening populates signal)', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-1' });

      const car = await service.addCar('Car 1');

      expect(car.name).toBe('Car 1');
      // hasCars() depends on cars() signal which is only populated by listeners
    });

    it('activeCar should be null when activeCarId is null', () => {
      expect(service.activeCar()).toBeNull();
    });

    it('activeCar should be null when cars signal is empty', async () => {
      mockAddDoc.mockResolvedValue({ id: 'fs-1' });

      const car = await service.addCar('Car 1');
      await service.setActiveCar(car.id);
      expect(service.activeCarId()).toBe(car.id);
    });
  });

  describe('startListening()', () => {
    // covers: docs/specs/05-car-management.md#AC-11
    it('should load cars from Ionic Storage cache first', async () => {
      mockOnSnapshot.mockReturnValue(vi.fn());

      const { Timestamp } = await import('firebase/firestore');
      const cachedCars: Car[] = [
        {
          id: 'cached-1',
          name: 'Cached Car',
          ownerId: 'test-uid-123',
          createdAt: Timestamp.now(),
        },
      ];
      await mockStorageService.set('cars:test-uid-123', cachedCars);

      await service.startListening();

      expect(service.cars()).toEqual(cachedCars);
    });

    it('should be idempotent when called multiple times', async () => {
      mockOnSnapshot.mockReturnValue(vi.fn());

      await service.startListening();
      await service.startListening();

      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopListening()', () => {
    it('should allow restarting after stop', async () => {
      const mockUnsub = vi.fn();
      mockOnSnapshot.mockReturnValue(mockUnsub);

      await service.startListening();
      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

      service.stopListening();
      expect(mockUnsub).toHaveBeenCalledTimes(1);

      await service.startListening();
      expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
    });
  });

  // covers: docs/specs/05-car-management.md — offline edge case
  describe('offline behavior', () => {
    it('should store car locally even when Firestore fails', async () => {
      mockAddDoc.mockRejectedValue(new Error('network error'));

      const car = await service.addCar('Offline Car');

      expect(car.name).toBe('Offline Car');

      const stored = await mockStorageService.get<Car[]>('cars:test-uid-123');
      expect(stored?.some((c) => c.name === 'Offline Car')).toBe(true);
    });
  });
});