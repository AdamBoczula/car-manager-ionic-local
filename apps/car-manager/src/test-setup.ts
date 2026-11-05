import '@analogjs/vitest-angular/setup-zone';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
import '@testing-library/jest-dom/vitest';
import { addIcons } from 'ionicons';
import {
  add,
  addOutline,
  carSport,
  carSportOutline,
  checkmark,
  chevronDown,
  construct,
  constructOutline,
  copyOutline,
  create,
  logOut,
  logOutOutline,
  mic,
  micOutline,
  searchOutline,
  trash,
} from 'ionicons/icons';
import { vi } from 'vitest';

// Polyfills for Ionic components running under jsdom
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.scrollTo) {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    value: () => {},
    writable: true,
    configurable: true,
  });
}

// Register all icons used in templates so Ionicons does not attempt to fetch
// SVGs from an empty base URL under jsdom (which logs uncaught Invalid URL errors).
addIcons({
  add,
  'add-outline': addOutline,
  'car-sport': carSport,
  'car-sport-outline': carSportOutline,
  checkmark,
  'chevron-down': chevronDown,
  construct,
  'construct-outline': constructOutline,
  'copy-outline': copyOutline,
  create,
  'log-out': logOut,
  'log-out-outline': logOutOutline,
  mic,
  'mic-outline': micOutline,
  'search-outline': searchOutline,
  trash,
});

// Increase default test timeout for jsdom/Ionic component stabilization.
vi.setConfig({ testTimeout: 10000 });

setupTestBed({ zoneless: false });
