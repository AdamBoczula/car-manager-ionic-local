// spec: docs/specs/02-login-screen.md
import { TestBed } from '@angular/core/testing';
import { SyncService } from './sync.service';
import { RefuelService } from './refuel.service';
import { RepairService } from './repair.service';
import { AuthService } from './auth.service';

const mockRefuelService = {
  syncToFirestore: vi.fn().mockResolvedValue(undefined),
};

const mockRepairService = {
  syncToFirestore: vi.fn().mockResolvedValue(undefined),
};

const mockAuthService = {
  currentUser: vi.fn(() => ({ uid: 'u1', email: 'test@test.com' })),
  isLoggedIn: vi.fn(() => true),
  authReady: vi.fn(() => true),
};

describe('SyncService', () => {
  let service: SyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset online status
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    TestBed.configureTestingModule({
      providers: [
        SyncService,
        { provide: RefuelService, useValue: mockRefuelService },
        { provide: RepairService, useValue: mockRepairService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(SyncService);
  });

  describe('isOnline', () => {
    it('powinien odzwierciedlać navigator.onLine', () => {
      expect(service.isOnline()).toBe(true);
    });

    it('powinien reagować na zdarzenie offline', () => {
      window.dispatchEvent(new Event('offline'));
      expect(service.isOnline()).toBe(false);
    });

    it('powinien reagować na zdarzenie online', () => {
      window.dispatchEvent(new Event('offline'));
      expect(service.isOnline()).toBe(false);
      window.dispatchEvent(new Event('online'));
      expect(service.isOnline()).toBe(true);
    });
  });

  describe('processQueue()', () => {
    it('powinien nie robić nic gdy użytkownik nie jest zalogowany', async () => {
      mockAuthService.isLoggedIn.mockReturnValueOnce(false);

      await service.processQueue();

      expect(mockRefuelService.syncToFirestore).not.toHaveBeenCalled();
    });

    it('powinien zsynchronizować dane dla wskazanego auta', async () => {
      await service.forceSyncCar('car1');

      expect(mockRefuelService.syncToFirestore).toHaveBeenCalledWith('car1');
      expect(mockRepairService.syncToFirestore).toHaveBeenCalledWith('car1');
    });
  });
});