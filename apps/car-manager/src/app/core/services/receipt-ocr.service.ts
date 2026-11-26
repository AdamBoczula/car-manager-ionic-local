// spec: docs/specs/refuel/03-receipt-ocr.md
// bugfix: docs/bugs/12-receipt-ocr-android-uri-and-parser.md
import { Injectable, inject, signal } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraErrorCode, MediaTypeSelection } from '@capacitor/camera';
import { Script, TextRecognition } from '@capacitor-mlkit/text-recognition';
import { addIcons } from 'ionicons';
import { camera, images } from 'ionicons/icons';
import type { ReceiptScanResult } from '../models/refuel.model';
import { buildReceiptTextFromOcr, parsePolishFuelReceipt } from '../utils/receipt-parser.util';

export type ReceiptImageSource = 'camera' | 'gallery';

export type ReceiptScanOutcome =
  | { status: 'success'; result: ReceiptScanResult; message: string }
  | { status: 'partial'; result: ReceiptScanResult; message: string }
  | { status: 'empty'; message: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

const CAMERA_PERMISSION_ERROR = 'Brak uprawnień do aparatu. Włącz dostęp w ustawieniach telefonu.';
const GALLERY_PERMISSION_ERROR =
  'Brak uprawnień do galerii zdjęć. Włącz dostęp w ustawieniach telefonu.';

const CANCELLED_ERROR_CODES = new Set<string>([
  CameraErrorCode.TakePhotoCancelled,
  CameraErrorCode.EditPhotoCancelled,
  CameraErrorCode.ChooseMediaCancelled,
]);

/**
 * Ensure native file paths returned by Capacitor Camera on Android (`/data/user/0/...`)
 * have a `file://` scheme so ML Kit `InputImage.fromFilePath` can open them via `Uri.parse`.
 */
export function normalizeNativeImagePath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) {
    return `file://${encodeURI(trimmed)}`;
  }
  return trimmed;
}

/**
 * Coordinates native camera/gallery capture and on-device ML Kit text recognition
 * to extract Polish fuel receipt fields into a RefuelDraft.
 */
@Injectable({ providedIn: 'root' })
export class ReceiptOcrService {
  readonly isSupported = signal<boolean>(Capacitor.isNativePlatform());
  readonly isScanning = signal<boolean>(false);

  private readonly actionSheetController = inject(ActionSheetController);

  constructor() {
    addIcons({ camera, images });
  }

  /** Capture or pick a receipt photo and extract refuel fields via ML Kit OCR. */
  async scanReceipt(source?: ReceiptImageSource): Promise<ReceiptScanOutcome> {
    if (!this.isSupported()) {
      return {
        status: 'error',
        message: 'Skanowanie paragonów jest dostępne tylko w aplikacji mobilnej.',
      };
    }

    const selectedSource = source ?? (await this.promptImageSource());
    if (selectedSource === null) {
      return { status: 'cancelled' };
    }

    this.isScanning.set(true);
    try {
      const acquired = await this.acquireReceiptImage(selectedSource);
      if (acquired.outcome) {
        return acquired.outcome;
      }

      const imagePath = acquired.path ? normalizeNativeImagePath(acquired.path) : '';
      if (!imagePath) {
        return {
          status: 'error',
          message: 'Nie udało się odczytać zdjęcia paragonu. Wpisz dane ręcznie.',
        };
      }

      const ocrResult = await TextRecognition.processImage({
        path: imagePath,
        script: Script.Latin,
      });

      const structuredText = buildReceiptTextFromOcr(ocrResult.text, ocrResult.blocks);
      const parsed = parsePolishFuelReceipt(structuredText);

      if (parsed.matchedFields.length === 0) {
        return {
          status: 'empty',
          message: 'Nie udało się odczytać danych z paragonu. Wpisz je ręcznie.',
        };
      }

      if (parsed.draft.amount != null && parsed.draft.liters != null) {
        return {
          status: 'success',
          result: parsed,
          message: 'Odczytano paragon. Sprawdź dane i wpisz przebieg.',
        };
      }

      return {
        status: 'partial',
        result: parsed,
        message: 'Odczytano część danych z paragonu. Uzupełnij brakujące pola.',
      };
    } catch (err) {
      return this.mapErrorOutcome(err, selectedSource);
    } finally {
      this.isScanning.set(false);
    }
  }

