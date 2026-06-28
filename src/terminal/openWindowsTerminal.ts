import { spawn } from 'node:child_process';
import { TabSpec, ClaunchError } from '../types/index.js';
import { getWindowsTerminalPath } from '../utils/environment.js';

/**
 * Launches Windows Terminal (wt.exe) with multiple tabs.
 * Each tab runs in its own worktree directory and starts a Claude session.
 * Forces a new window and orders the current worktree first.
 *
 * @param specs Array of tab specifications.
 * @throws ClaunchError if Windows Terminal is not available or spawning fails.
 */
export function openWindowsTerminal(specs: TabSpec[]): void {
  if (specs.length === 0) {
    return;
  }

  // 1. Verify wt.exe is available and get path
  const wtPath = getWindowsTerminalPath();

  try {
    const args: string[] = ['-w', '-1'];

    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      if (i > 0) {
        args.push(';');
        args.push('new-tab');
      }

      args.push('-d', spec.path);
      args.push('--title', spec.title);

      // Launch PowerShell inside the tab, executing the command and staying open
      // We wrap the command to run powershell, set the location, run the command
      // (or let WT set starting directory -d and just run the shell with Command).
      // We use PowerShell Core (pwsh) or Windows PowerShell (powershell)
      args.push('powershell.exe', '-NoExit', '-Command', spec.command);
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
