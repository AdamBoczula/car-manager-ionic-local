// spec: docs/specs/02-login-screen.md
import { TestBed } from '@angular/core/testing';
import { RepairService } from './repair.service';
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

describe('RepairService', () => {
  let service: RepairService;

  beforeEach(() => {
    storageData.clear();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        RepairService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(RepairService);
  });

  describe('startListening()', () => {
    // covers: docs/bugs/03-list-car-switcher-and-repair-back.md
    it('powinien wyczyścić dane poprzedniego auta, gdy nowe auto nie ma cache', async () => {
      const { Timestamp, onSnapshot } = await import('firebase/firestore');
      service.repairs.set([
        {
          id: 'old-repair',
          carId: 'car1',
          date: '2026-01-01',
          amount: 500,
          mileage: 60000,
          location: 'Serwis',
          description: 'Naprawa',
          mechanicNote: '',
          createdBy: 'u1',
          createdAt: Timestamp.now(),
        },
      ]);
      (onSnapshot as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());

      await service.startListening('car2');

      expect(service.repairs()).toEqual([]);
    });

    // covers: docs/bugs/03-list-car-switcher-and-repair-back.md
    it('powinien zignorować spóźniony cache poprzedniego auta', async () => {
      const { Timestamp, onSnapshot } = await import('firebase/firestore');
      let resolveFirst!: (value: Repair[]) => void;
      const firstCache = new Promise<Repair[]>((resolve) => {
        resolveFirst = resolve;
      });
      mockStorageService.get
        .mockImplementationOnce(() => firstCache)
        .mockResolvedValueOnce([]);
      (onSnapshot as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());

      const firstStart = service.startListening('car1');
      await service.startListening('car2');
      resolveFirst([
        {
          id: 'late-repair',
          carId: 'car1',
          date: '2026-01-01',
          amount: 500,
          mileage: 60000,
          location: 'Serwis',
          description: 'Naprawa',
          mechanicNote: '',
          createdBy: 'u1',
          createdAt: Timestamp.now(),
        },
      ]);
      await firstStart;

      expect(service.repairs()).toEqual([]);
      expect(onSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  describe('add()', () => {
    it('powinien zapisać naprawę lokalnie i zsynchronizować do Firestore', async () => {
      const { addDoc } = await import('firebase/firestore');
      (addDoc as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'fs-repair-1',
      });

      const repair = await service.add({
        carId: 'car1',
        date: '2026-03-01',
        amount: 500,
        mileage: 60000,
        location: 'AutoSerwis Kraków',
        description: 'Wymiana klocków i tarcz hamulcowych',
        mechanicNote: 'Mechanik poleca wymianę płynu hamulcowego za 5000 km',
      });

      expect(repair.carId).toBe('car1');
      expect(repair.amount).toBe(500);
      expect(repair.location).toBe('AutoSerwis Kraków');
      expect(repair.createdBy).toBe('test-uid-123');
      expect(addDoc).toHaveBeenCalled();
    });

    it('powinien zapisać lokalnie nawet gdy Firestore jest niedostępny (offline)', async () => {
      const { addDoc } = await import('firebase/firestore');
      (addDoc as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const repair = await service.add({
        carId: 'car1',
        date: '2026-04-01',
        amount: 1200,
        mileage: 65000,
        location: 'ASO Toyota',
        description: 'Wymiana rozrządu',
        mechanicNote: '',
      });

      expect(repair.carId).toBe('car1');
      const stored = storageData.get('repairs:car1') as Repair[];
      expect(stored).toBeDefined();
      expect(stored.length).toBe(1);
    });

    it('powinien rzucić błąd gdy użytkownik nie jest zalogowany', async () => {
      mockAuthService.currentUser.mockReturnValueOnce(null);

      await expect(
        service.add({
          carId: 'car1',
          date: '2026-04-01',
          amount: 1200,
          mileage: 65000,
          location: 'ASO',
          description: 'Naprawa',
          mechanicNote: '',
        })
      ).rejects.toThrow('User must be logged in');
    });
  });

  describe('update()', () => {
    it('powinien zaktualizować lokalnie i w Firestore', async () => {
      const { Timestamp } = await import('firebase/firestore');
      const existing: Repair = {
        id: 'r1',
        carId: 'car1',
        date: '2026-01-01',
        amount: 500,
        mileage: 60000,
        location: 'AutoSerwis',
        description: 'Stary opis',
        mechanicNote: '',
        createdBy: 'u1',
        createdAt: Timestamp.now(),
      };
      storageData.set('repairs:car1', [existing]);

      const { updateDoc } = await import('firebase/firestore');
      (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await service.update('r1', {
        description: 'Nowy opis naprawy',
        carId: 'car1',
      });

      const stored = storageData.get('repairs:car1') as Repair[];
      expect(stored[0].description).toBe('Nowy opis naprawy');
      expect(updateDoc).toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    it('powinien usunąć z lokalnego storage i Firestore', async () => {
      const { Timestamp } = await import('firebase/firestore');
      const existing: Repair = {
        id: 'r1',
        carId: 'car1',
        date: '2026-01-01',
        amount: 500,
        mileage: 60000,
        location: 'ASO',
        description: 'Naprawa',
        mechanicNote: '',
        createdBy: 'u1',
        createdAt: Timestamp.now(),
      };
      storageData.set('repairs:car1', [existing]);

      const { deleteDoc } = await import('firebase/firestore');
      (deleteDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await service.delete('r1', 'car1');

      const stored = storageData.get('repairs:car1') as Repair[];
      expect(stored.length).toBe(0);
      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});
