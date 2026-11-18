// spec: docs/specs/05-car-management.md
// bugfix: docs/bugs/10-native-keyboard-integration.md
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KeyboardService } from './keyboard.service';

type KeyboardServiceInstance = InstanceType<typeof KeyboardService>;

const addListener = vi.fn();
const hide = vi.fn();
const isPluginAvailable = vi.fn();
const getPlatform = vi.fn();
const setAccessoryBarVisible = vi.fn();
const setScroll = vi.fn();

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: (...args: unknown[]) => addListener(...args),
    hide: () => hide(),
    setAccessoryBarVisible: (options: unknown) => setAccessoryBarVisible(options),
    setScroll: (options: unknown) => setScroll(options),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isPluginAvailable: (name: string) => isPluginAvailable(name),
    getPlatform: () => getPlatform(),
  },
}));

describe('KeyboardService', () => {
  let service: KeyboardServiceInstance;
  let showCallback: ((info: { keyboardHeight: number }) => void) | undefined;
  let hideCallback: (() => void) | undefined;

  beforeEach(async () => {
    vi.resetModules();
    addListener.mockReset();
    hide.mockReset();
    isPluginAvailable.mockReset();
    getPlatform.mockReset();
    setAccessoryBarVisible.mockReset();
    setScroll.mockReset();

    showCallback = undefined;
    hideCallback = undefined;
    addListener.mockImplementation((event: string, cb: (...args: never[]) => void) => {
      if (event === 'keyboardDidShow') showCallback = cb as never;
      if (event === 'keyboardDidHide') hideCallback = cb as never;
      return Promise.resolve({ remove: vi.fn() });
    });
    hide.mockResolvedValue(undefined);
    setAccessoryBarVisible.mockResolvedValue(undefined);
    setScroll.mockResolvedValue(undefined);
    isPluginAvailable.mockReturnValue(true);
    getPlatform.mockReturnValue('android');

    // Fresh module instance per test so the singleton guard does not leak.
    const { KeyboardService: ServiceClass } = await import('./keyboard.service');
    service = TestBed.inject(ServiceClass);
  });

  // covers: docs/bugs/10-native-keyboard-integration.md#AC-1
  it('should report the keyboard as closed before any native event arrives', () => {
    expect(service.isKeyboardVisible()).toBe(false);
    expect(service.keyboardHeight()).toBe(0);
  });

  // covers: docs/bugs/10-native-keyboard-integration.md#AC-1
  it('should expose visibility and height from the native keyboard events', async () => {
    await service.init();

    showCallback?.({ keyboardHeight: 312 });
    expect(service.isKeyboardVisible()).toBe(true);
    expect(service.keyboardHeight()).toBe(312);

    hideCallback?.();
    expect(service.isKeyboardVisible()).toBe(false);
    expect(service.keyboardHeight()).toBe(0);
  });

  // covers: docs/bugs/10-native-keyboard-integration.md#AC-2
  it('should register the native listeners only once', async () => {
    await service.init();
    await service.init();

    expect(addListener).toHaveBeenCalledTimes(2);
    expect(addListener).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function));
    expect(addListener).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function));
  });

  // covers: docs/bugs/10-native-keyboard-integration.md#AC-3
  it('should hide the iOS accessory bar and disable WebView rubber-banding', async () => {
    getPlatform.mockReturnValue('ios');
    await service.init();

    expect(setAccessoryBarVisible).toHaveBeenCalledWith({ isVisible: false });
    expect(setScroll).toHaveBeenCalledWith({ isDisabled: true });
  });

  // covers: docs/bugs/10-native-keyboard-integration.md#AC-3
  it('should not call iOS-only APIs on Android', async () => {
    getPlatform.mockReturnValue('android');
    await service.init();

    expect(setAccessoryBarVisible).not.toHaveBeenCalled();
    expect(setScroll).not.toHaveBeenCalled();
  });

  // covers: docs/bugs/10-native-keyboard-integration.md#AC-4
  it('should degrade to a no-op when the platform has no keyboard plugin', async () => {
    isPluginAvailable.mockReturnValue(false);
    await service.init();

    expect(addListener).not.toHaveBeenCalled();
    expect(service.isKeyboardVisible()).toBe(false);

    await expect(service.hide()).resolves.toBeUndefined();
  });

  // covers: docs/bugs/10-native-keyboard-integration.md#AC-5
  it('should dismiss the native keyboard', async () => {
    await service.init();
    await service.hide();

    expect(hide).toHaveBeenCalledTimes(1);
  });

  // covers: docs/bugs/10-native-keyboard-integration.md#AC-4
  it('should swallow native errors so a missing implementation cannot break the UI', async () => {
    addListener.mockRejectedValue(new Error('not implemented'));
    hide.mockRejectedValue(new Error('not implemented'));

    await expect(service.init()).resolves.toBeUndefined();
    await expect(service.hide()).resolves.toBeUndefined();
    expect(service.isKeyboardVisible()).toBe(false);
  });
});
