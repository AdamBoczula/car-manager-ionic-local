// spec: docs/specs/02-login-screen.md
// covers: docs/specs/02-login-screen.md#AC-1
import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { Storage } from '@ionic/storage';

describe('StorageService', () => {
  let service: StorageService;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockSet: ReturnType<typeof vi.fn>;
  let mockRemove: ReturnType<typeof vi.fn>;
  let mockKeys: ReturnType<typeof vi.fn>;
  let mockClear: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockCreate = vi.fn().mockResolvedValue(undefined);
    mockGet = vi.fn().mockResolvedValue(null);
    mockSet = vi.fn().mockResolvedValue(undefined);
    mockRemove = vi.fn().mockResolvedValue(undefined);
    mockKeys = vi.fn().mockResolvedValue([]);
    mockClear = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        StorageService,
        {
          provide: Storage,
          useValue: {
            create: mockCreate,
            get: mockGet,
            set: mockSet,
            remove: mockRemove,
            keys: mockKeys,
            clear: mockClear,
          },
        },
      ],
    });

    service = TestBed.inject(StorageService);
  });

  describe('init()', () => {
    it('powinien wywołać storage.create() tylko raz', async () => {
      await service.init();
      expect(mockCreate).toHaveBeenCalledTimes(1);

      // Drugie wywołanie nie powinno ponownie create()
      await service.init();
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('get()', () => {
    it('powinien zwrócić wartość z Ionic Storage', async () => {
      mockGet.mockResolvedValue('test-value');
      const result = await service.get<string>('my-key');
      expect(result).toBe('test-value');
      expect(mockGet).toHaveBeenCalledWith('my-key');
    });

    it('powinien automatycznie wywołać init() przy pierwszym użyciu', async () => {
      mockGet.mockResolvedValue('auto-init');
      const result = await service.get<string>('key');
      expect(result).toBe('auto-init');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('set()', () => {
    it('powinien zapisać wartość do Ionic Storage', async () => {
      await service.set('key', { foo: 'bar' });
      expect(mockSet).toHaveBeenCalledWith('key', { foo: 'bar' });
    });
  });

  describe('remove()', () => {
    it('powinien usunąć klucz z Ionic Storage', async () => {
      await service.remove('key');
      expect(mockRemove).toHaveBeenCalledWith('key');
    });
  });

  describe('keys()', () => {
    it('powinien zwrócić wszystkie klucze', async () => {
      mockKeys.mockResolvedValue(['k1', 'k2']);
      const result = await service.keys();
      expect(result).toEqual(['k1', 'k2']);
    });
  });

  describe('clear()', () => {
    it('powinien wyczyścić storage', async () => {
      await service.clear();
      expect(mockClear).toHaveBeenCalled();
    });
  });
});