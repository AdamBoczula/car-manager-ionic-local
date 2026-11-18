#!/usr/bin/env node
/**
 * Sets up USB port forwarding so the dev server is reachable from a phone
 * as http://localhost:4200, then starts `nx serve car-manager`.
 *
 * See docs/dev/port-forwarding-phone.md
 */
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Port the Angular dev server listens on (see apps/car-manager/project.json). */
const PORT = 4200;

/** How long to wait for a device before giving up, in milliseconds. */
const DEVICE_WAIT_MS = 60_000;

const DEVICE_POLL_MS = 2_000;

function log(message) {
  // console.warn is used deliberately: the lint config bans console.log,
  // and these are diagnostics for a CLI script, not app output.
  console.warn(`[dev:phone] ${message}`);
}

function fail(message, hint) {
  console.error(`\n[dev:phone] ERROR: ${message}`);
  if (hint) {
    console.error(`[dev:phone] ${hint}`);
  }
  console.error('[dev:phone] See docs/dev/port-forwarding-phone.md\n');
  process.exit(1);
}

/**
 * Runs `adb` with the given arguments and returns trimmed stdout.
 * Rejects if adb is missing from PATH.
 */
async function adb(...args) {
  const { stdout } = await execFileAsync('adb', args, { timeout: 30_000 });
  return stdout.trim();
}

/** Returns true when adb is installed and invocable. */
async function adbAvailable() {
  try {
    await adb('version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses `adb devices -l` output into device records.
 * Skips the daemon banner lines that adb prints on first start.
 */
function parseDevices(stdout) {
  const devices = [];
  for (const line of stdout.split(/\r?\n/)) {
    const match = /^(\S+)\s+(device|unauthorized|offline)\b/.exec(line.trim());
    if (!match) {
      continue;
    }
    const [, serial, state] = match;
    const model = /model:(\S+)/.exec(line)?.[1] ?? 'unknown';
    devices.push({ serial, state, model });
  }
  return devices;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits until exactly one device is in the `device` state.
 * Reports unauthorized/offline devices with actionable hints.
 */
async function waitForDevice() {
  const deadline = Date.now() + DEVICE_WAIT_MS;
  let warnedUnreachable = false;

  while (Date.now() < deadline) {
    const devices = parseDevices(await adb('devices', '-l'));
    const ready = devices.filter((device) => device.state === 'device');

    if (ready.length === 1) {
      const [device] = ready;
      log(`Device connected: ${device.model} (${device.serial})`);
      return device;
    }

    if (ready.length > 1) {
      fail(
        `Multiple devices are connected (${ready.map((d) => d.serial).join(', ')}).`,
        'Disconnect all but one device and try again.',
      );
    }

    const unauthorized = devices.filter((device) => device.state === 'unauthorized');
    if (unauthorized.length > 0) {
      fail(
        'Device is not authorized for USB debugging.',
        'Unlock the phone and accept the "Allow USB debugging?" prompt, then run this command again.',
      );
    }

    if (!warnedUnreachable) {
      warnedUnreachable = true;
      log('No device detected yet — connect the phone via USB and enable USB debugging.');
      log(
        'If it stays empty, the Windows driver may be broken: see the troubleshooting table in the docs.',
      );
    }

    await sleep(DEVICE_POLL_MS);
  }

  fail(
    `No authorized device found within ${DEVICE_WAIT_MS / 1000}s.`,
    'Check `adb devices` manually and review the troubleshooting section.',
  );
}

async function main() {
  if (!(await adbAvailable())) {
    fail(
      'adb was not found in PATH.',
      'Install it with: winget install --source winget --id Google.PlatformTools — then restart your terminal.',
    );
  }

  await waitForDevice();

  // reverse maps a phone port onto a host port over USB
  await adb('reverse', `tcp:${PORT}`, `tcp:${PORT}`);
  log(`Forwarding enabled: phone localhost:${PORT} -> PC 127.0.0.1:${PORT}`);

  const forwarded = await adb('reverse', '--list');
  log(`Active forwards:\n${forwarded}`);

  log('Starting the dev server. On the phone open http://localhost:' + PORT);
  log('On the PC open chrome://inspect/#devices to debug the phone tab.');

  const serve = spawn('npm', ['start'], {
    stdio: 'inherit',
    shell: true,
  });

  const shutdown = async () => {
    serve.kill();
    try {
      // remove the tunnel so a stale forward cannot linger after the server stops
      await adb('reverse', '--remove', `tcp:${PORT}`);
      log('Port forwarding removed.');
    } catch {
      // device may already be disconnected; nothing to clean up
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  serve.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

await main();
