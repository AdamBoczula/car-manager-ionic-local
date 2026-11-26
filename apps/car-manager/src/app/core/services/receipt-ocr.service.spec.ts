// spec: docs/specs/refuel/03-receipt-ocr.md
// covers: docs/specs/refuel/03-receipt-ocr.md#AC-4
// covers: docs/specs/refuel/03-receipt-ocr.md#AC-6
// covers: docs/specs/refuel/03-receipt-ocr.md#AC-7
// covers: docs/specs/refuel/03-receipt-ocr.md#AC-8
// covers: docs/bugs/12-receipt-ocr-android-uri-and-parser.md
import { TestBed } from '@angular/core/testing';
import { ActionSheetController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraErrorCode, MediaTypeSelection } from '@capacitor/camera';
import { Script, TextRecognition } from '@capacitor-mlkit/text-recognition';
import {
  normalizeNativeImagePath,
  ReceiptOcrService,
  type ReceiptImageSource,
} from './receipt-ocr.service';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
  },
}));

vi.mock('@capacitor/camera', () => ({
  Camera: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    takePhoto: vi.fn(),
    chooseFromGallery: vi.fn(),
  },
  MediaTypeSelection: {
    Photo: 0,
    Video: 1,
    All: 2,
  },
  CameraErrorCode: {
    CameraPermissionDenied: 'OS-PLUG-CAMR-0003',
    GalleryPermissionDenied: 'OS-PLUG-CAMR-0005',
    TakePhotoCancelled: 'OS-PLUG-CAMR-0006',
    NoCameraAvailable: 'OS-PLUG-CAMR-0007',
    EditPhotoCancelled: 'OS-PLUG-CAMR-0013',
    ChooseMediaCancelled: 'OS-PLUG-CAMR-0020',
  },
}));

vi.mock('@capacitor-mlkit/text-recognition', () => ({
  Script: { Latin: 'LATIN' },
  TextRecognition: {
    processImage: vi.fn(),
  },
}));

