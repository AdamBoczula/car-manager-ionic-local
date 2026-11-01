// spec: docs/specs/02-login-screen.md
import { TestBed } from '@angular/core/testing';
import { RefuelService } from './refuel.service';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import type { User } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
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
    now: () => ({ seconds: 1, nanoseconds: 0, toDate: () => new Date(2026, 0, 1) }),
  },
  enableIndexedDbPersistence: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
}));

vi.mock('../firebase', () => ({
  db: {} as unknown,
  auth: {} as unknown,
}));

const mockUser: Partial<User> = {
  uid: 'test-uid-123',
  email: 'test@example.com',
};

const storageData = new Map<string, unknown>();

const mockStorageService = {
  get: vi.fn(async <T>(key: string): Promise<T | null> => (storageData.get(key) as T | null) ?? null),
  set: vi.fn(async (key: string, value: unknown) => { storageData.set(key, value); }),
  remove: vi.fn(async (key: string) => { storageData.delete(key); }),
  keys: vi.fn(async () => Array.from(storageData.keys())),
  clear: vi.fn(async () => { storageData.clear(); }),
  init: vi.fn(async () => {}),
};

const mockAuthService = {
  currentUser: vi.fn(() => mockUser as User),
  isLoggedIn: vi.fn(() => true),
  authReady: vi.fn(() => true),
};

describe('RefuelService', () => {
  let service: RefuelService;

  beforeEach(() => {
    storageData.clear();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        RefuelService,
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(RefuelService);
  });

  describe('startListening()', () => {
    it('powinien załadować dane z cache przed Firestore', async () => {
      const cachedRefuels: Refuel[] = [
        {
          id: 'r1',
          carId: 'car1',
          date: '2026-01-01',
          amount: 200,
          mileage: 50000,
          liters: 45,
          isVerva: false,
          isSkipped: false,
          createdBy: 'u1',
          createdAt: Timestamp.now(),
        },
      ];
      storageData.set('refuels:car1', cachedRefuels);

      const { onSnapshot } = await import('firebase/firestore');
      (onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_q, cb) => {
        // Simulate: Firestore returns empty initially
        setTimeout(() => cb({ docs: [] }), 0);
        return vi.fn(); // unsubscribe
      });

      await service.startListening('car1');

      // Should have loaded cached data immediately
      expect(service.refuels()).toEqual(cachedRefuels);
    });

    it('powinien zaktualizować dane z Firestore gdy snapshot emituje', async () => {
      const { onSnapshot } = await import('firebase/firestore');
      const firestoreRefuels = [
        {
          id: 'fs1',
          data: () => ({
            carId: 'car1',
            date: '2026-02-01',
            amount: 250,
            mileage: 50500,
            liters: 42,
            isVerva: true,
            isSkipped: false,
            createdBy: 'u1',
            createdAt: Timestamp.now(),
          }),
        },
      ];

      (onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_q, cb, errCb) => {
        setTimeout(() => cb({ docs: firestoreRefuels }), 0);
        return vi.fn();
      });

      await service.startListening('car1');

      // Fast forward — need to wait for the async callback
      await new Promise((r) => setTimeout(r, 10));

      expect(service.refuels().length).toBe(1);
      expect(service.refuels()[0].id).toBe('fs1');
      expect(service.refuels()[0].amount).toBe(250);
    });

    it('powinien wywołać stopListening przy drugim wywołaniu', async () => {
      const { onSnapshot } = await import('firebase/firestore');
      const unsubscribeSpy = vi.fn();
      (onSnapshot as ReturnType<typeof vi.fn>).mockReturnValue(unsubscribeSpy);

      await service.startListening('car1');
      await service.startListening('car2');

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });

  describe('add()', () => {
    it('powinien zapisać lokalnie i próbować zsynchronizować do Firestore', async () => {
      const { addDoc } = await import('firebase/firestore');
      (addDoc as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'firestore-id-1' });

      const refuel = await service.add({
        carId: 'car1',
        date: '2026-03-01',
        amount: 300,
        mileage: 51000,
        liters: 40,
        isVerva: false,
        isSkipped: false,
      });

      expect(refuel.carId).toBe('car1');
      expect(refuel.amount).toBe(300);
      expect(refuel.createdBy).toBe('test-uid-123');
      expect(addDoc).toHaveBeenCalled();

      // Should have saved to local storage
      const stored = storageData.get('refuels:car1') as Refuel[];
      expect(stored).toBeDefined();
      expect(stored.length).toBe(1);
    });

    it('powinien rzucić błąd gdy użytkownik nie jest zalogowany', async () => {
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
        })
      ).rejects.toThrow('User must be logged in');
    });

    it('powinien zapisać lokalnie nawet gdy Firestore rzuci błędem (offline)', async () => {
      const { addDoc } = await import('firebase/firestore');
      (addDoc as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const refuel = await service.add({
        carId: 'car1',
        date: '2026-03-15',
        amount: 280,
        mileage: 51500,
        liters: 38,
        isVerva: false,
        isSkipped: false,
      });

      // Should still be saved locally
      expect(refuel.carId).toBe('car1');
      const stored = storageData.get('refuels:car1') as Refuel[];
      expect(stored).toBeDefined();
      expect(stored.length).toBe(1);
    });
  });

  describe('delete()', () => {
    it('powinien usunąć z lokalnego storage i Firestore', async () => {
      // Pre-populate storage
      storageData.set('refuels:car1', [
        {
          id: 'r1',
          carId: 'car1',
          date: '2026-01-01',
          amount: 200,
          mileage: 50000,
          liters: 45,
          isVerva: false,
          isSkipped: false,
          createdBy: 'u1',
          createdAt: Timestamp.now(),
        },
      ]);

      const { deleteDoc } = await import('firebase/firestore');
      (deleteDoc as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await service.delete('r1', 'car1');

      const stored = storageData.get('refuels:car1') as Refuel[];
      expect(stored.length).toBe(0);
      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});