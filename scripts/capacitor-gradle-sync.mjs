/**
 * Works around Capacitor CLI 8 not resolving `capacitor.config.ts` from the Nx
 * app folder (it silently falls back to the default `www` webDir). Must be run
 * with the Nx app folder as cwd, e.g.:
 *
 *   cd apps/car-manager && node ../../scripts/capacitor-gradle-sync.mjs
 *
 * Only the generated Gradle wiring is refreshed (`capacitor.settings.gradle`,
 * `app/capacitor.build.gradle`). Copying web assets is left to `cap copy`.
 */
import { loadConfig } from '@capacitor/cli/dist/config.js';
import { getPlugins } from '@capacitor/cli/dist/plugin.js';
import { getAndroidPlugins } from '@capacitor/cli/dist/android/common.js';
import { installGradlePlugins } from '@capacitor/cli/dist/android/update.js';

const PluginTypeCore = 0;

const config = await loadConfig();
const allPlugins = await getPlugins(config, 'android');
const capacitorPlugins = (await getAndroidPlugins(allPlugins)).filter(
  (plugin) => plugin.android.type === PluginTypeCore,
);

await installGradlePlugins(config, capacitorPlugins, []);
console.log(
  `android gradle wiring updated: ${capacitorPlugins.map((plugin) => plugin.id).join(', ')}`,
);
