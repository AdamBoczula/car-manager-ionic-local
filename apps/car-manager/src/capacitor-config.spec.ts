// covers: docs/bugs/11-broken-android-build.md
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface CapConfigOutput {
  app: {
    appId: string;
    webDir: string;
    webDirAbs: string;
    extConfigFilePath: string;
    extConfig: {
      plugins?: {
        Keyboard?: {
          resizeOnFullScreen?: boolean;
        };
      };
    };
  };
  android: {
    platformDirAbs: string;
  };
}

interface PackageJson {
  dependencies?: Record<string, string>;
}

interface ProjectJson {
  targets: {
    build: {
      options: {
        outputPath: string;
      };
    };
  };
}

describe('Capacitor root configuration', () => {
  const repoRoot = resolve(__dirname, '../../..');
  const rootConfigPath = resolve(repoRoot, 'capacitor.config.ts');
  const appConfigPath = resolve(repoRoot, 'apps/car-manager/capacitor.config.ts');

  it('keeps capacitor.config.ts as a single regular file at repo root', () => {
    expect(existsSync(rootConfigPath)).toBe(true);
    expect(lstatSync(rootConfigPath).isSymbolicLink()).toBe(false);
    expect(existsSync(appConfigPath)).toBe(false);
  });

  it('keeps android/gradlew executable on POSIX systems', () => {
    if (process.platform !== 'win32') {
      const mode = lstatSync(resolve(repoRoot, 'android/gradlew')).mode;
      expect(mode & 0o111).not.toBe(0);
    }
  });

  it('resolves webDir, android platform, and plugins from repo root via Capacitor CLI', () => {
    const projectJson = JSON.parse(
      readFileSync(resolve(repoRoot, 'apps/car-manager/project.json'), 'utf8'),
    ) as ProjectJson;
    const expectedWebDir = `${projectJson.targets.build.options.outputPath}/browser`;

    const capBin = resolve(repoRoot, 'node_modules/@capacitor/cli/bin/capacitor');
    const raw = execFileSync(process.execPath, [capBin, 'config', '--json'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const parsed = JSON.parse(raw) as CapConfigOutput;

    expect(parsed.app.extConfigFilePath).toBe(rootConfigPath);
    expect(parsed.app.appId).toBe('com.carmanager.app');
    expect(parsed.app.webDir).toBe(expectedWebDir);
    expect(parsed.app.webDirAbs).toBe(resolve(repoRoot, expectedWebDir));
    expect(parsed.android.platformDirAbs).toBe(resolve(repoRoot, 'android'));
    expect(existsSync(parsed.android.platformDirAbs)).toBe(true);
    expect(parsed.app.extConfig.plugins?.Keyboard?.resizeOnFullScreen).toBe(true);
  });

  it('wires every Capacitor Android plugin dependency into Gradle settings and build files', () => {
    const rootPkg = JSON.parse(
      readFileSync(resolve(repoRoot, 'package.json'), 'utf8'),
    ) as PackageJson;
    const settingsGradle = readFileSync(
      resolve(repoRoot, 'android/capacitor.settings.gradle'),
      'utf8',
    );
    const buildGradle = readFileSync(
      resolve(repoRoot, 'android/app/capacitor.build.gradle'),
      'utf8',
    );

    const androidPlugins = Object.keys(rootPkg.dependencies ?? {}).filter((dep) => {
      const manifestPath = resolve(repoRoot, 'node_modules', dep, 'package.json');
      if (!existsSync(manifestPath)) {
        return false;
      }
      const pkg = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        capacitor?: { android?: unknown };
      };
      return Boolean(pkg.capacitor?.android);
    });

    expect(androidPlugins.length).toBeGreaterThan(0);

    for (const dep of androidPlugins) {
      const gradleName = dep.replace('@', '').replace('/', '-');
      expect(settingsGradle).toContain(`include ':${gradleName}'`);
      expect(buildGradle).toContain(`implementation project(':${gradleName}')`);
    }
  });
});
