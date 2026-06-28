import { describe, it, expect, vi } from 'vitest';
import { ClaunchError } from '../../types/index.js';

// We need to mock child_process before importing the module
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execSync: vi.fn(actual.execSync),
  };
});

import { execSync } from 'node:child_process';
import {
  checkGit,
  checkClaude,
  checkWindowsTerminal,
  checkGitRepo,
} from '../environment.js';

const mockedExecSync = vi.mocked(execSync);

describe('environment validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkGit', () => {
    it('succeeds when git is available', () => {
      mockedExecSync.mockReturnValueOnce(Buffer.from('git version 2.45.0'));
      expect(() => checkGit()).not.toThrow();
    });

    it('throws with exact PRD message when git is missing', () => {
      mockedExecSync.mockImplementationOnce(() => {
        throw new Error('not found');
      });
      expect(() => checkGit()).toThrow(
        new ClaunchError('Git is not installed.', 'GIT_NOT_FOUND'),
      );
    });
  });

  describe('checkClaude', () => {
    it('succeeds when claude is available', () => {
      mockedExecSync.mockReturnValueOnce(Buffer.from('claude v1.0.0'));
      expect(() => checkClaude()).not.toThrow();
    });

    it('throws with exact PRD message when claude is missing', () => {
      mockedExecSync.mockImplementationOnce(() => {
        throw new Error('not found');
      });
      expect(() => checkClaude()).toThrow(
        new ClaunchError('Claude Code CLI not found.', 'CLAUDE_NOT_FOUND'),
      );
    });
  });

  describe('checkWindowsTerminal', () => {
    it('succeeds when wt is available', () => {
      mockedExecSync.mockReturnValueOnce(
        Buffer.from('C:\\Program Files\\wt.exe'),
      );
      expect(() => checkWindowsTerminal()).not.toThrow();
    });

    it('throws with exact PRD message when wt is missing', () => {
      mockedExecSync.mockImplementationOnce(() => {
        throw new Error('not found');
      });
      expect(() => checkWindowsTerminal()).toThrow(
        new ClaunchError('Windows Terminal is required.', 'WT_NOT_FOUND'),
      );
    });
  });

  describe('checkGitRepo', () => {
    it('returns normalized repo root when inside a repo', () => {
      mockedExecSync.mockReturnValueOnce('C:/Users/test/Projects/myrepo\n');
      const root = checkGitRepo();
      expect(root).toContain('myrepo');
    });

    it('throws with exact PRD message when not in a repo', () => {
      mockedExecSync.mockImplementationOnce(() => {
        throw new Error('not a git repo');
      });
      expect(() => checkGitRepo()).toThrow(
        new ClaunchError('No Git repository detected.', 'NOT_A_REPO'),
      );
    });
  });

  describe('error codes', () => {
    it('ClaunchError has correct code property', () => {
      const error = new ClaunchError('test', 'GIT_NOT_FOUND');
      expect(error.code).toBe('GIT_NOT_FOUND');
      expect(error.name).toBe('ClaunchError');
      expect(error.message).toBe('test');
    });
  });
});
