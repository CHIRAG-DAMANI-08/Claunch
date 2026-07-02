import { spawn } from 'node:child_process';
import { type TabSpec, ClaunchError } from '../types/index.js';
import { getWindowsTerminalPath } from '../utils/environment.js';

/**
 * Launches Windows Terminal (wt.exe) with multiple tabs.
 * Each tab runs in its own worktree directory and starts a Claude session.
 *
 * @param specs Array of tab specifications.
 * @param options Launch configurations (newWindow, focusMenu).
 * @throws ClaunchError if Windows Terminal is not available or spawning fails.
 */
export function openWindowsTerminal(
  specs: TabSpec[],
  options: { newWindow?: boolean; focusMenu?: boolean } = {},
): void {
  if (specs.length === 0) {
    return;
  }

  // 1. Verify wt.exe is available and get path
  const wtPath = getWindowsTerminalPath();

  try {
    const args: string[] = [];
    
    if (options.newWindow !== false) {
      args.push('-w', '-1');
    } else {
      args.push('-w', '0', 'new-tab');
    }

    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      if (i > 0) {
        args.push(';');
        args.push('new-tab');
      }

      args.push('-d', spec.path);
      args.push('--title', spec.title);
      args.push('powershell.exe', '-NoExit', '-Command', spec.command);
    }

    if (options.focusMenu) {
      args.push(';');
      args.push('focus-tab', '-t', '0');
    }

    // Spawn wt.exe detached so the parent process can exit cleanly
    const process = spawn(wtPath, args, {
      detached: true,
      stdio: 'ignore',
      shell: true, // Necessary on Windows for PATH resolution of wt
    });

    process.unref();
  } catch (error) {
    throw new ClaunchError(
      `Failed to launch Windows Terminal: ${error instanceof Error ? error.message : String(error)}`,
      'WT_NOT_FOUND',
    );
  }
}
