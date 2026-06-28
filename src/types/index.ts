/**
 * Core type definitions for Claunch.
 *
 * These interfaces define the contracts between all modules:
 * - git/ uses Worktree
 * - claude/ uses SessionData
 * - terminal/ uses TabSpec
 * - cli.ts orchestrates all of them
 */

/** Represents a single Git worktree discovered via `git worktree list --porcelain`. */
export interface Worktree {
  /** Absolute filesystem path to the worktree directory. */
  path: string;
  /** Branch name (stripped of `refs/heads/` prefix). Falls back to path basename for detached HEAD. */
  branch: string;
  /** Commit SHA currently checked out. */
  head: string;
  /** Whether this is a bare worktree (should be excluded from tab launching). */
  isBare: boolean;
  /** Whether this worktree contains the current working directory. */
  isCurrent: boolean;
}

/** Specification for a single Windows Terminal tab to open. */
export interface TabSpec {
  /** Absolute filesystem path to set as the tab's working directory. */
  path: string;
  /** Branch name associated with this worktree. */
  branch: string;
  /** Full command string to execute in the tab (e.g., `claude --resume main`). */
  command: string;
  /** Tab title (typically the branch name). */
  title: string;
}

/**
 * Session mapping data structure.
 *
 * Keyed by normalized repo root path → branch name → session identifier.
 * Currently session identifiers are branch name strings.
 * Designed so values can be swapped to conversation IDs later
 * without changing the SessionStore interface.
 */
export type SessionData = Record<string, Record<string, string>>;

/** Error codes for specific failure conditions. */
export type ClaunchErrorCode =
  | 'GIT_NOT_FOUND'
  | 'NOT_A_REPO'
  | 'CLAUDE_NOT_FOUND'
  | 'WT_NOT_FOUND'
  | 'SESSION_ERROR'
  | 'WORKTREE_ERROR';

/** Custom error class with a machine-readable code for programmatic handling. */
export class ClaunchError extends Error {
  public readonly code: ClaunchErrorCode;

  constructor(message: string, code: ClaunchErrorCode) {
    super(message);
    this.name = 'ClaunchError';
    this.code = code;
  }
}
