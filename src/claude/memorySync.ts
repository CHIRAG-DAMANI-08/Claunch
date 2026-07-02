import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { cleanPathToProjectName } from './sessionLog.js';
import type { Worktree } from '../types/index.js';

function normalizePath(p: string): string {
  return resolve(p).replace(/\\/g, '/').toLowerCase();
}

/**
 * Automatically synchronizes the Claude project memory folder across all active worktrees.
 * Links each worktree project's `memory` directory to the main project's `memory` directory
 * using NTFS directory junctions, ensuring a single shared MEMORY.md file in real-time.
 */
export function syncMemoryJunctions(repoRoot: string, worktrees: Worktree[]): void {
  const projectsDir = join(homedir(), '.claude', 'projects');
  
  const mainWorktree = worktrees.find((w) => normalizePath(w.path) === normalizePath(repoRoot));
  if (!mainWorktree) {
    return;
  }

  const mainProjectDir = join(projectsDir, cleanPathToProjectName(mainWorktree.path));
  const mainMemoryDir = join(mainProjectDir, 'memory');

  // Ensure the main project directory and its memory folder exist
  try {
    lstatSync(mainProjectDir);
  } catch {
    try {
      mkdirSync(mainProjectDir, { recursive: true });
    } catch {
      return;
    }
  }

  try {
    lstatSync(mainMemoryDir);
  } catch {
    try {
      mkdirSync(mainMemoryDir, { recursive: true });
    } catch {
      return;
    }
  }

  // Synchronize other worktrees
  for (const wt of worktrees) {
    if (normalizePath(wt.path) === normalizePath(repoRoot)) {
      continue;
    }

    const wtProjectDir = join(projectsDir, cleanPathToProjectName(wt.path));
    const wtMemoryDir = join(wtProjectDir, 'memory');

    // Ensure worktree project directory exists
    try {
      lstatSync(wtProjectDir);
    } catch {
      try {
        mkdirSync(wtProjectDir, { recursive: true });
      } catch {
        continue;
      }
    }

    let exists = false;
    let isLink = false;
    try {
      const stat = lstatSync(wtMemoryDir);
      exists = true;
      isLink = stat.isSymbolicLink();
    } catch {
      // Doesn't exist
    }

    if (isLink) {
      continue;
    }

    if (exists) {
      // Migrate files before removing the normal directory
      try {
        const files = readdirSync(wtMemoryDir);
        for (const file of files) {
          const srcFile = join(wtMemoryDir, file);
          const destFile = join(mainMemoryDir, file);
          
          let shouldCopy = true;
          try {
            const destStat = lstatSync(destFile);
            const srcStat = lstatSync(srcFile);
            if (destStat.mtimeMs >= srcStat.mtimeMs) {
              shouldCopy = false;
            }
          } catch {
            // Dest doesn't exist
          }

          if (shouldCopy) {
            const data = readFileSync(srcFile);
            writeFileSync(destFile, data);
          }
        }
        
        // Remove the old normal folder
        rmSync(wtMemoryDir, { recursive: true, force: true });
      } catch {
        // Prevent creating junction if folder deletion or migration fails
        continue;
      }
    }

    // Create directory junction
    try {
      symlinkSync(mainMemoryDir, wtMemoryDir, 'junction');
    } catch {
      // Ignore junction creation failure (e.g. if permissions deny it)
    }
  }
}
