// spec: docs/specs/05-car-management.md
// bugfix: docs/bugs/10-native-keyboard-integration.md
import { Service, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Native keyboard integration for Capacitor builds.
 *
 * Ionic already reacts to `ionKeyboardDidShow` / `ionKeyboardDidHide` (its own
 * re-dispatch of the Capacitor events), but only natively: in a browser these
 * events are never fired, so every consumer must degrade gracefully.
 *
 * On iOS the plugin defaults are hostile to bottom sheets:
 * - the accessory bar (^ / v / Done) covers the last field of a short form,
 * - the WebView scrolls under the top toolbar instead of resizing.
 *
 * bugfix: docs/bugs/10-native-keyboard-integration.md
 */
@Service()
export class KeyboardService {
  /**
   * `true` while the native keyboard is on screen (always `false` on web).
   *
   * Public contract for any future consumer (sticky footers, scroll padding).
   * No component reads it today; it is the only signal a consumer needs to
   * react to the keyboard without duplicating the Capacitor listeners.
   */
  readonly isKeyboardVisible = signal(false);

  /** Height of the on-screen keyboard in CSS pixels (`0` when closed). */
  readonly keyboardHeight = signal(0);

  private initialized = false;

  /**
   * Wire the native listeners and apply the app's keyboard preferences.
   * Safe to call more than once and safe to call on web (no-op).
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (!Capacitor.isPluginAvailable('Keyboard')) return;

    // Each call is isolated: a listener that fails to register must not stop
    // the iOS preferences from being applied, and vice versa.
    try {
      await Keyboard.addListener('keyboardDidShow', (info) => {
        this.isKeyboardVisible.set(true);
        this.keyboardHeight.set(info.keyboardHeight);
      });
      await Keyboard.addListener('keyboardDidHide', () => {
        this.isKeyboardVisible.set(false);
        this.keyboardHeight.set(0);
      });
    } catch {
      // Some platforms ship a keyboard engine without the event API.
    }

    if (Capacitor.getPlatform() !== 'ios') return;

    // Short forms (car dialog, login) do not need the accessory bar.
    try {
      await Keyboard.setAccessoryBarVisible({ isVisible: false });
    } catch {
      // Not implemented on this iOS plugin version.
    }

    // Keeping WebView scrolling off keeps the header pinned while typing.
    try {
      await Keyboard.setScroll({ isDisabled: true });
    } catch {
      // Not implemented on this iOS plugin version.
    }
  }

  /** Dismiss the native keyboard (no-op on web). */
  async hide(): Promise<void> {
    if (!Capacitor.isPluginAvailable('Keyboard')) return;

    try {
      await Keyboard.hide();
    } catch {
      // Nothing to dismiss or unsupported — the browser blurs the field itself.
    }
  }
}
