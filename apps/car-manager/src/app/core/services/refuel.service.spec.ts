import type { Firestore } from 'firebase/firestore';
// spec: docs/specs/02-login-screen.md
import { TestBed } from '@angular/core/testing';
import { RefuelService } from './refuel.service';
import { FirestoreCrudService } from './firestore-crud.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import type { Refuel } from '../models/refuel.model';

// ── Mocks ──

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
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
  db: {} as Firestore,
}));

const storageData = new Map<string, unknown>();

const mockStorageService = {
  get: vi.fn(
    async <T>(key: string): Promise<T | null> => (storageData.get(key) as T | null) ?? null,
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

const mockCrudService = {
  startListening: vi.fn(),
  stopListening: vi.fn(),
  addBase: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  syncToFirestore: vi.fn(),
  getAllLocal: vi.fn(),
  toFirestoreData: vi.fn(),
};

describe('RefuelService', () => {
  let service: RefuelService;

  beforeEach(() => {
    storageData.clear();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        RefuelService,
        { provide: FirestoreCrudService, useValue: mockCrudService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(RefuelService);
  });

  describe('startListening()', () => {
    it('powinien delegować do FirestoreCrudService z własnym sygnałem refuels', () => {
      service.startListening('car1');
      expect(mockCrudService.startListening).toHaveBeenCalledWith(
        'refuels',
        'refuels',
        'car1',
        service.refuels,
      );
    });

    it('powinien ustawić isLoading na false', () => {
      service.isLoading.set(true);
      service.startListening('car1');
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('stopListening()', () => {
    it('powinien delegować do FirestoreCrudService', () => {
      service.stopListening();
      expect(mockCrudService.stopListening).toHaveBeenCalledWith('refuels');
    });
  });

  describe('add()', () => {
    it('powinien delegować do crud i obliczyć consumption', async () => {
      mockCrudService.addBase.mockResolvedValue({
        id: 'r1',
        carId: 'car1',
        date: '2026-03-01',
        amount: 300,
        mileage: 51000,
        liters: 40,
        isVerva: false,
        isSkipped: false,
        createdBy: 'test-uid-123',
      } as Refuel);

      // Pre-populate storage with a previous refuel for consumption calculation
      const { Timestamp } = await import('firebase/firestore');
      storageData.set('refuels:car1', [
        {
          id: 'prev',
          carId: 'car1',
          date: '2026-02-01',
          amount: 200,
          mileage: 50000,
          liters: 38,
          isVerva: false,
          isSkipped: false,
          createdBy: 'u1',
          createdAt: Timestamp.now(),
        },
      ]);

      const refuel = await service.add({
        carId: 'car1',
        date: '2026-03-01',
        amount: 300,
        mileage: 51000,
        liters: 40,
        isVerva: false,
        isSkipped: false,
      });

      expect(mockCrudService.addBase).toHaveBeenCalledWith('refuels', 'refuels', {
        carId: 'car1',
        date: '2026-03-01',
        amount: 300,
        mileage: 51000,
        liters: 40,
        isVerva: false,
        isSkipped: false,
      });

      // Consumption: (40 / (51000 - 50000)) * 100 = 4.0 L/100km
      expect(refuel.consumption).toBe(4);
    });

    it('powinien rzucić błąd gdy użytkownik nie jest zalogowany (przed crud)', async () => {
      mockAuthService.currentUser.mockReturnValueOnce(null);

      await expect(
        service.add({
          carId: 'car1',
          date: '2026-03-01',
          amount: 300,
          mileage: 51000,
          liters: 40,
          isVerva: false,
          isSkipped: false,
        }),
      ).rejects.toThrow('User must be logged in');

      expect(mockCrudService.addBase).not.toHaveBeenCalled();
    });

    it('powinien obsłużyć brak poprzedniego tankowania (brak consumption)', async () => {
      mockCrudService.addBase.mockResolvedValue({
        id: 'r1',
        carId: 'car1',
        date: '2026-03-01',
        amount: 300,
        mileage: 51000,
        liters: 40,
        isVerva: false,
        isSkipped: false,
        createdBy: 'test-uid-123',
      } as Refuel);

      const refuel = await service.add({
        carId: 'car1',
        date: '2026-03-01',
        amount: 300,
        mileage: 51000,
        liters: 40,
        isVerva: false,
        isSkipped: false,
      });

      expect(refuel.consumption).toBeUndefined();
    });
  });

  describe('update()', () => {
    it('powinien delegować do FirestoreCrudService', async () => {
      await service.update('r1', { amount: 220, carId: 'car1' });
      expect(mockCrudService.update).toHaveBeenCalledWith('refuels', 'r1', {
        amount: 220,
        carId: 'car1',
      });
    });
  });

  describe('delete()', () => {
    it('powinien delegować do FirestoreCrudService', async () => {
      await service.delete('r1', 'car1');
      expect(mockCrudService.delete).toHaveBeenCalledWith('refuels', 'r1', 'car1');
    });
  });

  describe('syncToFirestore()', () => {
    it('powinien delegować do FirestoreCrudService', async () => {
      mockCrudService.syncToFirestore.mockResolvedValue(undefined);
      await service.syncToFirestore('car1');
      expect(mockCrudService.syncToFirestore).toHaveBeenCalledWith('refuels', 'refuels', 'car1');
    });
  });

  describe('getAllLocal()', () => {
    it('powinien delegować do FirestoreCrudService', async () => {
      mockCrudService.getAllLocal.mockResolvedValue([]);
      const result = await service.getAllLocal('car1');
      expect(mockCrudService.getAllLocal).toHaveBeenCalledWith('refuels', 'car1');
      expect(result).toEqual([]);
    });
  });
});
