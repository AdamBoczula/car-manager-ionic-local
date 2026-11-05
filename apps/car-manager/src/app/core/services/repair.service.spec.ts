import type { Firestore } from 'firebase/firestore';
// spec: docs/specs/02-login-screen.md
import { TestBed } from '@angular/core/testing';
import { RepairService } from './repair.service';
import { FirestoreCrudService } from './firestore-crud.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import type { Repair } from '../models/repair.model';

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

describe('RepairService', () => {
  let service: RepairService;

  beforeEach(() => {
    storageData.clear();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        RepairService,
        { provide: FirestoreCrudService, useValue: mockCrudService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(RepairService);
  });

  describe('startListening()', () => {
    it('powinien delegować do FirestoreCrudService z własnym sygnałem repairs', () => {
      service.startListening('car1');
      expect(mockCrudService.startListening).toHaveBeenCalledWith(
        'repairs',
        'repairs',
        'car1',
        service.repairs,
      );
    });
  });

  describe('stopListening()', () => {
    it('powinien delegować do FirestoreCrudService', () => {
      service.stopListening();
      expect(mockCrudService.stopListening).toHaveBeenCalledWith('repairs');
    });
  });

  describe('add()', () => {
    it('powinien delegować do crud i zwrócić naprawę', async () => {
      const expected: Repair = {
        id: 'r1',
        carId: 'car1',
        date: '2026-03-01',
        amount: 500,
        mileage: 60000,
        location: 'AutoSerwis Kraków',
        description: 'Wymiana klocków',
        mechanicNote: '',
        createdBy: 'test-uid-123',
        createdAt: null as unknown as object,
      };
      mockCrudService.addBase.mockResolvedValue(expected);

      const repair = await service.add({
        carId: 'car1',
        date: '2026-03-01',
        amount: 500,
        mileage: 60000,
        location: 'AutoSerwis Kraków',
        description: 'Wymiana klocków',
        mechanicNote: '',
      });

      expect(mockCrudService.addBase).toHaveBeenCalledWith('repairs', 'repairs', {
        carId: 'car1',
        date: '2026-03-01',
        amount: 500,
        mileage: 60000,
        location: 'AutoSerwis Kraków',
        description: 'Wymiana klocków',
        mechanicNote: '',
      });
      expect(repair).toEqual(expected);
    });

    it('powinien rzucić błąd gdy użytkownik nie jest zalogowany (przed crud)', async () => {
      mockAuthService.currentUser.mockReturnValueOnce(null);

      await expect(
        service.add({
          carId: 'car1',
          date: '2026-03-01',
          amount: 500,
          mileage: 60000,
          location: 'ASO',
          description: 'Naprawa',
          mechanicNote: '',
        }),
      ).rejects.toThrow('User must be logged in');

      expect(mockCrudService.addBase).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('powinien delegować do FirestoreCrudService', async () => {
      await service.update('r1', { description: 'Nowy opis', carId: 'car1' });
      expect(mockCrudService.update).toHaveBeenCalledWith('repairs', 'r1', {
        description: 'Nowy opis',
        carId: 'car1',
      });
    });
  });

  describe('delete()', () => {
    it('powinien delegować do FirestoreCrudService', async () => {
      await service.delete('r1', 'car1');
      expect(mockCrudService.delete).toHaveBeenCalledWith('repairs', 'r1', 'car1');
    });
  });

  describe('syncToFirestore()', () => {
    it('powinien delegować do FirestoreCrudService', async () => {
      mockCrudService.syncToFirestore.mockResolvedValue(undefined);
      await service.syncToFirestore('car1');
      expect(mockCrudService.syncToFirestore).toHaveBeenCalledWith('repairs', 'repairs', 'car1');
    });
  });

  describe('getAllLocal()', () => {
    it('powinien delegować do FirestoreCrudService', async () => {
      mockCrudService.getAllLocal.mockResolvedValue([]);
      const result = await service.getAllLocal('car1');
      expect(mockCrudService.getAllLocal).toHaveBeenCalledWith('repairs', 'car1');
      expect(result).toEqual([]);
    });
  });
});
