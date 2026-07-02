import { execSync } from 'node:child_process';
import { normalize, resolve, basename } from 'node:path';
import { type Worktree, ClaunchError } from '../types/index.js';
import { checkGit, checkGitRepo } from '../utils/environment.js';

/**
 * Normalizes a path to ensure consistent casing, resolved absolute path, and forward slashes.
 */
function normalizePath(p: string): string {
  return resolve(p).replace(/\\/g, '/').toLowerCase();
}

/**
 * Discovers and parses all Git worktrees for the repository containing the current working directory.
 * Excludes bare worktrees.
 * 
 * @returns Array of Worktree objects, sorted with the current worktree first, then remaining alphabetically.
 * @throws ClaunchError if git is missing or not run inside a git repository.
 */
export function discoverWorktrees(cwd: string = process.cwd()): Worktree[] {
  // 1. Validate environment
  checkGit();
  checkGitRepo();

  try {
    // 2. Get the raw porcelain list of worktrees
    const rawOutput = execSync('git worktree list --porcelain', {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    const worktrees: Worktree[] = [];
    const normalizedCwd = normalizePath(cwd);

    // 3. Parse porcelain blocks
    // Porcelains are separated by double newlines or single newlines with blocks starting with 'worktree'
    const blocks = rawOutput.split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length === 0 || !lines[0]) continue;

      let path = '';
      let head = '';
      let branch = '';
      let isBare = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('worktree ')) {
          path = trimmed.substring(9).trim();
        } else if (trimmed.startsWith('HEAD ')) {
          head = trimmed.substring(5).trim();
        } else if (trimmed.startsWith('branch ')) {
          const ref = trimmed.substring(7).trim();
          if (ref.startsWith('refs/heads/')) {
            branch = ref.substring(11);
          } else {
            branch = ref;
          }
        } else if (trimmed === 'bare') {
          isBare = true;
        }
      }

      if (!path) continue;

      // Handle detached HEAD fallback
      if (!branch && !isBare) {
        branch = basename(path);
      }

      const normalizedPath = normalizePath(path);
      const isCurrent = normalizedCwd.startsWith(normalizedPath) || normalizedPath === normalizedCwd;

      worktrees.push({
        path: normalize(path),
        branch,
        head,
        isBare,
        isCurrent,
      });
    }

    // Filter out bare worktrees and sort (current first, then alphabetically by branch name)
    const activeWorktrees = worktrees.filter((wt) => !wt.isBare);
    
    activeWorktrees.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return a.branch.localeCompare(b.branch);
    });

    return activeWorktrees;
  } catch (error) {
    if (error instanceof ClaunchError) {
      throw error;
    }
    throw new ClaunchError(
      `Failed to list git worktrees: ${error instanceof Error ? error.message : String(error)}`,
      'WORKTREE_ERROR',
    );
  }
}