describe('ReceiptOcrService', () => {
  let service: ReceiptOcrService;
  let actionSheetMock: {
    present: ReturnType<typeof vi.fn>;
    onDidDismiss: ReturnType<typeof vi.fn>;
  };
  let actionSheetControllerMock: {
    create: ReturnType<typeof vi.fn>;
  };

  function setupActionSheetSelection(
    result: { data?: ReceiptImageSource; role?: string } = { data: 'camera' },
  ): void {
    actionSheetMock.onDidDismiss.mockResolvedValue(result);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Camera.checkPermissions).mockResolvedValue({
      camera: 'granted',
      photos: 'granted',
    });
    vi.mocked(Camera.requestPermissions).mockResolvedValue({
      camera: 'granted',
      photos: 'granted',
    });

    actionSheetMock = {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: 'camera' }),
    };
    actionSheetControllerMock = {
      create: vi.fn().mockResolvedValue(actionSheetMock),
    };

    TestBed.configureTestingModule({
      providers: [
        ReceiptOcrService,
        { provide: ActionSheetController, useValue: actionSheetControllerMock },
      ],
    });
    service = TestBed.inject(ReceiptOcrService);
  });

  // covers: docs/bugs/12-receipt-ocr-android-uri-and-parser.md
  it('normalizes raw Android file paths to file:// URIs and preserves existing schemes', () => {
    expect(
      normalizeNativeImagePath('/data/user/0/com.carmanager.app/cache/PIC_20261125_212321.jpg'),
    ).toBe('file:///data/user/0/com.carmanager.app/cache/PIC_20261125_212321.jpg');
    expect(normalizeNativeImagePath('file:///tmp/receipt.jpg')).toBe('file:///tmp/receipt.jpg');
    expect(normalizeNativeImagePath('content://media/external/images/media/42')).toBe(
      'content://media/external/images/media/42',
    );
    expect(normalizeNativeImagePath('   ')).toBe('');
  });

  it('returns error on non-native web platform without calling Camera or ActionSheet', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ReceiptOcrService,
        { provide: ActionSheetController, useValue: actionSheetControllerMock },
      ],
    });
    const webService = TestBed.inject(ReceiptOcrService);

    expect(webService.isSupported()).toBe(false);
    const outcome = await webService.scanReceipt();

    expect(outcome.status).toBe('error');
    expect(actionSheetControllerMock.create).not.toHaveBeenCalled();
    expect(Camera.takePhoto).not.toHaveBeenCalled();
  });

  it('prompts user to choose between camera and gallery and cancels cleanly on dismiss', async () => {
    setupActionSheetSelection({ role: 'cancel' });

    const outcome = await service.scanReceipt();

    expect(actionSheetControllerMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        header: 'Skanuj paragon',
        buttons: expect.arrayContaining([
          expect.objectContaining({ text: 'Zrób zdjęcie', data: 'camera' }),
          expect.objectContaining({ text: 'Wybierz z galerii', data: 'gallery' }),
        ]),
      }),
    );
    expect(outcome).toEqual({ status: 'cancelled' });
    expect(Camera.takePhoto).not.toHaveBeenCalled();
    expect(Camera.chooseFromGallery).not.toHaveBeenCalled();
  });

  // covers: docs/bugs/12-receipt-ocr-android-uri-and-parser.md
  it('requests camera permission when not yet granted and stops with error if denied', async () => {
    vi.mocked(Camera.checkPermissions).mockResolvedValue({
      camera: 'prompt',
      photos: 'granted',
    });
    vi.mocked(Camera.requestPermissions).mockResolvedValue({
      camera: 'denied',
      photos: 'granted',
    });

    const outcome = await service.scanReceipt('camera');

    expect(Camera.requestPermissions).toHaveBeenCalledWith({ permissions: ['camera'] });
    expect(Camera.takePhoto).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      status: 'error',
      message: 'Brak uprawnień do aparatu. Włącz dostęp w ustawieniach telefonu.',
    });
  });

  // covers: docs/bugs/12-receipt-ocr-android-uri-and-parser.md
  it('captures photo via camera, normalizes raw Android path, runs ML Kit OCR and returns success', async () => {
    vi.mocked(Camera.checkPermissions).mockResolvedValue({
      camera: 'prompt',
      photos: 'granted',
    });
    vi.mocked(Camera.requestPermissions).mockResolvedValue({
      camera: 'granted',
      photos: 'granted',
    });
    vi.mocked(Camera.takePhoto).mockResolvedValue({
      type: 'photo' as never,
      uri: '/data/user/0/com.carmanager.app/cache/PIC_20261125_212321.jpg',
      saved: false,
      format: 'jpeg',
    });
    vi.mocked(TextRecognition.processImage).mockResolvedValue({
      text: '2026-11-24\nVERVA ON 40,00 x 6,50 260,00A\nSUMA PLN 260,00',
      blocks: [],
    });

    const outcome = await service.scanReceipt();

    expect(Camera.requestPermissions).toHaveBeenCalledWith({ permissions: ['camera'] });
    expect(Camera.takePhoto).toHaveBeenCalledWith({
      quality: 90,
      correctOrientation: true,
      editable: 'no',
      saveToGallery: false,
    });
    expect(TextRecognition.processImage).toHaveBeenCalledWith({
      path: 'file:///data/user/0/com.carmanager.app/cache/PIC_20261125_212321.jpg',
      script: Script.Latin,
    });
    expect(outcome).toEqual({
      status: 'success',
      message: 'Odczytano paragon. Sprawdź dane i wpisz przebieg.',
      result: expect.objectContaining({
        draft: {
          date: '2026-11-24',
          amount: 260,
          liters: 40,
          isPremium: true,
        },
      }),
    });
    expect(service.isScanning()).toBe(false);
  });

  // covers: docs/bugs/12-receipt-ocr-android-uri-and-parser.md
  it('picks photo from gallery via ActionSheet, normalizes path and parses ML Kit blocks', async () => {
    setupActionSheetSelection({ data: 'gallery' });
    vi.mocked(Camera.chooseFromGallery).mockResolvedValue({
      results: [
        {
          type: 'photo' as never,
          uri: '/data/user/0/com.carmanager.app/cache/GALLERY_1.jpg',
          saved: false,
          format: 'jpeg',
        },
      ],
    });
    vi.mocked(TextRecognition.processImage).mockResolvedValue({
      text: 'fallback',
      blocks: [
        {
          text: 'EFECTA DIESEL 60.68*6.99\nOBNIŻKA',
          lines: [
            {
              text: 'EFECTA DIESEL 60.68*6.99',
              boundingBox: { left: 10, top: 100, right: 200, bottom: 120 },
              elements: [],
            },
            {
              text: 'OBNIŻKA',
              boundingBox: { left: 10, top: 130, right: 90, bottom: 150 },
              elements: [],
            },
          ],
          elements: [],
        } as never,
        {
          text: '-6.06A',
          lines: [
            {
              text: '-6.06A',
              boundingBox: { left: 220, top: 131, right: 290, bottom: 149 },
              elements: [],
            },
          ],
          elements: [],
        } as never,
      ],
    });

    const outcome = await service.scanReceipt();

    expect(Camera.chooseFromGallery).toHaveBeenCalledWith({
      mediaType: MediaTypeSelection.Photo,
      allowMultipleSelection: false,
      correctOrientation: true,
      editable: 'no',
      quality: 90,
    });
    expect(TextRecognition.processImage).toHaveBeenCalledWith({
      path: 'file:///data/user/0/com.carmanager.app/cache/GALLERY_1.jpg',
      script: Script.Latin,
    });
    expect(outcome).toEqual({
      status: 'success',
      message: 'Odczytano paragon. Sprawdź dane i wpisz przebieg.',
      result: expect.objectContaining({
        draft: {
          amount: 418.09,
          liters: 60.68,
          isPremium: false,
        },
      }),
    });
  });

  it('returns partial outcome when only some fields are extracted', async () => {
    vi.mocked(Camera.takePhoto).mockResolvedValue({
      type: 'photo' as never,
      uri: 'file:///tmp/receipt.jpg',
      saved: false,
      format: 'jpeg',
    });
    vi.mocked(TextRecognition.processImage).mockResolvedValue({
      text: '24.11.2026\nSUMA PLN 150,00',
      blocks: [],
    });

    const outcome = await service.scanReceipt('camera');
    expect(outcome.status).toBe('partial');
  });

  it('returns empty outcome when receipt text yields no refuel fields', async () => {
    vi.mocked(Camera.takePhoto).mockResolvedValue({
      type: 'photo' as never,
      uri: 'file:///tmp/receipt.jpg',
      saved: false,
      format: 'jpeg',
    });
    vi.mocked(TextRecognition.processImage).mockResolvedValue({
      text: '??? blurry image ???',
      blocks: [],
    });

    const outcome = await service.scanReceipt('camera');
    expect(outcome.status).toBe('empty');
  });

  it('returns cancelled outcome for Capacitor Camera v8 cancellation error codes and messages', async () => {
    vi.mocked(Camera.takePhoto).mockRejectedValueOnce({
      code: CameraErrorCode.TakePhotoCancelled,
      message: 'No picture was taken.',
    });
    expect(await service.scanReceipt('camera')).toEqual({ status: 'cancelled' });

    vi.mocked(Camera.chooseFromGallery).mockRejectedValueOnce({
      code: CameraErrorCode.ChooseMediaCancelled,
      message: 'User did not select any media.',
    });
    expect(await service.scanReceipt('gallery')).toEqual({ status: 'cancelled' });

    vi.mocked(Camera.takePhoto).mockRejectedValueOnce(new Error('User cancelled photos app'));
    expect(await service.scanReceipt('camera')).toEqual({ status: 'cancelled' });
    expect(service.isScanning()).toBe(false);
  });

  it('returns permission error messages for camera and gallery CameraErrorCode rejections', async () => {
    vi.mocked(Camera.takePhoto).mockRejectedValueOnce({
      code: CameraErrorCode.CameraPermissionDenied,
      message: 'Camera permission denied',
    });

    expect(await service.scanReceipt('camera')).toEqual({
      status: 'error',
      message: 'Brak uprawnień do aparatu. Włącz dostęp w ustawieniach telefonu.',
    });

    vi.mocked(Camera.chooseFromGallery).mockRejectedValueOnce({
      code: CameraErrorCode.GalleryPermissionDenied,
      message: 'Gallery permission denied',
    });

    expect(await service.scanReceipt('gallery')).toEqual({
      status: 'error',
      message: 'Brak uprawnień do galerii zdjęć. Włącz dostęp w ustawieniach telefonu.',
    });
  });

  it('returns generic error message when ML Kit fails unexpectedly', async () => {
    vi.mocked(Camera.takePhoto).mockResolvedValue({
      type: 'photo' as never,
      uri: 'file:///tmp/receipt.jpg',
      saved: false,
      format: 'jpeg',
    });
    vi.mocked(TextRecognition.processImage).mockRejectedValue(new Error('ML Kit internal error'));

    const outcome = await service.scanReceipt('camera');
    expect(outcome).toEqual({
      status: 'error',
      message: 'Nie udało się zeskanować paragonu. Wpisz dane ręcznie.',
    });
  });
});
