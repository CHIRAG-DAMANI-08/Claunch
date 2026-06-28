import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Compares two semantic version strings.
 * Returns true if the latest version is greater than the current version.
 */
function isNewerVersion(current: string, latest: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [cMaj, cMin, cPat] = parse(current);
  const [lMaj, lMin, lPat] = parse(latest);

  if (lMaj > cMaj) {
    return true;
  }
  if (lMaj === cMaj && lMin > cMin) {
    return true;
  }
  if (lMaj === cMaj && lMin === cMin && lPat > cPat) {
    return true;
  }
  return false;
}

/**
 * Asynchronously checks the npm registry for updates of `claude-claunch`.
 * Prints a warning if a newer version is available.
 */
export async function checkForUpdates(): Promise<void> {
  try {
    const currentPath = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentPath);
    
    // package.json is at '../../package.json' relative to this file
    const packageJsonPath = join(currentDir, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = pkg.version;

    // Enforce an 800ms abort timeout for the HTTP fetch call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);

    const res = await fetch('https://registry.npmjs.org/claude-claunch/latest', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return;
    }

    const data = (await res.json()) as { version?: string };
    const latestVersion = data.version;

    if (latestVersion && isNewerVersion(currentVersion, latestVersion)) {
      console.warn(
        `\n\x1b[33m⚠️  Update Available! Local: v${currentVersion} | Latest: v${latestVersion}\x1b[0m\n` +
        `\x1b[36m👉 Run "npm install -g claude-claunch" to upgrade.\x1b[0m\n`,
      );
    }
  } catch {
    // Silently ignore errors (e.g. offline status) to avoid interrupting user workflow
  }
}
