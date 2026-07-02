import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { type SessionData, ClaunchError } from '../types/index.js';

/**
 * Normalizes repository paths to ensure case-insensitive matching works correctly.
 */
function normalizeRepoPath(repoPath: string): string {
  return resolve(repoPath).replace(/\\/g, '/').toLowerCase();
}

/**
 * Manages persistence of Claude session-to-branch mappings.
 * Mappings are saved under ~/.claunch/sessions.json.
 */
export class SessionStore {
  private readonly storePath: string;
  private data: SessionData = {};

  constructor(storePath?: string) {
    this.storePath = storePath || join(homedir(), '.claunch', 'sessions.json');
    this.load();
  }

  /**
   * Retrieves mapped session ID (currently branch name) for a given worktree.
   */
  public getSession(repoPath: string, branch: string): string | null {
    const normRepo = normalizeRepoPath(repoPath);
    return this.data[normRepo]?.[branch] || null;
  }

  /**
   * Updates mapped session ID for a given worktree and persists immediately.
   */
  public setSession(repoPath: string, branch: string, sessionId: string): void {
    const normRepo = normalizeRepoPath(repoPath);
    if (!this.data[normRepo]) {
      this.data[normRepo] = {};
    }
    this.data[normRepo][branch] = sessionId;
    this.save();
  }

  /**
   * Loads session mapping data. Falls back to empty state on missing or corrupt files.
   */
  private load(): void {
    try {
      if (!existsSync(this.storePath)) {
        this.data = {};
        return;
      }
      const raw = readFileSync(this.storePath, 'utf-8');
      this.data = JSON.parse(raw);
    } catch {
      // Fallback on invalid JSON or read failure
      this.data = {};
    }
  }

  /**
   * Saves data atomically using write-to-temp-then-rename strategy.
   */
  private save(): void {
    try {
      const dir = join(this.storePath, '..');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const tempPath = `${this.storePath}.tmp`;
      const jsonContent = JSON.stringify(this.data, null, 2);
      
      writeFileSync(tempPath, jsonContent, 'utf-8');
      renameSync(tempPath, this.storePath);
    } catch (error) {
      throw new ClaunchError(
        `Failed to save session mappings: ${error instanceof Error ? error.message : String(error)}`,
        'SESSION_ERROR',
      );
    }
  }
}
