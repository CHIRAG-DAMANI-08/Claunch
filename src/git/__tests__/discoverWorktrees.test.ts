import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import { ClaunchError } from '../../types/index.js';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

vi.mock('../../utils/environment.js', () => ({
  checkGit: vi.fn(),
  checkGitRepo: vi.fn().mockReturnValue('C:/Users/test/Projects/myrepo'),
}));

import { discoverWorktrees } from '../discoverWorktrees.js';

const mockedExecSync = vi.mocked(execSync);

describe('discoverWorktrees', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Stub execSync to mock git checks.
    mockedExecSync.mockImplementation((cmd) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('git --version')) {
        return 'git version 2.45.0';
      }
      if (cmdStr.includes('git rev-parse --show-toplevel')) {
        return 'C:/Users/test/Projects/myrepo';
      }
      return '';
    });
  });

  it('correctly parses a normal list of worktrees', () => {
    const rawOutput = `worktree C:/Users/test/Projects/myrepo
HEAD 5b58a152df6e594d21e86095ec45037d05779c4e
branch refs/heads/main

worktree C:/Users/test/Projects/myrepo/feat-dash
HEAD a270e594d21e86095ec45037d05779c4e5b58a15
branch refs/heads/feat/dashboard
`;
    mockedExecSync.mockImplementation((cmd) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('git worktree list --porcelain')) {
        return rawOutput;
      }
      if (cmdStr.includes('git rev-parse --show-toplevel')) {
        return 'C:/Users/test/Projects/myrepo';
      }
      return '';
    });

    const results = discoverWorktrees('C:/Users/test/Projects/myrepo');
    expect(results).toHaveLength(2);
    expect(results[0].branch).toBe('main');
    expect(results[0].isCurrent).toBe(true);
    expect(results[1].branch).toBe('feat/dashboard');
    expect(results[1].isCurrent).toBe(false);
  });

  it('excludes bare repositories', () => {
    const rawOutput = `worktree C:/Users/test/Projects/myrepo.git
bare

worktree C:/Users/test/Projects/myrepo
HEAD 5b58a152df6e594d21e86095ec45037d05779c4e
branch refs/heads/main
`;
    mockedExecSync.mockImplementation((cmd) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('git worktree list --porcelain')) {
        return rawOutput;
      }
      if (cmdStr.includes('git rev-parse --show-toplevel')) {
        return 'C:/Users/test/Projects/myrepo';
      }
      return '';
    });

    const results = discoverWorktrees('C:/Users/test/Projects/myrepo');
    expect(results).toHaveLength(1);
    expect(results[0].branch).toBe('main');
    expect(results[0].isBare).toBe(false);
  });

  it('handles detached HEAD by using the directory name', () => {
    const rawOutput = `worktree C:/Users/test/Projects/myrepo/detached-tree
HEAD 1234567890abcdef1234567890abcdef12345678
`;
    mockedExecSync.mockImplementation((cmd) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('git worktree list --porcelain')) {
        return rawOutput;
      }
      if (cmdStr.includes('git rev-parse --show-toplevel')) {
        return 'C:/Users/test/Projects/myrepo/detached-tree';
      }
      return '';
    });

    const results = discoverWorktrees('C:/Users/test/Projects/myrepo/detached-tree');
    expect(results).toHaveLength(1);
    expect(results[0].branch).toBe('detached-tree');
    expect(results[0].isCurrent).toBe(true);
  });

  it('handles spaces in worktree paths', () => {
    const rawOutput = `worktree C:/Users/test/Projects with spaces/myrepo
HEAD 5b58a152df6e594d21e86095ec45037d05779c4e
branch refs/heads/main
`;
    mockedExecSync.mockImplementation((cmd) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('git worktree list --porcelain')) {
        return rawOutput;
      }
      if (cmdStr.includes('git rev-parse --show-toplevel')) {
        return 'C:/Users/test/Projects/with spaces/myrepo';
      }
      return '';
    });

    const results = discoverWorktrees('C:/Users/test/Projects with spaces/myrepo');
    expect(results).toHaveLength(1);
    expect(results[0].branch).toBe('main');
    expect(results[0].path).toContain('Projects with spaces');
  });

  it('sorts the current worktree first, then remaining alphabetically', () => {
    const rawOutput = `worktree C:/Users/test/Projects/myrepo/feat-settings
HEAD 1111111111111111111111111111111111111111
branch refs/heads/feat/settings

worktree C:/Users/test/Projects/myrepo/feat-dashboard
HEAD 2222222222222222222222222222222222222222
branch refs/heads/feat/dashboard

worktree C:/Users/test/Projects/myrepo/main
HEAD 3333333333333333333333333333333333333333
branch refs/heads/main
`;
    mockedExecSync.mockImplementation((cmd) => {
      const cmdStr = cmd.toString();
      if (cmdStr.includes('git worktree list --porcelain')) {
        return rawOutput;
      }
      if (cmdStr.includes('git rev-parse --show-toplevel')) {
        return 'C:/Users/test/Projects/myrepo/feat-dashboard';
      }
      return '';
    });

    const results = discoverWorktrees('C:/Users/test/Projects/myrepo/feat-dashboard');
    expect(results).toHaveLength(3);
    // current first
    expect(results[0].branch).toBe('feat/dashboard');
    expect(results[0].isCurrent).toBe(true);
    // alphabetically remaining
    expect(results[1].branch).toBe('feat/settings');
    expect(results[2].branch).toBe('main');
  });
});
