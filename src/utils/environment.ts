/**
 * Environment validation utilities.
 *
 * Checks for required tools (git, claude, wt.exe) and repo context.
 * Each function throws ClaunchError with a specific, user-friendly message
 * matching the PRD-specified error strings exactly.
 */

import { execSync } from 'node:child_process';
import { normalize, join } from 'node:path';
import { lstatSync } from 'node:fs';
import { homedir } from 'node:os';
import { ClaunchError } from '../types/index.js';

/**
 * Verify that Git is installed and accessible.
 * @throws ClaunchError with code GIT_NOT_FOUND
 */
export function checkGit(): void {
  try {
    execSync('git --version', { stdio: 'pipe' });
  } catch {
    throw new ClaunchError('Git is not installed.', 'GIT_NOT_FOUND');
  }
}

/**
 * Verify that Claude Code CLI is installed and accessible.
 * Uses `shell: true` to resolve `.cmd` / `.ps1` extensions on Windows.
 * @throws ClaunchError with code CLAUDE_NOT_FOUND
 */
export function checkClaude(): void {
  try {
    execSync('claude --version', { stdio: 'pipe', shell: true });
  } catch {
    throw new ClaunchError('Claude Code CLI not found.', 'CLAUDE_NOT_FOUND');
  }
}

/**
 * Resolves the path of Windows Terminal (wt.exe).
 * First checks system PATH (using `where wt`), then falls back to user local AppData Microsoft WindowsApps path.
 * @returns The resolved executable path (either 'wt' or absolute path).
 * @throws ClaunchError with code WT_NOT_FOUND if not found anywhere.
 */
export function getWindowsTerminalPath(): string {
  try {
    execSync('where wt', { stdio: 'pipe' });
    return 'wt';
  } catch {
    const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
    const fallbackPath = join(localAppData, 'Microsoft', 'WindowsApps', 'wt.exe');
    try {
      lstatSync(fallbackPath);
      return fallbackPath;
    } catch {
      // Do nothing, throw below
    }
    throw new ClaunchError('Windows Terminal is required.', 'WT_NOT_FOUND');
  }
}

/**
 * Verify that Windows Terminal (wt.exe) is installed and accessible.
 * @throws ClaunchError with code WT_NOT_FOUND
 */
export function checkWindowsTerminal(): void {
  getWindowsTerminalPath();
}

/**
 * Verify that the current directory is inside a Git repository.
 * @returns The normalized absolute path to the repository root.
 * @throws ClaunchError with code NOT_A_REPO
 */
export function checkGitRepo(): string {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();
    return normalize(root);
  } catch {
    throw new ClaunchError('No Git repository detected.', 'NOT_A_REPO');
  }
}

/**
 * Run all environment checks in sequence.
 * @returns The normalized absolute path to the repository root.
 * @throws ClaunchError for the first failing check.
 */
export function validateEnvironment(): string {
  checkGit();
  checkClaude();
  checkWindowsTerminal();
  return checkGitRepo();
}