  private async promptImageSource(): Promise<ReceiptImageSource | null> {
    const sheet = await this.actionSheetController.create({
      header: 'Skanuj paragon',
      buttons: [
        {
          text: 'Zrób zdjęcie',
          icon: 'camera',
          data: 'camera' as ReceiptImageSource,
        },
        {
          text: 'Wybierz z galerii',
          icon: 'images',
          data: 'gallery' as ReceiptImageSource,
        },
        {
          text: 'Anuluj',
          role: 'cancel',
        },
      ],
    });

    await sheet.present();
    const { data, role } = await sheet.onDidDismiss<ReceiptImageSource>();
    if (role === 'cancel' || role === 'backdrop' || !data) {
      return null;
    }
    return data;
  }

  private async acquireReceiptImage(
    source: ReceiptImageSource,
  ): Promise<{ path?: string; outcome?: ReceiptScanOutcome }> {
    if (source === 'camera') {
      const currentPerm = await Camera.checkPermissions();
      if (currentPerm.camera !== 'granted') {
        const requestedPerm = await Camera.requestPermissions({ permissions: ['camera'] });
        if (requestedPerm.camera !== 'granted') {
          return {
            outcome: {
              status: 'error',
              message: CAMERA_PERMISSION_ERROR,
            },
          };
        }
      }

      const photo = await Camera.takePhoto({
        quality: 90,
        correctOrientation: true,
        editable: 'no',
        saveToGallery: false,
      });
      return { path: photo.uri ?? photo.webPath };
    }

    const gallery = await Camera.chooseFromGallery({
      mediaType: MediaTypeSelection.Photo,
      allowMultipleSelection: false,
      correctOrientation: true,
      editable: 'no',
      quality: 90,
    });

    if (gallery.results.length === 0) {
      return { outcome: { status: 'cancelled' } };
    }

    const first = gallery.results[0];
    return { path: first.uri ?? first.webPath };
  }

  private mapErrorOutcome(err: unknown, source: ReceiptImageSource): ReceiptScanOutcome {
    const code = this.extractErrorCode(err);
    const rawMsg = err instanceof Error ? err.message : String(err);
    const normalized = rawMsg.toLowerCase();

    if ((code && CANCELLED_ERROR_CODES.has(code)) || normalized.includes('cancel')) {
      return { status: 'cancelled' };
    }

    if (code === CameraErrorCode.GalleryPermissionDenied) {
      return { status: 'error', message: GALLERY_PERMISSION_ERROR };
    }

    if (
      code === CameraErrorCode.CameraPermissionDenied ||
      normalized.includes('permission') ||
      normalized.includes('denied')
    ) {
      return {
        status: 'error',
        message: source === 'gallery' ? GALLERY_PERMISSION_ERROR : CAMERA_PERMISSION_ERROR,
      };
    }

    if (code === CameraErrorCode.NoCameraAvailable) {
      return {
        status: 'error',
        message: 'Brak dostępnego aparatu na urządzeniu. Możesz wybrać zdjęcie z galerii.',
      };
    }

    console.error('Receipt OCR failed:', err);
    return {
      status: 'error',
      message: 'Nie udało się zeskanować paragonu. Wpisz dane ręcznie.',
    };
  }

  private extractErrorCode(err: unknown): string | undefined {
    if (err !== null && typeof err === 'object' && 'code' in err && typeof err.code === 'string') {
      return err.code;
    }
    return undefined;
  }
}
