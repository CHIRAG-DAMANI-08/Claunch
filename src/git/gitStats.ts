import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export interface BranchInfo {
  name: string;
  head: string;
}

export interface WorktreeStats {
  parentBranch: string;
  insertions: number;
  deletions: number;
}

/**
 * Retrieves all local git branches and their head commits.
 */
export function getLocalBranches(cwd: string): BranchInfo[] {
  try {
    const output = execSync('git for-each-ref --format="%(refname:short) %(objectname)" refs/heads/', {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return output
      .split('\n')
      .map((line) => {
        const parts = line.trim().split(/\s+/);
        return { name: parts[0], head: parts[1] };
      })
      .filter((b): b is BranchInfo => !!b.name && !!b.head);
  } catch {
    return [];
  }
}

/**
 * Finds the parent branch by finding the local branch with the youngest merge base.
 */
export function findParentBranch(branch: string, allBranches: BranchInfo[], cwd: string): string {
  const headOfB = allBranches.find((b) => b.name === branch)?.head;
  if (!headOfB) return 'main';

  let bestParent = 'main';
  let maxTimestamp = 0;

  for (const O of allBranches) {
    if (O.name === branch) continue;
    try {
      const mergeBase = execSync(`git merge-base "${branch}" "${O.name}"`, {
        cwd,
        stdio: 'pipe',
        encoding: 'utf-8',
      }).trim();

      if (mergeBase === headOfB) {
        // O is a descendant of B, not parent
        continue;
      }

      const timestampStr = execSync(`git log -1 --format=%ct "${mergeBase}"`, {
        cwd,
        stdio: 'pipe',
        encoding: 'utf-8',
      }).trim();

      const timestamp = parseInt(timestampStr, 10);
      if (timestamp > maxTimestamp) {
        maxTimestamp = timestamp;
        bestParent = O.name;
      }
    } catch {
      // Ignore errors
    }
  }

  return bestParent;
}

/**
 * Gets insertions and deletions diff metrics compared to parent.
 */
export function getDiffStats(
  parent: string,
  branch: string,
  cwd: string,
): { insertions: number; deletions: number } | null {
  try {
    const output = execSync(`git diff --numstat "${parent}...${branch}"`, {
      cwd,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    let insertions = 0;
    let deletions = 0;
    const lines = output.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const ins = parseInt(parts[0], 10);
        const del = parseInt(parts[1], 10);
        if (!isNaN(ins)) insertions += ins;
        if (!isNaN(del)) deletions += del;
      }
    }
    return { insertions, deletions };
  } catch {
    return null;
  }
}

/**
 * Automatically scans the codebase directories to discover feature areas.
 */
export function discoverFeatures(repoRoot: string): string[] {
  const features: string[] = [];
  const searchDirs = ['src', 'packages', 'apps', 'components', 'pages', 'services'];

  for (const dir of searchDirs) {
    const fullPath = join(repoRoot, dir);
    try {
      if (statSync(fullPath).isDirectory()) {
        const subdirs = readdirSync(fullPath, { withFileTypes: true })
          .filter(
            (de) =>
              de.isDirectory() &&
              !de.name.startsWith('.') &&
              !de.name.startsWith('_') &&
              de.name !== 'node_modules',
          )
          .map((de) => de.name);

        for (const s of subdirs) {
          features.push(`${dir}/${s}`);
        }
      }
    } catch {
      // Path doesn't exist
    }
  }

  // Fallback to top-level folder names
  if (features.length === 0) {
    try {
      const rootDirs = readdirSync(repoRoot, { withFileTypes: true })
        .filter(
          (de) =>
            de.isDirectory() &&
            !de.name.startsWith('.') &&
            !de.name.startsWith('_') &&
            !['node_modules', 'dist', 'build', 'out', 'temp', 'tmp', '.planning', '.git'].includes(
              de.name,
            ),
        )
        .map((de) => de.name);
      features.push(...rootDirs);
    } catch {
      // Ignore
    }
  }

  return features.slice(0, 10);
}
