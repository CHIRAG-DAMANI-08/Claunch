/**
 * Main module exports for claunch.
 *
 * Re-exports public API for programmatic usage.
 */

export { validateEnvironment } from './utils/environment.js';
export type {
  Worktree,
  TabSpec,
  SessionData,
  ClaunchErrorCode,
} from './types/index.js';
export { ClaunchError } from './types/index.js';
