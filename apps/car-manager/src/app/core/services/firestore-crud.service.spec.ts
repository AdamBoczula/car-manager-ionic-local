import type { Firestore } from 'firebase/firestore';
import { TestBed } from '@angular/core/testing';
import { FirestoreCrudService } from './firestore-crud.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { signal } from '@angular/core';

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
}));

vi.mock('../firebase', () => ({
  db: {} as Firestore,
}));

interface TestEntry {
  id: string;
  carId: string;
  date: string;
  amount: number;
  mileage: number;
  createdBy: string;
  createdAt: object;
}

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

describe('FirestoreCrudService', () => {
  let service: FirestoreCrudService;

  beforeEach(() => {
    storageData.clear();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        FirestoreCrudService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(FirestoreCrudService);
  });

  describe('startListening() / stopListening()', () => {
    it('powinien załadować dane z cache na podany signal', async () => {
      const { Timestamp } = await import('firebase/firestore');
      const cached: TestEntry[] = [
        {
          id: 'e1',
          carId: 'car1',
          date: '2026-01-01',
          amount: 200,
          mileage: 50000,
          createdBy: 'u1',
          createdAt: Timestamp.now(),
        },
      ];
      storageData.set('test:car1', cached);

      const { onSnapshot } = await import('firebase/firestore');
      let resolveSnapshot!: (value: unknown) => void;
      (onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_q, _cb, _errCb) => {
        // Never resolve — we only test cache here
        return new Promise(() => {});
      });

      const mySignal = signal<TestEntry[]>([]);
      service.startListening<TestEntry>('test', 'test', 'car1', mySignal);

      // Wait for the async loadFromCache to complete
      await vi.waitFor(() => {
        expect(mySignal()).toEqual(cached);
      });
    });

    it('powinien zaktualizować signal z Firestore gdy snapshot emituje', async () => {
      const { Timestamp, onSnapshot } = await import('firebase/firestore');
      const firestoreData = [
        {
          id: 'fs1',
          data: () => ({
            carId: 'car1',
            date: '2026-02-01',
            amount: 250,
            mileage: 50500,
            createdBy: 'u1',
            createdAt: Timestamp.now(),
          }),
        },
      ];

      (onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_q, cb) => {
        setTimeout(() => cb({ docs: firestoreData }), 0);
        return vi.fn();
      });

      const mySignal = signal<TestEntry[]>([]);
      service.startListening<TestEntry>('test', 'test', 'car1', mySignal);

      await new Promise((r) => setTimeout(r, 10));

      expect(mySignal().length).toBe(1);
      expect(mySignal()[0].id).toBe('fs1');
    });

    it('powinien wywołać unsubscribe przy stopListening', async () => {
      const { onSnapshot } = await import('firebase/firestore');
      const unsubscribeSpy = vi.fn();
      (onSnapshot as ReturnType<typeof vi.fn>).mockReturnValue(unsubscribeSpy);

      const mySignal = signal<TestEntry[]>([]);
      service.startListening<TestEntry>('test', 'test', 'car1', mySignal);
      service.stopListening('test');

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('powinien wyczyścić signal gdy nowe auto nie ma cache', async () => {
      const { Timestamp, onSnapshot } = await import('firebase/firestore');
      const mySignal = signal<TestEntry[]>([]);
      service.startListening<TestEntry>('test', 'test', 'car1', mySignal);
      (onSnapshot as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());

      // Pre-set some data
      mySignal.set([
        {
          id: 'old',
          carId: 'car1',
          date: '2026-01-01',
          amount: 200,
          mileage: 50000,
          createdBy: 'u1',
          createdAt: Timestamp.now(),
        },
      ]);

      // Clear cache so startListening with new carId resets signal
      storageData.delete('test:car2');
      service.startListening<TestEntry>('test', 'test', 'car2', mySignal);

      await new Promise((r) => setTimeout(r, 10));

      expect(mySignal()).toEqual([]);
    });

    it('powinien zignorować spóźniony cache poprzedniego auta', async () => {
      const { Timestamp, onSnapshot } = await import('firebase/firestore');
      let resolveFirst!: (value: TestEntry[]) => void;
      const firstCache = new Promise<TestEntry[]>((resolve) => {
        resolveFirst = resolve;
      });
      mockStorageService.get.mockImplementationOnce(() => firstCache).mockResolvedValueOnce([]);
      (onSnapshot as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());

      const mySignal = signal<TestEntry[]>([]);
      service.startListening<TestEntry>('test', 'test', 'car1', mySignal);
      service.startListening<TestEntry>('test', 'test', 'car2', mySignal);
      resolveFirst([
        {
          id: 'late',
          carId: 'car1',
          date: '2026-01-01',
          amount: 200,
          mileage: 50000,
          createdBy: 'u1',
          createdAt: Timestamp.now(),
        },
      ]);
      await firstCache;

      expect(mySignal()).toEqual([]);
    });
  });

  describe('addBase()', () => {
    it('powinien zapisać lokalnie i zaktualizować sygnał', async () => {
      const { addDoc, onSnapshot } = await import('firebase/firestore');
      (addDoc as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'firestore-id-1' });

      const mySignal = signal<TestEntry[]>([]);
      service.startListening<TestEntry>('test', 'test', 'car1', mySignal);

      await new Promise((r) => setTimeout(r, 10));

      const entry = await service.addBase<TestEntry>('test', 'test', {
        carId: 'car1',
        date: '2026-03-01',
        amount: 300,
        mileage: 51000,
      });

      expect(entry.carId).toBe('car1');
      expect(entry.amount).toBe(300);
      expect(entry.createdBy).toBe('test-uid-123');
      expect(addDoc).toHaveBeenCalled();

      const stored = storageData.get('test:car1') as TestEntry[];
      expect(stored).toBeDefined();
      expect(stored.length).toBe(1);

      // Signal should be updated with local data
      expect(mySignal().length).toBe(1);
      expect(mySignal()[0].amount).toBe(300);
    });

    it('powinien rzucić błąd gdy użytkownik nie jest zalogowany', async () => {
      mockAuthService.currentUser.mockReturnValueOnce(null);

      const mySignal = signal<TestEntry[]>([]);
      service.startListening<TestEntry>('test', 'test', 'car1', mySignal);

      await expect(
        service.addBase<TestEntry>('test', 'test', {
          carId: 'car1',
          date: '2026-03-01',
          amount: 300,
          mileage: 51000,
        }),
      ).rejects.toThrow('User must be logged in');
    });

    it('powinien zapisać lokalnie i zaktualizować sygnał nawet gdy Firestore rzuci błędem (offline)', async () => {
      const { addDoc, onSnapshot } = await import('firebase/firestore');
      (addDoc as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const mySignal = signal<TestEntry[]>([]);
      service.startListening<TestEntry>('test', 'test', 'car1', mySignal);

      await new Promise((r) => setTimeout(r, 10));

      const entry = await service.addBase<TestEntry>('test', 'test', {
        carId: 'car1',
        date: '2026-03-15',
        amount: 280,
        mileage: 51500,
      });

      const stored = storageData.get('test:car1') as TestEntry[];
      expect(stored).toBeDefined();
      expect(stored.length).toBe(1);

      // Signal must be updated even when offline
      expect(mySignal().length).toBe(1);
      expect(mySignal()[0].amount).toBe(280);
    });
  });

  describe('update()', () => {
    it('powinien zaktualizować lokalnie i odświeżyć sygnał', async () => {
      const { Timestamp, onSnapshot } = await import('firebase/firestore');
      const existing: TestEntry = {
        id: 'r1',
        carId: 'car1',
        date: '2026-01-01',
        amount: 200,
        mileage: 50000,
        createdBy: 'u1',
        createdAt: Timestamp.now(),
      };
      storageData.set('test:car1', [existing]);

      const mySignal = signal<TestEntry[]>([existing]);
      service.startListening<TestEntry>('test', 'test', 'car1', mySignal);

      await new Promise((r) => setTimeout(r, 10));

      const { updateDoc } = await import('firebase/firestore');
      (updateDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await service.update('test', 'r1', { amount: 220, carId: 'car1' });

      const stored = storageData.get('test:car1') as TestEntry[];
      expect(stored[0].amount).toBe(220);
      expect(mySignal()[0].amount).toBe(220);
    });
  });

  describe('delete()', () => {
    it('powinien usunąć z lokalnego storage i zaktualizować sygnał', async () => {
      const { Timestamp, onSnapshot } = await import('firebase/firestore');
      const existing: TestEntry = {
        id: 'r1',
        carId: 'car1',
        date: '2026-01-01',
        amount: 200,
        mileage: 50000,
        createdBy: 'u1',
        createdAt: Timestamp.now(),
      };
      storageData.set('test:car1', [existing]);

      const mySignal = signal<TestEntry[]>([existing]);
      service.startListening<TestEntry>('test', 'test', 'car1', mySignal);

      await new Promise((r) => setTimeout(r, 10));

      const { deleteDoc } = await import('firebase/firestore');
      (deleteDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await service.delete('test', 'r1', 'car1');

      const stored = storageData.get('test:car1') as TestEntry[];
      expect(stored.length).toBe(0);
      expect(mySignal().length).toBe(0);
    });
  });

  describe('syncToFirestore()', () => {
    it('powinien zsynchronizować lokalne wpisy do Firestore', async () => {
      const { Timestamp, addDoc } = await import('firebase/firestore');
      const local: (TestEntry & { extraField?: string })[] = [
        {
          id: crypto.randomUUID(),
          carId: 'car1',
          date: '2026-01-01',
          amount: 200,
          mileage: 50000,
          createdBy: 'u1',
          createdAt: Timestamp.now(),
          extraField: 'test',
        },
      ];
      storageData.set('test:car1', local);

      (addDoc as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'fs-id' });

      await service.syncToFirestore<TestEntry>('test', 'test', 'car1');

      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('getAllLocal()', () => {
    it('powinien zwrócić dane z cache', async () => {
      const { Timestamp } = await import('firebase/firestore');
      const cached: TestEntry[] = [
        {
          id: 'e1',
          carId: 'car1',
          date: '2026-01-01',
          amount: 200,
          mileage: 50000,
          createdBy: 'u1',
          createdAt: Timestamp.now(),
        },
      ];
      storageData.set('test:car1', cached);

      const result = await service.getAllLocal<TestEntry>('test', 'car1');

      expect(result).toEqual(cached);
    });

    it('powinien zwrócić pustą tablicę gdy brak danych', async () => {
      const result = await service.getAllLocal<TestEntry>('test', 'car1');
      expect(result).toEqual([]);
    });
  });

  describe('toFirestoreData()', () => {
    it('powinien usunąć id i undefined wartości', () => {
      const data = service.toFirestoreData<TestEntry & { extra?: string }>({
        id: 'x',
        carId: 'car1',
        date: '2026-01-01',
        amount: 200,
        mileage: 50000,
        createdBy: 'u1',
        createdAt: null as unknown as object,
        extra: undefined,
      });

      expect(data.id).toBeUndefined();
      expect(data.extra).toBeUndefined();
      expect(data.carId).toBe('car1');
    });
  });

  describe('jednoczesne listenery różnych kolekcji', () => {
    it('powinien obsługiwać osobne listenery dla różnych kolekcji', async () => {
      const { onSnapshot } = await import('firebase/firestore');
      const unsub1 = vi.fn();
      const unsub2 = vi.fn();
      const calls: string[] = [];
      (onSnapshot as ReturnType<typeof vi.fn>)
        .mockImplementationOnce((_q, _cb, _errCb) => {
          calls.push('refuels');
          return unsub1;
        })
        .mockImplementationOnce((_q, _cb, _errCb) => {
          calls.push('repairs');
          return unsub2;
        });

      const signal1 = signal<TestEntry[]>([]);
      const signal2 = signal<TestEntry[]>([]);

      service.startListening<TestEntry>('refuels', 'refuels', 'car1', signal1);
      service.startListening<TestEntry>('repairs', 'repairs', 'car2', signal2);

      expect(calls).toEqual(['refuels', 'repairs']);

      service.stopListening('refuels');
      expect(unsub1).toHaveBeenCalled();
      expect(unsub2).not.toHaveBeenCalled();

      service.stopListening('repairs');
      expect(unsub2).toHaveBeenCalled();
    });
  });
});
